// VAPI Webhook - Production-Ready with Enterprise-Grade Security & CRM Integration
// Version 3.0.0 - Complete integration with security and CRM features

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { 
  getCorsHeaders, 
  isOriginAllowed, 
  validateContentType,
  sanitizeHeaders,
  getRateLimitConfig
} from "../_shared/cors.ts";

// ============================================================================
// ENVIRONMENT CONFIGURATION with Validation
// ============================================================================

interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  vapiWebhookSecret: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFrom: string;
  environment: string;
}

function getEnvironmentConfig(): EnvironmentConfig {
  const config = {
    supabaseUrl: Deno.env.get('SUPABASE_URL')!,
    supabaseServiceKey: Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    vapiWebhookSecret: Deno.env.get('VAPI_WEBHOOK_SECRET')!,
    twilioAccountSid: Deno.env.get('TWILIO_ACCOUNT_SID') || '',
    twilioAuthToken: Deno.env.get('TWILIO_AUTH_TOKEN') || '',
    twilioFrom: Deno.env.get('TWILIO_FROM') || Deno.env.get('TWILIO_PHONE_NUMBER') || '',
    environment: Deno.env.get('ENVIRONMENT') || 'development'
  };

  // Validate required environment variables
  const required = ['supabaseUrl', 'supabaseServiceKey', 'vapiWebhookSecret'];
  const missing = required.filter(key => !config[key as keyof EnvironmentConfig]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('Environment configuration loaded:', {
    environment: config.environment,
    hasSupabaseUrl: !!config.supabaseUrl,
    hasServiceKey: !!config.supabaseServiceKey,
    hasWebhookSecret: !!config.vapiWebhookSecret,
    hasTwilioConfig: !!(config.twilioAccountSid && config.twilioAuthToken && config.twilioFrom)
  });

  return config;
}

// Initialize configuration
const ENV = getEnvironmentConfig();

// Initialize Supabase client with error handling
const supabase = createClient(ENV.supabaseUrl, ENV.supabaseServiceKey);

// Rate limiting storage (in-memory)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface VAPIWebhookPayload {
  type: string;
  timestamp: string;
  call?: {
    id: string;
    assistantId: string;
    phoneNumber?: string;
    customerId?: string;
    status?: string;
    startedAt?: string;
    endedAt?: string;
    duration?: number;
    analysis?: any;
  };
  message?: {
    role: string;
    message: string;
    timestamp: string;
  };
  toolCalls?: Array<{
    toolCallId: string;
    function: {
      name: string;
      arguments: any;
    };
  }>;
  transcript?: {
    role: string;
    transcript: string;
    timestamp: string;
    confidence?: number;
  };
}

interface ClassifyPriorityResult {
  priority: string;
  reason: string;
  sla_seconds: number;
  escalation?: {
    required: boolean;
    to: string[];
    reason: string;
  };
  businessHours: boolean;
}

interface ValidateServiceRequestResult {
  accepted: boolean;
  reason: string;
  message: string;
  restrictions?: string[];
}

interface CalculateQuoteResult {
  min: number;
  max: number;
  currency: string;
  message: string;
  factors: {
    basePrice: number;
    complexity: number;
    urgency: number;
    location: number;
  };
  estimatedDuration: {
    min: number;
    max: number;
    unit: 'hours' | 'days';
  };
}

interface EvaluateSchedulingResult {
  window: string;
  canSchedule: boolean;
  message: string;
  earliestDate: string;
  requirements: string[];
}

interface SendSMSAlertResult {
  sent: boolean;
  error?: string;
  priority: string;
  messagesSent?: number;
  details?: any[];
}

// ============================================================================
// SECURITY FUNCTIONS
// ============================================================================

// Enhanced security: Rate limiting
function checkRateLimit(ip: string): boolean {
  const config = getRateLimitConfig();
  const now = Date.now();
  const key = `rate_limit_${ip}`;
  
  const existing = rateLimitStore.get(key);
  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return true;
  }
  
  if (existing.count >= config.maxRequests) {
    return false;
  }
  
  existing.count++;
  return true;
}

