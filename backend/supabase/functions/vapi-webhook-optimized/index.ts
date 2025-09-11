// VAPI Webhook - Optimized Production Version with Enterprise Hardening
// Target: Sub-200ms response times with maximum security and reliability
// Version 4.0.0 - Complete performance and security optimization

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { withWebhookSecurity } from "../_shared/middleware/webhook-security.ts";
import { withPersistentRateLimit } from "../_shared/middleware/rate-limit-persistent.ts";
import { withSecurityHeaders, initSecurityCleanup } from "../_shared/middleware/security-headers.ts";
import { withMonitoring, createHealthCheck } from "../_shared/middleware/monitoring-hooks.ts";
import { withPerformanceOptimization, QueryOptimizer, ParallelQueryManager } from "../_shared/services/performance-optimizer.ts";
import { getConnectionPool, executePooledQuery } from "../_shared/services/connection-pool.ts";
import { CallService } from "../_shared/services/call-service.ts";
import { SMSService } from "../_shared/services/sms-service.ts";
import { logger } from "../_shared/utils/logging.ts";
import type { WebhookPayload } from "../_shared/validation/vapi-schemas.ts";

// ============================================================================
// OPTIMIZED ENVIRONMENT CONFIGURATION
// ============================================================================

interface OptimizedConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  vapiWebhookSecret: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFrom: string;
  environment: string;
  enableOptimizations: boolean;
  targetResponseTimeMs: number;
}

