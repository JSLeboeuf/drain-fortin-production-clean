// VAPI Webhook - Production-Ready with Enterprise-Grade Security
// Version 2.0.0 - Fully secured implementation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";
import { logger, withRequestLogging } from "../_shared/utils/logging.ts";
import { withRateLimit } from "../_shared/middleware/rate-limit.ts";
import { withWebhookSecurity } from "../_shared/middleware/webhook-security.ts";
import { ErrorFactory, formatErrorResponse, extractErrorInfo } from "../_shared/utils/errors.ts";
import type {
  WebhookPayload,
  VAPICallRecord,
  ToolCallRecord,
  CallTranscriptRecord,
  FunctionResult,
  ToolCallResponse,
  FunctionCallResponse,
  WebhookResponse,
  ValidateServiceRequestResult,
  CalculateQuoteResult,
  ClassifyPriorityResult,
  EvaluateSchedulingResult,
  SendSMSAlertResult
} from "../_shared/types/vapi-types.ts";
import {
  isCallStartedPayload,
  isCallEndedPayload,
  isFunctionCallPayload,
  isToolCallsPayload,
  isTranscriptPayload,
  isHealthCheckPayload
} from "../_shared/types/vapi-types.ts";

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
    supabaseUrl: Deno.env.get('SUPABASE_URL'),
    supabaseServiceKey: Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    vapiWebhookSecret: Deno.env.get('VAPI_WEBHOOK_SECRET'),
    twilioAccountSid: Deno.env.get('TWILIO_ACCOUNT_SID') || '',
    twilioAuthToken: Deno.env.get('TWILIO_AUTH_TOKEN') || '',
    twilioFrom: Deno.env.get('TWILIO_FROM') || Deno.env.get('TWILIO_PHONE_NUMBER') || '',
    environment: Deno.env.get('ENVIRONMENT') || 'development'
  };

  // Validate required environment variables
  const required = ['supabaseUrl', 'supabaseServiceKey', 'vapiWebhookSecret'];
  const missing = required.filter(key => !config[key as keyof EnvironmentConfig]);
  
  if (missing.length > 0) {
    logger.error('Missing required environment variables', {
      missing,
      environment: config.environment
    });
    throw ErrorFactory.validation(
      `Missing required environment variables: ${missing.join(', ')}`,
      'environment',
      { missing }
    );
  }

  logger.info('Environment configuration loaded', {
    environment: config.environment,
    hasSupabaseUrl: !!config.supabaseUrl,
    hasServiceKey: !!config.supabaseServiceKey,
    hasWebhookSecret: !!config.vapiWebhookSecret,
    hasTwilioConfig: !!(config.twilioAccountSid && config.twilioAuthToken && config.twilioFrom)
  });

  return config as EnvironmentConfig;
}

// Initialize configuration
const ENV = getEnvironmentConfig();

// Initialize Supabase client with error handling
const supabase = createClient(ENV.supabaseUrl, ENV.supabaseServiceKey);

