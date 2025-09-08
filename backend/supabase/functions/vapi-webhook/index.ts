import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { 
  getCorsHeaders, 
  isOriginAllowed, 
  validateContentType,
  sanitizeHeaders,
  getRateLimitConfig
} from "../_shared/cors.ts";

// Environment variables
// Supabase injects SUPABASE_URL automatically. Service key must be provided via secret
// Note: secrets cannot start with SUPABASE_* in Edge Functions. Use SERVICE_ROLE_KEY instead.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPI_WEBHOOK_SECRET = Deno.env.get('VAPI_WEBHOOK_SECRET');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TWILIO_FROM = Deno.env.get('TWILIO_FROM') || Deno.env.get('TWILIO_PHONE_NUMBER') || '';
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'development';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Rate limiting storage (in-memory for this example)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
      environment: ENVIRONMENT
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Helper function to classify priority
function classifyPriority(description: string, value?: number): {
  priority: string;
  reason: string;
  sla_seconds: number;
} {
  const d = (description || '').toLowerCase();
  if (/(inondation|refoulement|urgence)/.test(d)) return { priority: 'P1', reason: 'urgence_immediate', sla_seconds: 0 };
  if (/(municipalit|ville de)/.test(d)) return { priority: 'P2', reason: 'municipal', sla_seconds: 120 };
  if (/gainage/.test(d) || (typeof value === 'number' && value >= 3000)) return { priority: 'P3', reason: 'high_value', sla_seconds: 3600 };
  return { priority: 'P4', reason: 'standard', sla_seconds: 1800 };
}

