// Deno Edge Function for VAPI Webhook
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

// Environment variables (with fallbacks and safe defaults)
// VAPI server secret can be provided under either name
const VAPI_SERVER_SECRET: string =
  Deno.env.get('VAPI_SERVER_SECRET') ??
  Deno.env.get('VAPI_WEBHOOK_SECRET') ??
  ''

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? ''

// Rate limiting storage
const rateLimitMap = new Map<string, number[]>()

// Validate HMAC signature
async function validateHMAC(payload: string, signatureHeader: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()

    // Support both raw hex and prefixes like "sha256=<hex>"
    const hex = (signatureHeader || '').toLowerCase().replace(/^sha256=/, '')

    // Validate hex format (64 hex chars for sha256)
    if (!/^[0-9a-f]{64}$/.test(hex)) return false

    if (!VAPI_SERVER_SECRET) return false

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(VAPI_SERVER_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Convert hex string to bytes
    const sigBytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))

    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(payload)
    )
  } catch (_err) {
    // On any error, treat as invalid rather than crashing
    return false
  }
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
    // Validate required environment variables early
    const missing: string[] = []
    if (!VAPI_SERVER_SECRET) missing.push('VAPI_SERVER_SECRET or VAPI_WEBHOOK_SECRET')
    if (!SUPABASE_URL) missing.push('SUPABASE_URL')
    if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    if (missing.length) {
      console.error('Missing required environment variables:', missing.join(', '))
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables', missing }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client lazily after env validation
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
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
    const isValid = await validateHMAC(payload, signature)
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse JSON safely
    let data: any
    try {
      data = JSON.parse(payload || '{}')
    } catch (_e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize message shape (support both top-level {type} and {message:{type}})
    const message = (data && data.message) ? data.message : { type: data?.type }

    // Health-check fast path
    if (message?.type === 'health-check') {
      return new Response(
        JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process different message types
    switch (message?.type) {
      case 'end-of-call-report': {
        // Save to database
        const { error } = await supabase
          .from('call_logs')
          .insert({
            call_id: message.call?.id ?? null,
            phone_number: message.call?.customer?.number ?? null,
            duration: message.call?.endedAt && message.call?.startedAt
              ? Math.floor((new Date(message.call.endedAt).getTime() - new Date(message.call.startedAt).getTime()) / 1000)
              : 0,
            status: message.endedReason || 'completed',
            transcript: message.transcript ?? null,
            summary: message.summary ?? null,
            analysis: message.analysis ?? null,
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
        const toolResponse = await processToolCalls(message.toolCalls || [])
        return new Response(
          JSON.stringify(toolResponse),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'status-update':
      case 'transcript':
        // Log these for monitoring
        console.log(`Received ${message?.type}:`, message)
        break

      default:
        console.log('Unknown message type:', message?.type)
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

// Send SMS via Brevo
async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (!BREVO_API_KEY || BREVO_API_KEY === 'YOUR_BREVO_KEY_HERE') {
    console.log('SMS would be sent to:', phone, message)
    return true // Simulate success in development
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: 'DrainFortin',
        recipient: phone,
        content: message,
        type: 'transactional'
      })
    })

    return response.ok
  } catch (error) {
    console.error('SMS sending failed:', error)
    return false
  }
}

// Process tool calls
async function processToolCalls(toolCalls: any[]): Promise<any> {
  const results = []
  
  for (const call of toolCalls) {
    const args = call.function?.arguments || {}
    
    switch (call.function?.name) {
      case 'validateServiceRequest': {
        const serviceType = args.serviceType
        const acceptedServices = [
          'debouchage', 'camera_inspection', 'racines_alesage', 
          'gainage', 'drain_francais', 'installation_cheminee', 'sous_dalle'
        ]
        const rejectedServices = [
          'fosses_septiques', 'piscines', 'goutieres', 
          'vacuum_aspiration', 'puisard'
        ]
        
        const isAccepted = acceptedServices.includes(serviceType)
        const isRejected = rejectedServices.includes(serviceType)
        
        results.push({
          toolCallId: call.id,
          result: {
            serviceAccepted: isAccepted,
            serviceRejected: isRejected,
            message: isAccepted 
              ? `✅ Nous offrons ce service: ${serviceType}`
              : isRejected 
                ? `❌ Désolé, nous ne faisons pas: ${serviceType}`
                : `❓ Service non reconnu: ${serviceType}`
          }
        })
        break
      }
        
      case 'calculateQuote': {
        const { serviceType, location, urgency, complexity } = args
        
        // Base prices (minimum 350$)
        const basePrices = {
          'debouchage': { min: 350, max: 650 },
          'camera_inspection': { min: 350, max: 350 },
          'racines_alesage': { min: 450, max: 750 },
          'gainage': { min: 350, max: 750 }, // First visit only
          'drain_francais': { min: 500, max: 800 },
          'installation_cheminee': { min: 2500, max: 2500 },
          'sous_dalle': { min: 350, max: 1000 }
        }
        
        const basePrice = basePrices[serviceType] || { min: 350, max: 500 }
        let estimatedPrice = basePrice.min
        
        // Location adjustments
        if (location === 'rive_sud') {
          estimatedPrice += 100
        }
        
        // Urgency surcharge
        if (urgency) {
          estimatedPrice += 75
        }
        
        // Complexity adjustment
        if (complexity === 'complex') {
          estimatedPrice = Math.round(estimatedPrice * 1.3)
        } else if (complexity === 'very_complex') {
          estimatedPrice = Math.round(estimatedPrice * 1.6)
        }
        
        const priceRange = {
          min: Math.max(estimatedPrice, 350),
          max: Math.max(Math.round(estimatedPrice * 1.5), basePrice.max)
        }
        
        results.push({
          toolCallId: call.id,
          result: {
            serviceType,
            location,
            basePrice: basePrice.min,
            adjustments: {
              riveSud: location === 'rive_sud' ? 100 : 0,
              urgency: urgency ? 75 : 0,
              complexity: complexity || 'standard'
            },
            estimatedPrice: priceRange,
            message: `Estimation: ${priceRange.min}$ à ${priceRange.max}$ + taxes`,
            note: 'Prix minimum 350$ + taxes pour tout déplacement'
          }
        })
        break
      }
        
      case 'sendSMSAlert': {
        const { priority, customerInfo, recipient } = args
        
        // Determine SMS recipients
        const smsTargets = []
        if (recipient === 'guillaume' || recipient === 'both') {
          smsTargets.push({
            name: 'Guillaume',
            phone: '+15145296037' // From .env
          })
        }
        if ((recipient === 'maxime' || recipient === 'both') && 
            customerInfo.serviceType === 'sous_dalle') {
          smsTargets.push({
            name: 'Maxime', 
            phone: '+15146175425' // From .env
          })
        }
        
        // Format SMS message
        const urgencyEmoji = { P1: '🚨', P2: '⚡', P3: '📞', P4: '📝' }
        const smsMessage = `${urgencyEmoji[priority]} ${priority} - Drain Fortin\n` +
          `Client: ${customerInfo.name}\n` +
          `Tél: ${customerInfo.phone}\n` +
          `Service: ${customerInfo.serviceType}\n` +
          `Adresse: ${customerInfo.address || 'À confirmer'}\n` +
          `Description: ${customerInfo.description || 'Voir appel'}`
        
        // Send SMS to targets
        const smsResults = []
        for (const target of smsTargets) {
          const success = await sendSMS(target.phone, smsMessage)
          smsResults.push({
            recipient: target.name,
            phone: target.phone,
            success
          })
        }
        
        // Log to database
        const { error } = await supabase
          .from('sms_logs')
          .insert({
            priority,
            customer_name: customerInfo.name,
            customer_phone: customerInfo.phone,
            service_type: customerInfo.serviceType,
            message: smsMessage,
            recipients: smsResults,
            sent_at: new Date().toISOString()
          })
        
        results.push({
          toolCallId: call.id,
          result: {
            priority,
            smsResults,
            message: `SMS ${priority} envoyé à ${smsResults.length} destinataire(s)`,
            success: smsResults.some(r => r.success),
            dbLogged: !error
          }
        })
        break
      }
      
      // Legacy functions for backward compatibility
      case 'checkAvailability':
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
          error: `Unknown function: ${call.function?.name}`
        })
    }
  }
  
  return { results }
}