// ============================================================================
// BUSINESS LOGIC FUNCTIONS with Enhanced Error Handling
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
    logger.businessEvent('Service request refused', {
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
  
  logger.businessEvent('Service request accepted', {
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
  
  logger.businessEvent('Quote calculated', {
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
  
  logger.businessEvent('Scheduling evaluated', {
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

// Enhanced SMS alert system with comprehensive error handling
async function sendSMSAlert(args: { message: string; phoneNumbers: string[]; priority: string }): Promise<SendSMSAlertResult> {
  if (!ENV.twilioAccountSid || !ENV.twilioAuthToken || !ENV.twilioFrom) {
    logger.error('SMS alert attempted without Twilio configuration', {
      priority: args.priority,
      recipientCount: args.phoneNumbers.length
    });
    
    return {
      sent: false,
      error: 'twilio_not_configured',
      priority: args.priority
    };
  }
  
  // Validate input parameters
  if (args.phoneNumbers.length > 10) {
    logger.warn('SMS alert with excessive recipients', {
      recipientCount: args.phoneNumbers.length,
      priority: args.priority
    });
    
    return {
      sent: false,
      error: 'too_many_recipients',
      priority: args.priority
    };
  }
  
  if (args.message.length > 1600) {
    logger.warn('SMS message too long', {
      messageLength: args.message.length,
      priority: args.priority
    });
    
    return {
      sent: false,
      error: 'message_too_long',
      priority: args.priority
    };
  }
  
  const successful: string[] = [];
  const failed: Array<{ phoneNumber: string; error: string }> = [];
  const sids: string[] = [];
  
  // Send to each recipient
  for (const phoneNumber of args.phoneNumbers) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${ENV.twilioAccountSid}/Messages.json`;
      const body = new URLSearchParams();
      body.set('From', ENV.twilioFrom);
      body.set('To', phoneNumber);
      body.set('Body', args.message);
      
      const auth = 'Basic ' + btoa(`${ENV.twilioAccountSid}:${ENV.twilioAuthToken}`);
      
      logger.externalRequest('Twilio SMS', 'send_message', {
        to: phoneNumber.slice(-4), // Log only last 4 digits for privacy
        priority: args.priority
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.externalResponse('Twilio SMS', false, undefined, {
          status: response.status,
          error: errorText,
          recipient: phoneNumber.slice(-4)
        });
        
        failed.push({
          phoneNumber,
          error: `HTTP ${response.status}: ${errorText}`
        });
        continue;
      }
      
      const result = await response.json();
      logger.externalResponse('Twilio SMS', true, undefined, {
        sid: result.sid,
        recipient: phoneNumber.slice(-4)
      });
      
      if (result.sid) {
        sids.push(result.sid);
        successful.push(phoneNumber);
      } else {
        failed.push({
          phoneNumber,
          error: 'No SID returned from Twilio'
        });
      }
      
    } catch (error) {
      logger.error('SMS sending failed', error as Error, {
        recipient: phoneNumber.slice(-4),
        priority: args.priority
      });
      
      failed.push({
        phoneNumber,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  const allSuccessful = failed.length === 0;
  logger.businessEvent('SMS alert completed', {
    successful: successful.length,
    failed: failed.length,
    priority: args.priority,
    totalSids: sids.length
  });
  
  return {
    sent: allSuccessful,
    sids: sids.length > 0 ? sids : undefined,
    priority: args.priority,
    recipients: {
      successful,
      failed
    },
    error: allSuccessful ? undefined : `${failed.length} messages failed to send`
  };
}

// ============================================================================
// FUNCTION CALL PROCESSOR with Enhanced Error Handling
// ============================================================================

async function processFunction(name: string, args: any): Promise<FunctionResult> {
  const startTime = performance.now();
  
  try {
    logger.businessEvent('Function call started', { function: name, hasArgs: !!args });
    
    let result: FunctionResult;
    
    switch (name) {
      case 'validateServiceRequest':
        result = await validateServiceRequest(args);
        break;
        
      case 'calculateQuote':
        result = await calculateQuote(args);
        break;
        
      case 'classifyPriority':
        result = classifyPriority(args.description || '', args.estimatedValue);
        break;
        
      case 'evaluateScheduling':
        result = await evaluateScheduling(args);
        break;
        
      case 'sendSMSAlert':
        result = await sendSMSAlert(args);
        break;
        
      default:
        logger.warn('Unknown function call', { function: name });
        return {
          error: 'Function not found',
          message: "Cette fonction n'est pas disponible."
        } as any;
    }
    
    const duration = performance.now() - startTime;
    logger.businessEvent('Function call completed', {
      function: name,
      duration: `${duration.toFixed(2)}ms`,
      success: true
    });
    
    return result;
    
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Function call failed', error as Error, {
      function: name,
      args,
      duration: `${duration.toFixed(2)}ms`
    });
    
    return {
      error: 'Function execution failed',
      message: 'Une erreur est survenue lors du traitement de votre demande.'
    } as any;
  }
}

// ============================================================================
// DATABASE OPERATIONS with Enhanced Error Handling
// ============================================================================

async function handleCallStarted(payload: WebhookPayload): Promise<void> {
  if (!isCallStartedPayload(payload) || !payload.call) return;
  
  const callData: Partial<VAPICallRecord> = {
    call_id: payload.call.id,
    assistant_id: payload.call.assistantId,
    status: 'active',
    started_at: payload.call.startedAt || new Date().toISOString(),
    customer_phone: payload.call.phoneNumber,
  };
  
  logger.dbQuery('INSERT INTO vapi_calls', [callData.call_id]);
  const startTime = performance.now();
  
  const { error } = await supabase
    .from('vapi_calls')
    .upsert(callData, { onConflict: 'call_id' });
  
  const duration = performance.now() - startTime;
  logger.dbResult(error ? 0 : 1, duration);
  
  if (error) {
    logger.error('Failed to insert call started record', error, {
      callId: callData.call_id,
      operation: 'upsert_vapi_calls'
    });
    throw ErrorFactory.database('Failed to record call start', 'upsert_vapi_calls', error);
  }
  
  logger.businessEvent('Call started recorded', { callId: callData.call_id });
}

async function handleCallEnded(payload: WebhookPayload): Promise<void> {
  if (!isCallEndedPayload(payload) || !payload.call) return;
  
  const structuredData = payload.call.analysis?.structuredData || {};
  const priority = classifyPriority(structuredData.description || '', structuredData.estimatedValue);
  
  const updateData: Partial<VAPICallRecord> = {
    status: 'completed',
    ended_at: payload.call.endedAt || new Date().toISOString(),
    call_duration: payload.call.duration,
    analysis: payload.call.analysis || {},
    customer_name: structuredData.nom || null,
    customer_email: structuredData.courriel || null,
    address: structuredData.adresse || null,
    postal_code: structuredData.codePostal || null,
    problem_description: structuredData.description || null,
    service_type: structuredData.serviceType || null,
    priority: priority.priority,
    priority_reason: priority.reason,
    sla_seconds: priority.sla_seconds
  };
  
  logger.dbQuery('UPDATE vapi_calls', [payload.call.id]);
  const startTime = performance.now();
  
  const { error } = await supabase
    .from('vapi_calls')
    .update(updateData)
    .eq('call_id', payload.call.id);
  
  const duration = performance.now() - startTime;
  logger.dbResult(error ? 0 : 1, duration);
  
  if (error) {
    logger.error('Failed to update call ended record', error, {
      callId: payload.call.id,
      operation: 'update_vapi_calls'
    });
    throw ErrorFactory.database('Failed to record call end', 'update_vapi_calls', error);
  }
  
  logger.businessEvent('Call ended recorded', {
    callId: payload.call.id,
    priority: priority.priority,
    duration: payload.call.duration
  });
}

async function handleToolCalls(payload: WebhookPayload): Promise<void> {
  if ((!isToolCallsPayload(payload) && !isFunctionCallPayload(payload)) || 
      !payload.toolCalls || !payload.call?.id) return;
  
  const callId = payload.call.id;
  
  for (const toolCall of payload.toolCalls) {
    const toolCallData: Partial<ToolCallRecord> = {
      call_id: callId,
      tool_name: toolCall.function.name,
      tool_call_id: toolCall.toolCallId,
      arguments: toolCall.function.arguments,
      timestamp: new Date().toISOString()
    };
    
    logger.dbQuery('INSERT INTO tool_calls', [toolCallData.tool_call_id]);
    const startTime = performance.now();
    
    const { error } = await supabase
      .from('tool_calls')
      .insert(toolCallData);
    
    const duration = performance.now() - startTime;
    logger.dbResult(error ? 0 : 1, duration);
    
    if (error) {
      logger.error('Failed to insert tool call record', error, {
        callId,
        toolCallId: toolCall.toolCallId,
        operation: 'insert_tool_calls'
      });
      // Continue with other tool calls even if one fails
    } else {
      logger.businessEvent('Tool call recorded', {
        callId,
        toolCallId: toolCall.toolCallId,
        functionName: toolCall.function.name
      });
    }
  }
}

async function handleTranscript(payload: WebhookPayload): Promise<void> {
  if (!isTranscriptPayload(payload) || !payload.transcript || !payload.call?.id) return;
  
  const transcriptData: Partial<CallTranscriptRecord> = {
    call_id: payload.call.id,
    role: payload.transcript.role === 'user' ? 'user' : 'assistant',
    message: payload.transcript.transcript,
    confidence: payload.transcript.confidence,
    timestamp: payload.transcript.timestamp || new Date().toISOString(),
    word_count: payload.transcript.transcript.split(/\s+/).length
  };
  
  logger.dbQuery('INSERT INTO call_transcripts', [transcriptData.call_id]);
  const startTime = performance.now();
  
  const { error } = await supabase
    .from('call_transcripts')
    .insert(transcriptData);
  
  const duration = performance.now() - startTime;
  logger.dbResult(error ? 0 : 1, duration);
  
  if (error) {
    logger.error('Failed to insert transcript record', error, {
      callId: payload.call.id,
      operation: 'insert_call_transcripts'
    });
    throw ErrorFactory.database('Failed to record transcript', 'insert_call_transcripts', error);
  }
  
  logger.businessEvent('Transcript recorded', {
    callId: payload.call.id,
    role: transcriptData.role,
    wordCount: transcriptData.word_count
  });
}

// ============================================================================
// MAIN WEBHOOK HANDLER with Complete Security
// ============================================================================

async function handleWebhookPayload(payload: WebhookPayload, request: Request): Promise<Response> {
  const startTime = performance.now();
  const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
  
  try {
    // Health check - fast path
    if (isHealthCheckPayload(payload)) {
      logger.info('Health check request processed');
      return new Response(
        JSON.stringify({
          success: true,
          type: 'health-check',
          timestamp: new Date().toISOString(),
          version: '2.0.0'
        } as WebhookResponse),
        { headers: responseHeaders }
      );
    }
    
    // Process webhook events
    switch (payload.type) {
      case 'call-started':
        await handleCallStarted(payload);
        break;
        
      case 'call-ended':
        await handleCallEnded(payload);
        break;
        
      case 'tool-calls':
        await handleToolCalls(payload);
        break;
        
      case 'transcript':
        await handleTranscript(payload);
        break;
        
      case 'function-call':
        // Handle function calls and return results
        if (payload.toolCalls) {
          const results: ToolCallResponse[] = [];
          
          for (const toolCall of payload.toolCalls) {
            const result = await processFunction(
              toolCall.function.name,
              toolCall.function.arguments
            );
            results.push({
              toolCallId: toolCall.toolCallId,
              result
            });
          }
          
          const response: FunctionCallResponse = { results };
          const duration = performance.now() - startTime;
          
          logger.info('Function call processed', {
            functionCount: results.length,
            duration: `${duration.toFixed(2)}ms`
          });
          
          return new Response(
            JSON.stringify(response),
            { headers: responseHeaders }
          );
        }
        break;
        
      default:
        logger.warn('Unknown webhook event type', { type: payload.type });
    }
    
    // Standard success response
    const duration = performance.now() - startTime;
    const response: WebhookResponse = {
      success: true,
      type: payload.type,
      timestamp: new Date().toISOString(),
      processed: true
    };
    
    logger.info('Webhook processed successfully', {
      type: payload.type,
      duration: `${duration.toFixed(2)}ms`,
      callId: payload.call?.id
    });
    
    return new Response(
      JSON.stringify(response),
      { headers: responseHeaders }
    );
    
  } catch (error) {
    const duration = performance.now() - startTime;
    const errorInfo = extractErrorInfo(error);
    
    logger.error('Webhook processing failed', error as Error, {
      payloadType: payload.type,
      duration: `${duration.toFixed(2)}ms`,
      callId: payload.call?.id
    });
    
    const errorResponse = formatErrorResponse(error as Error, ENV.environment === 'development');
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: errorInfo.statusCode,
        headers: responseHeaders
      }
    );
  }
}

// ============================================================================
// MAIN SERVE HANDLER with Complete Security Stack
// ============================================================================

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('OK', { headers: corsHeaders });
  }
  
  return withRequestLogging(async () => {
    return withRateLimit(req, 'webhook', async () => {
      return withWebhookSecurity(req, ENV.vapiWebhookSecret, handleWebhookPayload);
    });
  }, 'vapi-webhook-request', {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent')
  });
});

// ============================================================================
// STARTUP LOGGING
// ============================================================================

logger.info('VAPI Webhook started', {
  version: '2.0.0',
  environment: ENV.environment,
  features: [
    'HMAC signature verification (all environments)',
    'Comprehensive Zod validation',
    'Rate limiting protection',
    'Structured logging',
    'Enhanced error handling',
    'Business rule validation',
    'Request size validation',
    'Replay attack protection'
  ],
  security: {
    hmacEnforcement: 'ALL_ENVIRONMENTS',
    rateLimiting: 'ENABLED',
    payloadValidation: 'STRICT',
    businessRules: 'ENFORCED'
  }
});