// Enhanced security: HMAC signature verification
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!secret || !signature) {
    console.warn('Missing webhook secret or signature');
    return false;
  }
  
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(payload);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    
    const sigBuf = await crypto.subtle.sign('HMAC', key, payloadData);
    const hex = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const expected = signature.replace(/^(sha256=|hmac-sha256=)/, '').toLowerCase();
    
    if (hex.length !== expected.length) {
      console.warn('Signature length mismatch');
      return false;
    }
    
    // Timing-safe comparison
    let diff = 0;
    for (let i = 0; i < hex.length; i++) {
      diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    
    const isValid = diff === 0;
    if (!isValid) {
      console.warn('Invalid webhook signature');
    }
    
    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Security logging function
async function logSecurityEvent(eventType: string, details: any, ip?: string) {
  try {
    await supabase.from('security_events').insert({
      event_type: eventType,
      details,
      ip_address: ip,
      timestamp: new Date().toISOString(),
      environment: ENV.environment
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// ============================================================================
// BUSINESS LOGIC FUNCTIONS
// ============================================================================

// Priority classification with comprehensive business rules
function classifyPriority(description: string, value?: number): ClassifyPriorityResult {
  const d = (description || '').toLowerCase();
  
  // P1: Emergency situations requiring immediate response
  const emergencyKeywords = ['inondation', 'refoulement', 'urgence', 'débordement', 'eau dans le sous-sol', 'emergency'];
  if (emergencyKeywords.some(keyword => d.includes(keyword))) {
    return {
      priority: 'P1',
      reason: 'urgence_immediate',
      sla_seconds: 0,
      escalation: {
        required: true,
        to: ['manager', 'emergency_team'],
        reason: 'Emergency situation detected'
      },
      businessHours: false
    };
  }
  
  // P2: Municipal contracts (priority customers)
  const municipalKeywords = ['municipalit', 'ville de', 'municipal', 'city of'];
  if (municipalKeywords.some(keyword => d.includes(keyword))) {
    return {
      priority: 'P2',
      reason: 'municipal',
      sla_seconds: 120,
      businessHours: true
    };
  }
  
  // P3: High value services or premium customers
  const highValueKeywords = ['gainage', 'relining', 'drain français'];
  const isHighValue = highValueKeywords.some(keyword => d.includes(keyword));
  const hasHighValue = typeof value === 'number' && value >= 3000;
  
  if (isHighValue || hasHighValue) {
    return {
      priority: 'P3',
      reason: 'high_value',
      sla_seconds: 3600,
      businessHours: true
    };
  }
  
  // P4: Standard service requests
  return {
    priority: 'P4',
    reason: 'standard',
    sla_seconds: 1800,
    businessHours: true
  };
}

// Enhanced service request validation
async function validateServiceRequest(args: { service: string }): Promise<ValidateServiceRequestResult> {
  const service = (args.service || '').toLowerCase();
  
  // Services we refuse
  const refusedServices = ['fosse', 'piscine', 'goutti', 'puisard', 'septic', 'pool'];
  const hasRefusedService = refusedServices.some(refused => service.includes(refused));
  
  if (hasRefusedService) {
    console.log('Service request refused:', {
      service: args.service,
      reason: 'service_not_offered'
    });
    
    return {
      accepted: false,
      reason: 'service_not_offered',
      message: "Désolé, ce service n'est pas dans notre offre. Nous nous spécialisons dans les drains et égouts résidentiels et commerciaux.",
      restrictions: refusedServices
    };
  }
  
  // Services requiring special assessment
  const assessmentRequired = ['gainage', 'relining', 'drain français complet'];
  const requiresAssessment = assessmentRequired.some(special => service.includes(special));
  
  console.log('Service request accepted:', {
    service: args.service,
    requiresAssessment
  });
  
  return {
    accepted: true,
    reason: 'service_available',
    message: requiresAssessment 
      ? "Parfait! Ce service nécessite une évaluation sur place. Nous pouvons planifier une inspection."
      : "Parfait! On peut certainement vous aider avec ça."
  };
}

// Enhanced quote calculation with market factors
async function calculateQuote(args: { serviceType: string; description?: string; estimatedValue?: number }): Promise<CalculateQuoteResult> {
  const servicePricing = {
    debouchage_camera: { min: 350, max: 650, unit: 'per_service' },
    racines_alesage: { min: 450, max: 750, unit: 'per_service' },
    gainage_installation: { min: 3900, max: 8000, unit: 'per_foot' },
    drain_francais: { min: 500, max: 800, unit: 'per_foot' },
    inspection: { min: 200, max: 300, unit: 'per_service' }
  } as const;
  
  const serviceType = args.serviceType as keyof typeof servicePricing;
  const pricing = servicePricing[serviceType] || servicePricing.debouchage_camera;
  
  // Factor in complexity based on description
  const description = (args.description || '').toLowerCase();
  let complexityMultiplier = 1.0;
  
  if (description.includes('urgence') || description.includes('emergency')) {
    complexityMultiplier = 1.3; // 30% surcharge for emergency
  } else if (description.includes('difficile') || description.includes('complex')) {
    complexityMultiplier = 1.2; // 20% surcharge for complexity
  }
  
  const adjustedMin = Math.round(pricing.min * complexityMultiplier);
  const adjustedMax = Math.round(pricing.max * complexityMultiplier);
  
  console.log('Quote calculated:', {
    serviceType: args.serviceType,
    originalRange: `${pricing.min}-${pricing.max}`,
    adjustedRange: `${adjustedMin}-${adjustedMax}`,
    complexityMultiplier
  });
  
  return {
    min: adjustedMin,
    max: adjustedMax,
    currency: 'CAD',
    message: `Le prix varie entre ${adjustedMin}$ et ${adjustedMax}$ plus taxes. ${
      complexityMultiplier > 1 ? 'Prix ajusté selon la complexité du service.' : ''
    }`,
    factors: {
      basePrice: pricing.min,
      complexity: complexityMultiplier,
      urgency: description.includes('urgence') ? 1.3 : 1.0,
      location: 1.0 // Could be enhanced with postal code analysis
    },
    estimatedDuration: getEstimatedDuration(serviceType)
  };
}

function getEstimatedDuration(serviceType: string): { min: number; max: number; unit: 'hours' | 'days' } {
  const durations = {
    debouchage_camera: { min: 2, max: 4, unit: 'hours' as const },
    racines_alesage: { min: 3, max: 6, unit: 'hours' as const },
    gainage_installation: { min: 1, max: 3, unit: 'days' as const },
    drain_francais: { min: 2, max: 5, unit: 'days' as const },
    inspection: { min: 1, max: 2, unit: 'hours' as const }
  };
  
  return durations[serviceType as keyof typeof durations] || durations.debouchage_camera;
}

// Enhanced scheduling evaluation
async function evaluateScheduling(args: { serviceType: string; priority?: string; urgency?: string }): Promise<EvaluateSchedulingResult> {
  const schedulingWindows = {
    drain_francais: '1 à 3 semaines',
    inspection: '1 à 2 semaines',
    gainage: '2 à 4 semaines',
    gainage_installation: '2 à 4 semaines',
    debouchage_camera: '3 à 5 jours ouvrables',
    racines_alesage: '3 à 5 jours ouvrables',
    default: '3 à 5 jours ouvrables'
  };
  
  const serviceType = args.serviceType as keyof typeof schedulingWindows;
  const window = schedulingWindows[serviceType] || schedulingWindows.default;
  
  // Adjust for priority
  let adjustedWindow = window;
  let message = `Nous pouvons planifier dans ${window}.`;
  
  if (args.priority === 'P1' || args.urgency === 'critical') {
    adjustedWindow = 'Même journée ou 24h';
    message = 'Urgence détectée. Nous pouvons intervenir aujourd\'hui même ou demain matin.';
  } else if (args.priority === 'P2') {
    adjustedWindow = '1 à 2 jours ouvrables';
    message = 'Client municipal - priorité élevée. Intervention dans 1 à 2 jours ouvrables.';
  }
  
  console.log('Scheduling evaluated:', {
    serviceType: args.serviceType,
    priority: args.priority,
    urgency: args.urgency,
    window: adjustedWindow
  });
  
  return {
    window: adjustedWindow,
    canSchedule: true,
    message,
    earliestDate: calculateEarliestDate(args.priority),
    requirements: getServiceRequirements(serviceType)
  };
}

function calculateEarliestDate(priority?: string): string {
  const now = new Date();
  let daysToAdd = 3; // Default
  
  if (priority === 'P1') daysToAdd = 0;
  else if (priority === 'P2') daysToAdd = 1;
  else if (priority === 'P3') daysToAdd = 2;
  
  const earliestDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return earliestDate.toISOString().split('T')[0];
}

function getServiceRequirements(serviceType: string): string[] {
  const requirements = {
    drain_francais: ['Accès au périmètre de la propriété', 'Localisation des services publics'],
    gainage: ['Inspection vidéo préalable', 'Accès aux regards d\'accès'],
    gainage_installation: ['Inspection vidéo préalable', 'Accès aux regards d\'accès'],
    inspection: ['Accès aux regards d\'accès'],
    default: ['Accès à la propriété']
  };
  
  return requirements[serviceType as keyof typeof requirements] || requirements.default;
}

// Enhanced SMS alert system with CRM integration
async function sendSMSAlert(args: { message: string; phoneNumbers: string[]; priority: string; isInternal?: boolean }): Promise<SendSMSAlertResult> {
  if (!ENV.twilioAccountSid || !ENV.twilioAuthToken || !ENV.twilioFrom) {
    console.error('SMS alert attempted without Twilio configuration');
    return {
      sent: false,
      error: 'twilio_not_configured',
      priority: args.priority
    };
  }
  
  // Validate input parameters
  if (args.phoneNumbers.length > 10) {
    console.warn('SMS alert with excessive recipients:', args.phoneNumbers.length);
    return {
      sent: false,
      error: 'too_many_recipients',
      priority: args.priority
    };
  }
  
  const results = [];
  const authHeader = `Basic ${btoa(`${ENV.twilioAccountSid}:${ENV.twilioAuthToken}`)}`;
  
  for (const phoneNumber of args.phoneNumbers) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${ENV.twilioAccountSid}/Messages.json`;
      
      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: ENV.twilioFrom,
          Body: args.message
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('SMS sent successfully:', {
          to: phoneNumber,
          sid: result.sid,
          priority: args.priority,
          isInternal: args.isInternal
        });
        
        // Log to database
        await supabase.from('sms_logs').insert({
          phone_number: phoneNumber,
          message: args.message,
          priority: args.priority,
          is_internal: args.isInternal || false,
          status: 'sent',
          twilio_sid: result.sid,
          sent_at: new Date().toISOString()
        });
        
        results.push({ phoneNumber, status: 'sent', sid: result.sid });
      } else {
        console.error('SMS send failed:', { to: phoneNumber, error: result });
        results.push({ phoneNumber, status: 'failed', error: result.message });
      }
    } catch (error) {
      console.error('SMS send error:', { to: phoneNumber, error });
      results.push({ phoneNumber, status: 'error', error: error.message });
    }
  }
  
  const sentCount = results.filter(r => r.status === 'sent').length;
  
  return {
    sent: sentCount > 0,
    priority: args.priority,
    messagesSent: sentCount,
    details: results
  };
}

// CRM integration functions
async function createOrUpdateClient(callData: any) {
  const phoneNumber = callData.phoneNumber || callData.customer?.phoneNumber;
  
  if (!phoneNumber) {
    console.warn('No phone number available for client creation');
    return null;
  }
  
  try {
    // Check if client exists
    const { data: existingClient, error: searchError } = await supabase
      .from('clients')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();
    
    if (existingClient) {
      // Update existing client
      const { data, error } = await supabase
        .from('clients')
        .update({
          last_contact: new Date().toISOString(),
          call_count: (existingClient.call_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClient.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating client:', error);
        return null;
      }
      
      return data;
    } else {
      // Create new client
      const { data, error } = await supabase
        .from('clients')
        .insert({
          phone_number: phoneNumber,
          first_name: callData.customer?.firstName || '',
          last_name: callData.customer?.lastName || '',
          email: callData.customer?.email || '',
          address: callData.customer?.address || '',
          city: callData.customer?.city || '',
          postal_code: callData.customer?.postalCode || '',
          source: 'vapi_call',
          status: 'lead',
          call_count: 1,
          created_at: new Date().toISOString(),
          last_contact: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating client:', error);
        return null;
      }
      
      console.log('New client created:', data);
      return data;
    }
  } catch (error) {
    console.error('Error in createOrUpdateClient:', error);
    return null;
  }
}

// Internal team notification system
async function notifyInternalTeam(message: string, priority: string, callDetails: any) {
  const internalNumbers = [
    '+15149991234', // Team lead
    '+15149995678', // Operations manager
    '+15149990000'  // Emergency coordinator
  ];
  
  // Filter based on priority
  let recipients = internalNumbers;
  if (priority === 'P1') {
    recipients = internalNumbers; // All team members for emergencies
  } else if (priority === 'P2') {
    recipients = internalNumbers.slice(0, 2); // Team lead and ops manager
  } else {
    recipients = [internalNumbers[0]]; // Team lead only
  }
  
  const internalMessage = `[${priority}] ${message}\n` +
    `Client: ${callDetails.phoneNumber || 'Unknown'}\n` +
    `Time: ${new Date().toLocaleString('fr-CA')}`;
  
  return await sendSMSAlert({
    message: internalMessage,
    phoneNumbers: recipients,
    priority,
    isInternal: true
  });
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

async function handleCallStarted(payload: VAPIWebhookPayload) {
  console.log('Call started:', payload.call?.id);
  
  // Create or update client in CRM
  const client = await createOrUpdateClient(payload.call);
  
  // Log call start
  await supabase.from('vapi_calls').insert({
    call_id: payload.call?.id,
    assistant_id: payload.call?.assistantId,
    phone_number: payload.call?.phoneNumber,
    client_id: client?.id,
    status: 'started',
    started_at: payload.call?.startedAt || new Date().toISOString(),
    created_at: new Date().toISOString()
  });
  
  return { success: true, message: 'Call started logged' };
}

async function handleCallEnded(payload: VAPIWebhookPayload) {
  console.log('Call ended:', payload.call?.id);
  
  // Update call record
  await supabase
    .from('vapi_calls')
    .update({
      status: 'ended',
      ended_at: payload.call?.endedAt || new Date().toISOString(),
      duration: payload.call?.duration,
      analysis: payload.call?.analysis || {}
    })
    .eq('call_id', payload.call?.id);
  
  // Analyze call for follow-up
  if (payload.call?.analysis) {
    const priority = classifyPriority(
      payload.call.analysis.summary || '',
      payload.call.analysis.estimatedValue
    );
    
    // Notify internal team for high priority calls
    if (priority.priority === 'P1' || priority.priority === 'P2') {
      await notifyInternalTeam(
        `Call ended - ${payload.call.analysis.summary || 'No summary'}`,
        priority.priority,
        payload.call
      );
    }
  }
  
  return { success: true, message: 'Call ended logged' };
}

async function handleToolCalls(payload: VAPIWebhookPayload) {
  const results = [];
  
  for (const toolCall of payload.toolCalls || []) {
    const { toolCallId, function: func } = toolCall;
    
    try {
      let result: any;
      
      switch (func.name) {
        case 'validateServiceRequest':
          result = await validateServiceRequest(func.arguments);
          break;
        case 'calculateQuote':
          result = await calculateQuote(func.arguments);
          break;
        case 'evaluateScheduling':
          result = await evaluateScheduling(func.arguments);
          break;
        case 'classifyPriority':
          result = classifyPriority(func.arguments.description, func.arguments.value);
          break;
        case 'sendSMSAlert':
          result = await sendSMSAlert(func.arguments);
          break;
        default:
          result = { error: `Unknown function: ${func.name}` };
      }
      
      // Log tool call
      await supabase.from('tool_calls').insert({
        call_id: payload.call?.id,
        tool_call_id: toolCallId,
        function_name: func.name,
        arguments: func.arguments,
        result,
        created_at: new Date().toISOString()
      });
      
      results.push({
        toolCallId,
        result
      });
    } catch (error) {
      console.error(`Error executing ${func.name}:`, error);
      results.push({
        toolCallId,
        result: { error: error.message }
      });
    }
  }
  
  return results;
}

async function handleTranscript(payload: VAPIWebhookPayload) {
  if (!payload.transcript || !payload.call?.id) {
    return { success: false, error: 'Missing transcript or call ID' };
  }
  
  // Store transcript
  await supabase.from('call_transcripts').insert({
    call_id: payload.call.id,
    role: payload.transcript.role,
    transcript: payload.transcript.transcript,
    confidence: payload.transcript.confidence,
    timestamp: payload.transcript.timestamp
  });
  
  return { success: true };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req.headers.get('origin') || '')
    });
  }
  
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      await logSecurityEvent('rate_limit_exceeded', { ip }, ip);
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { 
          status: 429, 
          headers: { 
            ...getCorsHeaders(req.headers.get('origin') || ''),
            'Content-Type': 'application/json' 
          }
        }
      );
    }
    
    // Verify signature for all environments
    const signature = req.headers.get('x-vapi-signature') || 
                     req.headers.get('x-hub-signature-256') || 
                     req.headers.get('x-webhook-signature') || '';
    
    const rawBody = await req.text();
    
    if (ENV.vapiWebhookSecret) {
      const isValid = await verifySignature(rawBody, signature, ENV.vapiWebhookSecret);
      if (!isValid) {
        await logSecurityEvent('invalid_signature', { ip, signature }, ip);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { 
            status: 401, 
            headers: { 
              ...getCorsHeaders(req.headers.get('origin') || ''),
              'Content-Type': 'application/json' 
            }
          }
        );
      }
    }
    
    // Parse and validate payload
    const payload: VAPIWebhookPayload = JSON.parse(rawBody);
    
    console.log('Webhook received:', {
      type: payload.type,
      callId: payload.call?.id,
      timestamp: payload.timestamp
    });
    
    // Route to appropriate handler
    let response: any = { success: true };
    
    switch (payload.type) {
      case 'call-started':
        response = await handleCallStarted(payload);
        break;
      case 'call-ended':
        response = await handleCallEnded(payload);
        break;
      case 'tool-calls':
        response = await handleToolCalls(payload);
        break;
      case 'transcript':
        response = await handleTranscript(payload);
        break;
      case 'health-check':
        response = { status: 'healthy', timestamp: new Date().toISOString() };
        break;
      default:
        console.warn('Unknown webhook type:', payload.type);
        response = { success: true, message: `Unhandled type: ${payload.type}` };
    }
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { 
          ...getCorsHeaders(req.headers.get('origin') || ''),
          'Content-Type': 'application/json' 
        }
      }
    );
    
  } catch (error) {
    console.error('Webhook error:', error);
    await logSecurityEvent('webhook_error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: ENV.environment === 'development' ? error.message : undefined
      }),
      { 
        status: 500,
        headers: { 
          ...getCorsHeaders(req.headers.get('origin') || ''),
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});