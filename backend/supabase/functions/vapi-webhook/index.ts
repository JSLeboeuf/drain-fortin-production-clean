import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

// Environment variables
// Supabase injects SUPABASE_URL automatically. Service key must be provided via secret
// Note: secrets cannot start with SUPABASE_* in Edge Functions. Use SERVICE_ROLE_KEY instead.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPI_WEBHOOK_SECRET = Deno.env.get('VAPI_WEBHOOK_SECRET');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TWILIO_FROM = Deno.env.get('TWILIO_FROM') || Deno.env.get('TWILIO_PHONE_NUMBER') || '';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

// Helper function to verify HMAC signature
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!secret || !signature) return false;
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
    // hex-encode to compare to common hex signature
    const hex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const expected = signature.replace(/^hmac-sha256=/, '').toLowerCase();
    if (hex.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
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

// Process function calls from VAPI
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
      const pr = (args.priority || '').toString();
      const message: string = (args.message || '').toString();
      let dest: string[] = [];
      if (Array.isArray(args.phoneNumbers)) dest = args.phoneNumbers.map((x: any) => String(x));
      else if (typeof args.phoneNumbers === 'string') dest = [args.phoneNumbers];
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
        return { sent: false, error: 'twilio_not_configured' };
      }
      const sids: string[] = [];
      for (const to of dest) {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const body = new URLSearchParams();
        body.set('From', TWILIO_FROM);
        body.set('To', to);
        body.set('Body', message);
        const auth = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': auth, 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });
        if (!resp.ok) {
          const txt = await resp.text();
          return { sent: false, error: 'twilio_send_failed', status: resp.status, body: txt };
        }
        const json = await resp.json();
        if (json && json.sid) sids.push(json.sid);
      }
      return { sent: true, sids, priority: pr };
    }
    default:
      return { error: 'Function not found', message: "Cette fonction n'est pas disponible." };
  }
}

// Main webhook handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const raw = await req.text();
    const payload: VAPIWebhookPayload = JSON.parse(raw || '{}');

    // Health-check: answer fast without HMAC requirement
    if (payload.type === 'health-check') {
      return new Response(JSON.stringify({ success: true, type: 'health-check' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify signature in production
    if (Deno.env.get('ENVIRONMENT') === 'production') {
      const signature = req.headers.get('x-vapi-signature') || '';
      if (!(await verifySignature(raw, signature, VAPI_WEBHOOK_SECRET || ''))) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

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
          return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ success: true, type: payload.type || 'unknown' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
