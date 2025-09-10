// VAPI Webhook - Production-Ready with Enterprise-Grade Security & CRM Integration
// Version 3.0.0 - Complete integration with security and CRM features

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { 
  getCorsHeaders, 
  isOriginAllowed
} from "../_shared/cors.ts";
import { withWebhookSecurity } from "../_shared/middleware/webhook-security.ts";
import { withPersistentRateLimit } from "../_shared/middleware/rate-limit-persistent.ts";
import { CallService } from "../_shared/services/call-service.ts";
import { SMSService } from "../_shared/services/sms-service.ts";
import type { WebhookPayload } from "../_shared/validation/vapi-schemas.ts";

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
const callService = new CallService(supabase as any);
const smsService = (ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioFrom)
  ? new SMSService({ accountSid: ENV.twilioAccountSid, authToken: ENV.twilioAuthToken, fromNumber: ENV.twilioFrom })
  : null;

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

// In-memory rate limiting removed in favor of persistent PG limiter

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

// Enhanced SMS alert system with CRM integration (sms_messages)
async function sendSMSAlert(args: { message: string; phoneNumbers: string[]; priority: string; isInternal?: boolean }): Promise<SendSMSAlertResult> {
  if (!smsService) {
    console.error('SMS alert attempted without Twilio configuration');
    return { sent: false, error: 'twilio_not_configured', priority: args.priority };
  }
  if (!args.phoneNumbers || args.phoneNumbers.length === 0) {
    return { sent: false, error: 'no_recipients', priority: args.priority };
  }

  const res = await smsService.sendSMSAlert({ to: args.phoneNumbers, message: args.message, priority: args.priority });

  for (const to of args.phoneNumbers) {
    try {
      await supabase.from('sms_messages').insert({
        call_id: undefined,
        to_number: to,
        from_number: ENV.twilioFrom,
        message: args.message,
        sms_type: args.isInternal ? 'alert_internal' : 'notification',
        priority: args.priority,
        status: res.sent ? 'sent' : 'failed',
        twilio_sid: res.sids?.[0] || null,
        sent_at: new Date().toISOString()
      });
    } catch (_) {
      // Non-blocking persistence error
    }
  }

  return { sent: res.sent, priority: args.priority, messagesSent: res.sids.length, details: res.errors };
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
  let recipients: string[] = [];
  try {
    const raw = Deno.env.get('SLA_CONTACTS_JSON') || '';
    if (raw) {
      const map = JSON.parse(raw);
      recipients = Array.isArray(map?.[priority]) ? map[priority] : [];
    }
  } catch (_) { /* ignore */ }
  if (recipients.length === 0) {
    const fallback = Deno.env.get('TWILIO_ALERT_FALLBACK_TO');
    if (fallback) recipients = [fallback];
  }

  const internalMessage = `[${priority}] ${message}\n` +
    `Client: ${callDetails?.phoneNumber ? callDetails.phoneNumber.replace(/.(?=.{3})/g, '*') : 'Unknown'}\n` +
    `Time: ${new Date().toLocaleString('fr-CA')}`;

  return await sendSMSAlert({ message: internalMessage, phoneNumbers: recipients, priority, isInternal: true });
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

async function handleCallStarted(payload: VAPIWebhookPayload) {
  console.log('Call started:', payload.call?.id);
  
  // Create or update client in CRM
  const client = await createOrUpdateClient(payload.call);
  
  await callService.upsertCall({
    id: payload.call!.id,
    assistantId: payload.call!.assistantId,
    phoneNumber: payload.call?.phoneNumber,
    customerId: client?.id,
    status: 'active',
    startedAt: payload.call?.startedAt || new Date().toISOString()
  });
  
  return { success: true, message: 'Call started logged' };
}

async function handleCallEnded(payload: VAPIWebhookPayload) {
  console.log('Call ended:', payload.call?.id);
  
  await callService.processCallEnd({
    callId: payload.call!.id,
    analysis: payload.call?.analysis
  });
  
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
      const t0 = performance.now();
      
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
          result = classifyPriority(func.arguments.description, func.arguments.estimatedValue ?? func.arguments.value);
          break;
        case 'sendSMSAlert':
          result = await sendSMSAlert(func.arguments);
          break;
        default:
          result = { error: `Unknown function: ${func.name}` };
      }
      
      const durationMs = Math.round(performance.now() - t0);
      await supabase.from('tool_calls').insert({
        call_id: payload.call?.id,
        tool_call_id: toolCallId,
        tool_name: func.name,
        arguments: func.arguments,
        result,
        status: result?.error ? 'failed' : 'success',
        duration_ms: durationMs,
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
    message: payload.transcript.transcript,
    confidence: payload.transcript.confidence,
    timestamp: payload.transcript.timestamp
  });
  
  return { success: true };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Strict CORS and JSON-only
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    if (!isOriginAllowed(origin)) {
      return new Response(JSON.stringify({ error: 'CORS origin forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) } });
    }
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }
  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'CORS origin forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) } });
  }

  return await withPersistentRateLimit(req, 'webhook', supabase as any, async () => {
    return await withWebhookSecurity(req, ENV.vapiWebhookSecret, async (payload: WebhookPayload, request: Request) => {
      // Route to appropriate handler (payload is already validated)
      let response: any = { success: true };
      switch (payload.type) {
        case 'call-started':
          response = await handleCallStarted(payload as any);
          break;
        case 'call-ended':
          response = await handleCallEnded(payload as any);
          break;
        case 'tool-calls':
        case 'function-call':
          response = await handleToolCalls(payload as any);
          break;
        case 'transcript':
          response = await handleTranscript(payload as any);
          break;
        case 'health-check':
          response = { status: 'healthy', timestamp: new Date().toISOString() };
          break;
        default:
          console.warn('Unknown webhook type:', (payload as any).type);
          response = { success: true, message: `Unhandled type: ${(payload as any).type}` };
      }

      return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request.headers.get('origin')) } });
    });
  });
});