function getOptimizedConfig(): OptimizedConfig {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PUBLIC_SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const config = {
    supabaseUrl: supabaseUrl as string,
    supabaseServiceKey: supabaseServiceKey as string,
    vapiWebhookSecret: Deno.env.get('VAPI_WEBHOOK_SECRET')!,
    twilioAccountSid: Deno.env.get('TWILIO_ACCOUNT_SID') || '',
    twilioAuthToken: Deno.env.get('TWILIO_AUTH_TOKEN') || '',
    twilioFrom: Deno.env.get('TWILIO_FROM') || Deno.env.get('TWILIO_PHONE_NUMBER') || '',
    environment: Deno.env.get('ENVIRONMENT') || 'development',
    enableOptimizations: Deno.env.get('ENABLE_OPTIMIZATIONS') !== 'false',
    targetResponseTimeMs: parseInt(Deno.env.get('TARGET_RESPONSE_TIME_MS') || '200')
  };

  // Fast validation
  const required = ['supabaseUrl', 'supabaseServiceKey', 'vapiWebhookSecret'];
  const missing = required.filter(key => !config[key as keyof OptimizedConfig]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return config;
}

// Initialize configuration and services
const CONFIG = getOptimizedConfig();
const connectionPool = getConnectionPool();
const queryOptimizer = QueryOptimizer.getInstance();
const parallelManager = new ParallelQueryManager();

// Initialize services with connection pooling
const callService = new CallService(connectionPool as any);
const smsService = CONFIG.twilioAccountSid && CONFIG.twilioAuthToken && CONFIG.twilioFrom
  ? new SMSService({
      accountSid: CONFIG.twilioAccountSid,
      authToken: CONFIG.twilioAuthToken,
      fromNumber: CONFIG.twilioFrom
    })
  : null;

// Initialize security cleanup
initSecurityCleanup();

// ============================================================================
// OPTIMIZED BUSINESS LOGIC FUNCTIONS
// ============================================================================

// High-performance priority classification with caching
const classifyPriority = (description: string, value?: number) => {
  const cacheKey = `priority_${description.slice(0, 50)}_${value || 0}`;
  
  return queryOptimizer.optimizedQuery(
    cacheKey,
    async () => {
      const d = description.toLowerCase();
      
      // P1: Emergency - immediate response required
      if (/\b(inondation|refoulement|urgence|débordement|eau dans le sous-sol|emergency)\b/.test(d)) {
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
      
      // P2: Municipal contracts
      if (/\b(municipalit|ville de|municipal|city of)\b/.test(d)) {
        return {
          priority: 'P2',
          reason: 'municipal',
          sla_seconds: 120,
          businessHours: true
        };
      }
      
      // P3: High value services
      const isHighValue = /\b(gainage|relining|drain français)\b/.test(d) || 
                         (typeof value === 'number' && value >= 3000);
      
      if (isHighValue) {
        return {
          priority: 'P3',
          reason: 'high_value',
          sla_seconds: 3600,
          businessHours: true
        };
      }
      
      // P4: Standard
      return {
        priority: 'P4',
        reason: 'standard',
        sla_seconds: 1800,
        businessHours: true
      };
    },
    { ttl: 300, useCache: CONFIG.enableOptimizations }
  );
};

// Optimized service validation with parallel processing
const validateServiceRequest = async (args: { service: string }) => {
  const service = (args.service || '').toLowerCase();
  const cacheKey = `service_validation_${service}`;
  
  return queryOptimizer.optimizedQuery(
    cacheKey,
    async () => {
      // Oriented services (formerly refused)
      const orientedServices = ['fosse', 'piscine', 'goutti', 'puisard', 'septic', 'pool'];
      const requiresOrientation = orientedServices.some(ref => service.includes(ref));

      if (requiresOrientation) {
        // Non-blocking internal notification
        notifyInternalTeam(
          `[ORIENTATION] Service hors offre: ${args.service}`,
          'P2',
          null
        ).catch(() => {}); // Fire and forget

        return {
          accepted: true,
          reason: 'service_oriente',
          message: "Merci! Ce service sera orienté correctement. Un membre de l'équipe vous recontactera rapidement.",
          restrictions: orientedServices
        };
      }

      // Assessment required services
      const assessmentRequired = ['gainage', 'relining', 'drain français complet'];
      const requiresAssessment = assessmentRequired.some(special => service.includes(special));

      return {
        accepted: true,
        reason: 'service_available',
        message: requiresAssessment
          ? 'Parfait! Ce service nécessite une évaluation sur place. Nous pouvons planifier une inspection.'
          : 'Parfait! On peut certainement vous aider avec ça.'
      };
    },
    { ttl: 600, useCache: CONFIG.enableOptimizations }
  );
};

// Fast quote calculation with optimized pricing logic
const calculateQuote = async (args: { serviceType: string; description?: string; estimatedValue?: number }) => {
  const cacheKey = `quote_${args.serviceType}_${args.description?.slice(0, 20) || 'none'}`;
  
  return queryOptimizer.optimizedQuery(
    cacheKey,
    async () => {
      // Optimized pricing lookup
      const servicePricing = new Map([
        ['debouchage_camera', { min: 350, max: 650, unit: 'per_service' }],
        ['racines_alesage', { min: 450, max: 750, unit: 'per_service' }],
        ['gainage_installation', { min: 3900, max: 8000, unit: 'per_foot' }],
        ['drain_francais', { min: 500, max: 800, unit: 'per_foot' }],
        ['inspection', { min: 200, max: 300, unit: 'per_service' }]
      ]);
      
      const pricing = servicePricing.get(args.serviceType) || servicePricing.get('debouchage_camera')!;
      
      // Fast complexity calculation
      const description = (args.description || '').toLowerCase();
      let complexityMultiplier = 1.0;
      
      if (description.includes('urgence') || description.includes('emergency')) {
        complexityMultiplier = 1.3;
      } else if (description.includes('difficile') || description.includes('complex')) {
        complexityMultiplier = 1.2;
      }
      
      const adjustedMin = Math.round(pricing.min * complexityMultiplier);
      const adjustedMax = Math.round(pricing.max * complexityMultiplier);
      
      return {
        min: adjustedMin,
        max: adjustedMax,
        currency: 'CAD',
        message: `Le prix varie entre ${adjustedMin}$ et ${adjustedMax}$ plus taxes.${
          complexityMultiplier > 1 ? ' Prix ajusté selon la complexité du service.' : ''
        }`,
        factors: {
          basePrice: pricing.min,
          complexity: complexityMultiplier,
          urgency: description.includes('urgence') ? 1.3 : 1.0,
          location: 1.0
        },
        estimatedDuration: getEstimatedDuration(args.serviceType)
      };
    },
    { ttl: 300, useCache: CONFIG.enableOptimizations }
  );
};

// Fast duration lookup
const getEstimatedDuration = (serviceType: string) => {
  const durations = new Map([
    ['debouchage_camera', { min: 2, max: 4, unit: 'hours' as const }],
    ['racines_alesage', { min: 3, max: 6, unit: 'hours' as const }],
    ['gainage_installation', { min: 1, max: 3, unit: 'days' as const }],
    ['drain_francais', { min: 2, max: 5, unit: 'days' as const }],
    ['inspection', { min: 1, max: 2, unit: 'hours' as const }]
  ]);
  
  return durations.get(serviceType) || durations.get('debouchage_camera')!;
};

// Optimized scheduling evaluation
const evaluateScheduling = async (args: { serviceType: string; priority?: string; urgency?: string }) => {
  const cacheKey = `scheduling_${args.serviceType}_${args.priority || 'none'}`;
  
  return queryOptimizer.optimizedQuery(
    cacheKey,
    async () => {
      const schedulingWindows = new Map([
        ['drain_francais', '1 à 3 semaines'],
        ['inspection', '1 à 2 semaines'],
        ['gainage', '2 à 4 semaines'],
        ['gainage_installation', '2 à 4 semaines'],
        ['debouchage_camera', '3 à 5 jours ouvrables'],
        ['racines_alesage', '3 à 5 jours ouvrables']
      ]);
      
      let window = schedulingWindows.get(args.serviceType) || '3 à 5 jours ouvrables';
      let message = `Nous pouvons planifier dans ${window}.`;
      
      // Priority adjustments
      if (args.priority === 'P1' || args.urgency === 'critical') {
        window = 'Même journée ou 24h';
        message = 'Urgence détectée. Nous pouvons intervenir aujourd\'hui même ou demain matin.';
      } else if (args.priority === 'P2') {
        window = '1 à 2 jours ouvrables';
        message = 'Client municipal - priorité élevée. Intervention dans 1 à 2 jours ouvrables.';
      }
      
      return {
        window,
        canSchedule: true,
        message,
        earliestDate: calculateEarliestDate(args.priority),
        requirements: getServiceRequirements(args.serviceType)
      };
    },
    { ttl: 300, useCache: CONFIG.enableOptimizations }
  );
};

// Fast date calculation
const calculateEarliestDate = (priority?: string): string => {
  const now = new Date();
  let daysToAdd = 3;
  
  if (priority === 'P1') daysToAdd = 0;
  else if (priority === 'P2') daysToAdd = 1;
  else if (priority === 'P3') daysToAdd = 2;
  
  const earliestDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return earliestDate.toISOString().split('T')[0];
};

// Optimized requirements lookup
const getServiceRequirements = (serviceType: string): string[] => {
  const requirements = new Map([
    ['drain_francais', ['Accès au périmètre de la propriété', 'Localisation des services publics']],
    ['gainage', ['Inspection vidéo préalable', 'Accès aux regards d\'accès']],
    ['gainage_installation', ['Inspection vidéo préalable', 'Accès aux regards d\'accès']],
    ['inspection', ['Accès aux regards d\'accès']]
  ]);
  
  return requirements.get(serviceType) || ['Accès à la propriété'];
};

// Optimized SMS alert with batching
const sendSMSAlert = async (args: { message: string; phoneNumbers: string[]; priority: string; isInternal?: boolean }) => {
  if (!smsService || !args.phoneNumbers?.length) {
    return { sent: false, error: 'service_unavailable', priority: args.priority };
  }

  try {
    // Send SMS in parallel
    const smsResult = await smsService.sendSMSAlert({
      to: args.phoneNumbers,
      message: args.message,
      priority: args.priority
    });

    // Batch insert to database (non-blocking)
    executePooledQuery(async (client) => {
      const records = args.phoneNumbers.map(to => ({
        to_number: to,
        from_number: CONFIG.twilioFrom,
        message: args.message,
        sms_type: args.isInternal ? 'alert_internal' : 'notification',
        priority: args.priority,
        status: smsResult.sent ? 'sent' : 'failed',
        twilio_sid: smsResult.sids?.[0] || null,
        sent_at: new Date().toISOString()
      }));

      return client.from('sms_messages').insert(records);
    }).catch(() => {}); // Non-blocking

    return {
      sent: smsResult.sent,
      priority: args.priority,
      messagesSent: smsResult.sids?.length || 0,
      details: smsResult.errors
    };
  } catch (error) {
    logger.error('SMS alert failed', error as Error, { phoneNumbers: args.phoneNumbers.length });
    return { sent: false, error: (error as Error).message, priority: args.priority };
  }
};

// Optimized CRM operations with connection pooling
const createOrUpdateClient = async (callData: any) => {
  const phoneNumber = callData.phoneNumber || callData.customer?.phoneNumber;
  if (!phoneNumber) return null;

  return executePooledQuery(async (client) => {
    // Try to find existing client first
    const { data: existingClient } = await client
      .from('clients')
      .select('id, call_count')
      .eq('phone_number', phoneNumber)
      .single();

    if (existingClient) {
      // Update existing
      const { data } = await client
        .from('clients')
        .update({
          last_contact: new Date().toISOString(),
          call_count: (existingClient.call_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClient.id)
        .select()
        .single();
      
      return data;
    } else {
      // Create new
      const { data } = await client
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
      
      return data;
    }
  });
};

// Fast internal notification
const notifyInternalTeam = async (message: string, priority: string, callDetails: any) => {
  let recipients: string[] = [];
  
  try {
    const contactsEnv = Deno.env.get('SLA_CONTACTS_JSON');
    if (contactsEnv) {
      const contactMap = JSON.parse(contactsEnv);
      recipients = Array.isArray(contactMap?.[priority]) ? contactMap[priority] : [];
    }
  } catch {}
  
  if (!recipients.length) {
    const fallback = Deno.env.get('TWILIO_ALERT_FALLBACK_TO');
    if (fallback) recipients = [fallback];
  }

  if (!recipients.length) return { sent: false, error: 'no_recipients' };

  const internalMessage = `[${priority}] ${message}\n` +
    `Client: ${callDetails?.phoneNumber ? callDetails.phoneNumber.replace(/.(?=.{3})/g, '*') : 'Unknown'}\n` +
    `Time: ${new Date().toLocaleString('fr-CA')}`;

  return sendSMSAlert({
    message: internalMessage,
    phoneNumbers: recipients,
    priority,
    isInternal: true
  });
};

// ============================================================================
// OPTIMIZED WEBHOOK HANDLERS
// ============================================================================

const handleCallStarted = async (payload: WebhookPayload) => {
  const operations = [
    () => createOrUpdateClient(payload.call),
    () => callService.upsertCall({
      id: payload.call!.id,
      assistantId: payload.call!.assistantId,
      phoneNumber: payload.call?.phoneNumber,
      customerId: null, // Will be updated after client creation
      status: 'active',
      startedAt: payload.call?.startedAt || new Date().toISOString()
    })
  ];

  try {
    const [client, call] = await parallelManager.execute(operations, { timeout: 3000 });
    
    // Update call with client ID if available
    if (client && call) {
      await executePooledQuery(async (db) => {
        return db.from('calls')
          .update({ customer_id: client.id })
          .eq('id', payload.call!.id);
      });
    }

    return { success: true, message: 'Call started processed', clientId: client?.id };
  } catch (error) {
    logger.error('Call started handler failed', error as Error, { callId: payload.call?.id });
    return { success: false, error: (error as Error).message };
  }
};

const handleCallEnded = async (payload: WebhookPayload) => {
  try {
    // Process call end
    await callService.processCallEnd({
      callId: payload.call!.id,
      analysis: payload.call?.analysis
    });

    // Analyze and notify if needed (non-blocking)
    if (payload.call?.analysis) {
      setImmediate(async () => {
        try {
          const priority = await classifyPriority(
            payload.call!.analysis.summary || '',
            payload.call!.analysis.estimatedValue
          );

          if (priority.priority === 'P1' || priority.priority === 'P2') {
            await notifyInternalTeam(
              `Call ended - ${payload.call!.analysis.summary || 'No summary'}`,
              priority.priority,
              payload.call
            );
          }
        } catch (error) {
          logger.error('Post-call analysis failed', error as Error, { callId: payload.call!.id });
        }
      });
    }

    return { success: true, message: 'Call ended processed' };
  } catch (error) {
    logger.error('Call ended handler failed', error as Error, { callId: payload.call?.id });
    return { success: false, error: (error as Error).message };
  }
};

const handleToolCalls = async (payload: WebhookPayload) => {
  if (!payload.toolCalls?.length) {
    return { success: true, results: [] };
  }

  // Process tool calls in parallel
  const toolCallOperations = payload.toolCalls.map(toolCall => async () => {
    const { toolCallId, function: func } = toolCall;
    const startTime = performance.now();

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
          result = await classifyPriority(
            func.arguments.description,
            func.arguments.estimatedValue ?? func.arguments.value
          );
          break;
        case 'sendSMSAlert':
          result = await sendSMSAlert(func.arguments);
          break;
        default:
          result = { error: `Unknown function: ${func.name}` };
      }

      const duration = performance.now() - startTime;

      // Log tool call (non-blocking)
      executePooledQuery(async (client) => {
        return client.from('tool_calls').insert({
          call_id: payload.call?.id,
          tool_call_id: toolCallId,
          tool_name: func.name,
          arguments: func.arguments,
          result,
          status: result?.error ? 'failed' : 'success',
          duration_ms: Math.round(duration),
          created_at: new Date().toISOString()
        });
      }).catch(() => {}); // Non-blocking

      return { toolCallId, result };
    } catch (error) {
      logger.error(`Tool call ${func.name} failed`, error as Error, { toolCallId });
      return { toolCallId, result: { error: (error as Error).message } };
    }
  });

  const results = await parallelManager.execute(toolCallOperations, {
    timeout: CONFIG.targetResponseTimeMs - 50, // Leave buffer for response processing
    failFast: false
  });

  return { success: true, results };
};

const handleTranscript = async (payload: WebhookPayload) => {
  if (!payload.transcript || !payload.call?.id) {
    return { success: false, error: 'Missing transcript or call ID' };
  }

  try {
    await executePooledQuery(async (client) => {
      return client.from('call_transcripts').insert({
        call_id: payload.call!.id,
        role: payload.transcript!.role,
        message: payload.transcript!.transcript,
        confidence: payload.transcript!.confidence,
        timestamp: payload.transcript!.timestamp
      });
    });

    return { success: true };
  } catch (error) {
    logger.error('Transcript storage failed', error as Error, { callId: payload.call?.id });
    return { success: false, error: (error as Error).message };
  }
};

// ============================================================================
// OPTIMIZED MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Multi-layer middleware with performance optimization
  return withMonitoring(req, async () => {
    return withSecurityHeaders(req, async () => {
      return withPerformanceOptimization(req, async () => {
        // Fast CORS check
        const origin = req.headers.get('origin');
        if (req.method === 'OPTIONS') {
          return new Response(null, {
            status: isOriginAllowed(origin) ? 204 : 403,
            headers: getCorsHeaders(origin)
          });
        }

        if (!isOriginAllowed(origin)) {
          return new Response(
            JSON.stringify({ error: 'CORS origin forbidden' }),
            { status: 403, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(null) } }
          );
        }

        // Apply rate limiting and security
        return withPersistentRateLimit(req, 'webhook', connectionPool as any, async () => {
          return withWebhookSecurity(req, CONFIG.vapiWebhookSecret, async (payload: WebhookPayload) => {
            const startTime = performance.now();
            let response: any;

            try {
              // Route to optimized handlers
              switch (payload.type) {
                case 'call-started':
                  response = await handleCallStarted(payload);
                  break;
                case 'call-ended':
                  response = await handleCallEnded(payload);
                  break;
                case 'tool-calls':
                case 'function-call':
                  response = await handleToolCalls(payload);
                  break;
                case 'transcript':
                  response = await handleTranscript(payload);
                  break;
                case 'health-check':
                  response = { status: 'healthy', timestamp: new Date().toISOString() };
                  break;
                default:
                  response = { success: true, message: `Unhandled type: ${payload.type}` };
              }

              const duration = performance.now() - startTime;
              
              // Add performance headers
              const headers = {
                'Content-Type': 'application/json',
                'X-Response-Time': `${duration.toFixed(2)}ms`,
                'X-Handler-Version': '4.0.0',
                ...getCorsHeaders(origin)
              };

              // Log if response time exceeds target
              if (duration > CONFIG.targetResponseTimeMs) {
                logger.warn('Response time exceeded target', {
                  duration: `${duration.toFixed(2)}ms`,
                  target: `${CONFIG.targetResponseTimeMs}ms`,
                  type: payload.type
                });
              }

              return new Response(JSON.stringify(response), { status: 200, headers });

            } catch (error) {
              const duration = performance.now() - startTime;
              logger.error('Webhook handler error', error as Error, {
                duration: `${duration.toFixed(2)}ms`,
                type: payload.type
              });

              return new Response(
                JSON.stringify({ error: 'Internal processing error' }),
                {
                  status: 500,
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Response-Time': `${duration.toFixed(2)}ms`,
                    ...getCorsHeaders(origin)
                  }
                }
              );
            }
          });
        });
      });
    });
  });
});