// Process function calls from VAPI (unchanged from original - functionality preserved)
async function processFunction(name: string, args: any): Promise<any> {
  switch (name) {
    case 'validateServiceRequest': {
      const refused = ['fosse', 'piscine', 'goutti', 'puisard'].some(
        word => (args.service || '').toLowerCase().includes(word)
      );
      return {
        accepted: !refused,
        reason: refused ? 'service_not_offered' : 'service_available',
        message: refused ? "Désolé, ce service n'est pas dans notre offre." : "Parfait! On peut certainement vous aider avec ça."
      };
    }
    case 'calculateQuote': {
      const prices: Record<string, { min: number; max: number }> = {
        debouchage_camera: { min: 350, max: 650 },
        racines_alesage: { min: 450, max: 750 },
        gainage_installation: { min: 3900, max: 8000 },
        drain_francais: { min: 500, max: 800 }
      };
      const svc = prices[args.serviceType] || prices.debouchage_camera;
      return { min: svc.min, max: svc.max, message: `Le prix varie entre ${svc.min}$ et ${svc.max}$ plus taxes.` };
    }
    case 'classifyPriority': {
      return classifyPriority(args.description || '', args.estimatedValue);
    }
    case 'evaluateScheduling': {
      const windows: Record<string, string> = {
        drain_francais: '1 à 3 semaines',
        inspection: '1 à 2 semaines',
        gainage: '2 à 4 semaines',
        default: '3 à 5 jours ouvrables'
      };
      const w = windows[args.serviceType] || windows.default;
      return { window: w, canSchedule: true, message: `Nous pouvons planifier dans ${w}.` };
    }
    case 'sendSMSAlert': {
      // Extract client info and urgency from args
      const clientName = args.clientName || 'Non fourni';
      const clientPhone = args.clientPhone || 'Non fourni';
      const clientAddress = args.clientAddress || 'Non fournie';
      const clientCity = args.clientCity || '';
      const clientPostalCode = args.clientPostalCode || '';
      const problemDescription = args.problemDescription || args.description || 'Non spécifié';
      
      // Classify priority
      const priorityInfo = classifyPriority(problemDescription, args.estimatedValue);
      const priority = args.priority || priorityInfo.priority;
      
      // Create or update client in database
      let clientId: string | null = null;
      try {
        const { data: clientData, error: clientError } = await supabase.rpc('upsert_client', {
          p_phone: clientPhone,
          p_first_name: clientName.split(' ')[0] || null,
          p_last_name: clientName.split(' ').slice(1).join(' ') || null,
          p_address: clientAddress,
          p_city: clientCity,
          p_postal_code: clientPostalCode
        });
        if (!clientError && clientData) {
          clientId = clientData;
        }
      } catch (err) {
        console.error('Error upserting client:', err);
      }
      
      // Internal team numbers (these would be configured in environment)
      const INTERNAL_TEAM_NUMBERS = [
        '+14502803222' // For testing - would be replaced with actual team numbers
      ];
      
      // Build urgency-based message for internal team
      let urgencyPrefix = '';
      let urgencyEmoji = '';
      
      switch (priority) {
        case 'P1':
          urgencyPrefix = 'URGENCE IMMÉDIATE';
          urgencyEmoji = '🚨';
          break;
        case 'P2':
          urgencyPrefix = 'PRIORITÉ MUNICIPALE';
          urgencyEmoji = '⚠️';
          break;
        case 'P3':
          urgencyPrefix = 'SERVICE MAJEUR';
          urgencyEmoji = '🔧';
          break;
        default:
          urgencyPrefix = 'SERVICE STANDARD';
          urgencyEmoji = '📋';
      }
      
      // Compose message for internal team with client info
      const internalMessage = `${urgencyEmoji} ${urgencyPrefix} - Drain Fortin\n\n` +
        `CLIENT: ${clientName}\n` +
        `TÉL: ${clientPhone}\n` +
        `ADRESSE: ${clientAddress}\n` +
        `PROBLÈME: ${problemDescription}\n` +
        `PRIORITÉ: ${priority}\n` +
        `\nRappeler le client rapidement.`;
      
      // Create internal alert in database
      if (clientId) {
        try {
          const { data: alertData, error: alertError } = await supabase.rpc('create_internal_alert', {
            p_client_id: clientId,
            p_priority: priority,
            p_title: `${urgencyPrefix} - ${clientName}`,
            p_message: internalMessage,
            p_client_info: {
              name: clientName,
              phone: clientPhone,
              address: clientAddress,
              problem: problemDescription
            },
            p_call_id: args.callId || null
          });
          if (alertError) {
            console.error('Error creating alert:', alertError);
          }
        } catch (err) {
          console.error('Error creating internal alert:', err);
        }
      }
      
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
        return { sent: false, error: 'twilio_not_configured' };
      }
      
      const sids: string[] = [];
      const errors: string[] = [];
      const smsIds: string[] = [];
      
      // Send to all internal team members
      for (const teamNumber of INTERNAL_TEAM_NUMBERS) {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const body = new URLSearchParams();
        body.set('From', TWILIO_FROM);
        body.set('To', teamNumber);
        body.set('Body', internalMessage);
        const auth = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
        
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': auth, 'Content-Type': 'application/x-www-form-urlencoded' },
            body
          });
          
          if (!resp.ok) {
            const txt = await resp.text();
            errors.push(`Failed to send to ${teamNumber}: ${txt}`);
            
            // Log failed SMS to database
            if (clientId) {
              await supabase.from('sms_messages').insert({
                client_id: clientId,
                to_number: teamNumber,
                from_number: TWILIO_FROM,
                message: internalMessage,
                sms_type: 'alert_internal',
                priority: priority,
                urgency_level: priority === 'P1' ? 'immediate' : priority === 'P2' ? 'high' : 'medium',
                status: 'failed',
                error_message: txt
              });
            }
          } else {
            const json = await resp.json();
            if (json && json.sid) {
              sids.push(json.sid);
              
              // Log successful SMS to database
              if (clientId) {
                const { data: smsData, error: smsError } = await supabase.from('sms_messages').insert({
                  client_id: clientId,
                  call_id: args.callId || null,
                  to_number: teamNumber,
                  from_number: TWILIO_FROM,
                  message: internalMessage,
                  sms_type: 'alert_internal',
                  priority: priority,
                  urgency_level: priority === 'P1' ? 'immediate' : priority === 'P2' ? 'high' : 'medium',
                  twilio_sid: json.sid,
                  status: 'sent',
                  metadata: { twilio_response: json }
                }).select('id').single();
                
                if (smsData) {
                  smsIds.push(smsData.id);
                }
              }
            }
          }
        } catch (err) {
          errors.push(`Error sending to ${teamNumber}: ${err}`);
        }
      }
      
      return { 
        sent: sids.length > 0, 
        sids, 
        smsIds,
        clientId,
        priority,
        recipientsCount: INTERNAL_TEAM_NUMBERS.length,
        errors: errors.length > 0 ? errors : undefined
      };
    }
    default:
      return { error: 'Function not found', message: "Cette fonction n'est pas disponible." };
  }
}

