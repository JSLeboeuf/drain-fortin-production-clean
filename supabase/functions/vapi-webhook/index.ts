// Deno Edge Function for VAPI Webhook
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

const VAPI_SERVER_SECRET = Deno.env.get('VAPI_SERVER_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Rate limiting storage
const rateLimitMap = new Map<string, number[]>()

// Validate HMAC signature
async function validateHMAC(payload: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(VAPI_SERVER_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  
  const signatureBuffer = Uint8Array.from(
    signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  )
  
  return await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBuffer,
    encoder.encode(payload)
  )
}

// Check rate limit
function isRateLimited(clientIp: string): boolean {
  const now = Date.now()
  const windowMs = 60000 // 1 minute
  const maxRequests = 10
  
  const timestamps = rateLimitMap.get(clientIp) || []
  const recentRequests = timestamps.filter(t => now - t < windowMs)
  
  if (recentRequests.length >= maxRequests) {
    return true
  }
  
  recentRequests.push(now)
  rateLimitMap.set(clientIp, recentRequests)
  return false
}

// Main handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get client IP
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
    
    // Check rate limit
    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate HMAC
    const signature = req.headers.get('x-vapi-signature')
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = await req.text()
    const isValid = await validateHMAC(payload, signature.replace('sha256=', ''))
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = JSON.parse(payload)
    const { message } = data

    // Process different message types
    switch (message.type) {
      case 'end-of-call-report': {
        // Save to database
        const { error } = await supabase
          .from('call_logs')
          .insert({
            call_id: message.call?.id,
            phone_number: message.call?.customer?.number,
            duration: message.call?.endedAt && message.call?.startedAt
              ? Math.floor((new Date(message.call.endedAt).getTime() - new Date(message.call.startedAt).getTime()) / 1000)
              : 0,
            status: message.endedReason || 'completed',
            transcript: message.transcript,
            summary: message.summary,
            analysis: message.analysis,
            tool_calls: message.toolCalls || [],
            created_at: new Date().toISOString()
          })

        if (error) {
          console.error('Database error:', error)
          return new Response(
            JSON.stringify({ error: 'Database error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Send notification if needed
        if (message.analysis?.requiresFollowUp) {
          // TODO: Send SMS via Brevo
        }

        break
      }

      case 'tool-calls': {
        // Handle tool calls
        const toolResponse = await processToolCalls(message.toolCalls)
        return new Response(
          JSON.stringify(toolResponse),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'status-update':
      case 'transcript':
        // Log these for monitoring
        console.log(`Received ${message.type}:`, message)
        break

      default:
        console.log('Unknown message type:', message.type)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Process tool calls
async function processToolCalls(toolCalls: any[]): Promise<any> {
  const results = []
  
  for (const call of toolCalls) {
    switch (call.function?.name) {
      case 'checkAvailability':
        // Check availability in database
        const { data } = await supabase
          .from('availability')
          .select('*')
          .gte('date', new Date().toISOString())
          .limit(5)
        
        results.push({
          toolCallId: call.id,
          result: data || []
        })
        break
        
      case 'bookAppointment':
        // Book appointment
        const { error } = await supabase
          .from('appointments')
          .insert(call.function.arguments)
        
        results.push({
          toolCallId: call.id,
          result: error ? { error: error.message } : { success: true }
        })
        break
        
      default:
        results.push({
          toolCallId: call.id,
          error: 'Unknown function'
        })
    }
  }
  
  return { results }
}