// Enhanced main webhook handler with security
serve(async (req) => {
  const clientIp = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Security: Rate limiting
    if (!checkRateLimit(clientIp)) {
      await logSecurityEvent('rate_limit_exceeded', { ip: clientIp }, clientIp);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Security: Validate request method
    if (req.method !== 'POST') {
      await logSecurityEvent('invalid_method', { method: req.method, ip: clientIp }, clientIp);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Security: Validate content type
    const contentType = req.headers.get('content-type');
    if (!validateContentType(contentType)) {
      await logSecurityEvent('invalid_content_type', { contentType, ip: clientIp }, clientIp);
      return new Response(JSON.stringify({ error: 'Invalid content type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Security: Validate origin in production
    if (ENVIRONMENT === 'production' && !isOriginAllowed(origin)) {
      await logSecurityEvent('cors_violation', { origin, ip: clientIp }, clientIp);
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const raw = await req.text();
    
    // Security: Validate JSON payload
    let payload: VAPIWebhookPayload;
    try {
      payload = JSON.parse(raw || '{}');
    } catch (error) {
      await logSecurityEvent('invalid_json', { error: error.message, ip: clientIp }, clientIp);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Health-check: answer fast without HMAC requirement
    if (payload.type === 'health-check') {
      return new Response(JSON.stringify({ success: true, type: 'health-check' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Security: Verify signature in production
    if (ENVIRONMENT === 'production') {
      const signature = req.headers.get('x-vapi-signature') || '';
      if (!(await verifySignature(raw, signature, VAPI_WEBHOOK_SECRET || ''))) {
        await logSecurityEvent('invalid_signature', { 
          hasSignature: !!signature,
          hasSecret: !!VAPI_WEBHOOK_SECRET,
          ip: clientIp 
        }, clientIp);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Process webhook events (unchanged from original - functionality preserved)
    switch (payload.type) {
      case 'call-started': {
        if (payload.call) {
          const { error } = await supabase.from('vapi_calls').upsert({
            call_id: payload.call.id,
            assistant_id: payload.call.assistantId,
            status: 'active',
            started_at: payload.call.startedAt || new Date().toISOString()
          }, { onConflict: 'call_id' });
          if (error) console.error('upsert vapi_calls error', error);
        }
        break;
      }
      case 'call-ended': {
        if (payload.call) {
          const structured = payload.call.analysis?.structuredData || {};
          const pr = classifyPriority(structured.description || '', structured.estimatedValue);
          const { error } = await supabase.from('vapi_calls').update({
            status: 'completed',
            ended_at: payload.call.endedAt || new Date().toISOString(),
            call_duration: payload.call.duration,
            analysis: payload.call.analysis || {},
            customer_name: structured.nom || null,
            customer_email: structured.courriel || null,
            address: structured.adresse || null,
            postal_code: structured.codePostal || null,
            problem_description: structured.description || null,
            priority: pr.priority,
            priority_reason: pr.reason,
            sla_seconds: pr.sla_seconds
          }).eq('call_id', payload.call.id);
          if (error) console.error('update vapi_calls error', error);
        }
        break;
      }
      case 'tool-calls': {
        if (payload.toolCalls && payload.call) {
          for (const toolCall of payload.toolCalls) {
            const { error } = await supabase.from('tool_calls').insert({
              call_id: payload.call.id,
              tool_name: toolCall.function.name,
              tool_call_id: toolCall.toolCallId,
              arguments: toolCall.function.arguments,
              timestamp: new Date().toISOString()
            });
            if (error) console.error('insert tool_calls error', error);
          }
        }
        break;
      }
      case 'transcript': {
        if (payload.transcript && payload.call) {
          const { error } = await supabase.from('call_transcripts').insert({
            call_id: payload.call.id,
            role: payload.transcript.role === 'user' ? 'user' : 'assistant',
            message: payload.transcript.transcript,
            confidence: payload.transcript.confidence,
            timestamp: payload.transcript.timestamp || new Date().toISOString()
          });
          if (error) console.error('insert call_transcripts error', error);
        }
        break;
      }
      case 'function-call': {
        if (payload.toolCalls) {
          const results = [] as any[];
          for (const toolCall of payload.toolCalls) {
            const result = await processFunction(toolCall.function.name, toolCall.function.arguments);
            results.push({ toolCallId: toolCall.toolCallId, result });
          }
          return new Response(JSON.stringify({ results }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ success: true, type: payload.type || 'unknown' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error', error);
    await logSecurityEvent('webhook_error', { 
      error: error.message,
      ip: clientIp 
    }, clientIp);
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});