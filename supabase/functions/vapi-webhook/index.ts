// Deno Edge Function for VAPI Webhook - Production Ready
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

// Error codes for structured responses
const ERROR_CODES = {
  MISSING_SIGNATURE: 'MISSING_SIGNATURE',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INVALID_JSON: 'INVALID_JSON',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_ENV: 'INVALID_ENV'
} as const

// Rate limiting storage
const rateLimitMap = new Map<string, number[]>()

// Main handler
serve(async (req) => {
  // Validate environment variables first
  const VAPI_SECRET = Deno.env.get('VAPI_SERVER_SECRET') || Deno.env.get('VAPI_WEBHOOK_SECRET')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!VAPI_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ 
        error: { 
          code: ERROR_CODES.INVALID_ENV, 
          message: 'Missing required environment variables' 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Create Supabase client after env validation
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  // Check signature before any parsing (GET or POST without signature)
  const signatureHeader = req.headers.get('x-vapi-signature')
  if (!signatureHeader) {
    return new Response(
      JSON.stringify({ 
        error: { 
          code: ERROR_CODES.MISSING_SIGNATURE, 
          message: 'Missing x-vapi-signature header' 
        } 
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Parse signature - support multiple formats
  const raw = signatureHeader.toLowerCase()
  const hex = raw.replace(/^(?:hmac-)?sha256=/, '')
  
  // Validate hex format (64 chars)
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    return new Response(
      JSON.stringify({ 
        error: { 
          code: ERROR_CODES.INVALID_SIGNATURE, 
          message: 'Invalid signature format' 
        } 
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Read payload with size limit
    const payload = await req.text()
    
    // Check payload size (1MB limit)
    if (payload.length > 1_048_576) {
      return new Response(
        JSON.stringify({ 
          error: { 
            code: ERROR_CODES.PAYLOAD_TOO_LARGE, 
            message: 'Payload exceeds 1MB limit' 
          } 
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate HMAC
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(VAPI_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    
    const signatureBuffer = Uint8Array.from(
      hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    )
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(payload)
    )
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ 
          error: { 
            code: ERROR_CODES.INVALID_SIGNATURE, 
            message: 'Invalid HMAC signature' 
          } 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse JSON safely
    let data: any
    try {
      data = JSON.parse(payload)
    } catch {
      return new Response(
        JSON.stringify({ 
          error: { 
            code: ERROR_CODES.INVALID_JSON, 
            message: 'Invalid JSON payload' 
          } 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Support both nested and top-level message type
    const message = data?.message ?? { type: data?.type }
    
    // Fast-path health check
    if (message?.type === 'health-check') {
      return new Response(
        JSON.stringify({ 
          status: 'healthy', 
          timestamp: new Date().toISOString() 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting (configurable)
    const RATE_LIMIT_DISABLED = Deno.env.get('RATE_LIMIT_DISABLED') === 'true'
    const MAX_REQUESTS = parseInt(Deno.env.get('RATE_LIMIT_MAX_REQUESTS') || '100')
    const WINDOW_SECONDS = parseInt(Deno.env.get('RATE_LIMIT_WINDOW_SECONDS') || '60')
    
    if (!RATE_LIMIT_DISABLED) {
      const clientIp = req.headers.get('x-forwarded-for') || 
                       req.headers.get('cf-connecting-ip') || 
                       'unknown'
      
      const now = Date.now()
      const windowMs = WINDOW_SECONDS * 1000
      const timestamps = rateLimitMap.get(clientIp) || []
      const recentRequests = timestamps.filter(t => now - t < windowMs)
      
      if (recentRequests.length >= MAX_REQUESTS) {
        return new Response(
          JSON.stringify({ 
            error: { 
              code: ERROR_CODES.TOO_MANY_REQUESTS, 
              message: `Rate limit exceeded: ${MAX_REQUESTS} requests per ${WINDOW_SECONDS} seconds` 
            } 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      recentRequests.push(now)
      rateLimitMap.set(clientIp, recentRequests)
    }

    // Process different message types
    switch (message.type) {
      case 'end-of-call-report': {
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
            JSON.stringify({ 
              error: { 
                code: ERROR_CODES.INTERNAL_ERROR, 
                message: 'Database operation failed' 
              } 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }

      case 'tool-calls': {
        const toolResponse = await processToolCalls(message.toolCalls, supabase)
        return new Response(
          JSON.stringify(toolResponse),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'status-update':
      case 'transcript':
        // Minimal logging for non-sensitive events
        break

      default:
        // Unknown message type - log but don't fail
        break
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ 
        error: { 
          code: ERROR_CODES.INTERNAL_ERROR, 
          message: 'Internal server error' 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Send SMS function (updated for E.164 format)
async function sendSMS(phone: string, message: string): Promise<boolean> {
  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
  const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
  
  // Ensure E.164 format
  const e164Phone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log('SMS simulation (missing credentials):', e164Phone)
    return true
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: e164Phone,
          Body: message
        })
      }
    )
    return response.ok
  } catch (error) {
    console.error('SMS sending failed:', error)
    return false
  }
}

// Process tool calls (updated with corrected business rules)
async function processToolCalls(toolCalls: any[], supabase: any): Promise<any> {
  const results = []
  
  for (const call of toolCalls) {
    const args = call.function?.arguments || {}
    
    switch (call.function?.name) {
      case 'validateServiceRequest': {
        // Accept both args.service and args.serviceType
        const serviceType = args.service || args.serviceType
        
        const acceptedServices = [
          'debouchage', 'camera_inspection', 'racines_alesage', 
          'gainage', 'drain_francais', 'installation_cheminee', 'sous_dalle'
        ]
        
        const rejectedServices = [
          'vacuum_aspiration', 'fosses_septiques', 'piscines', 
          'gouttieres', 'vidage_bac_garage'
          // Note: exception for drain desservant bac would be handled by agent logic
        ]
        
        const isAccepted = acceptedServices.includes(serviceType)
        const isRejected = rejectedServices.includes(serviceType)
        
        results.push({
          toolCallId: call.id,
          result: {
            accepted: isAccepted,
            reason: isRejected ? 'service_not_offered' : (isAccepted ? 'service_offered' : 'unknown_service'),
            message: isAccepted 
              ? `Nous offrons ce service: ${serviceType}`
              : isRejected 
                ? `Désolé, nous ne faisons pas: ${serviceType}`
                : `Service non reconnu: ${serviceType}`
          }
        })
        break
      }
        
      case 'calculateQuote': {
        const { 
          serviceType, 
          location, 
          urgency, 
          complexity,
          lengthFeet, // For gainage
          gps,
          chimneyInstallPossible
        } = args
        
        // Base prices with updated minimums
        const basePrices: { [key: string]: { min: number, max: number } } = {
          'debouchage': { min: 350, max: 650 },
          'camera_inspection': { min: 350, max: 350 },
          'racines_alesage': { min: 450, max: 750 },
          'gainage': { min: 3900, max: 6000 }, // Base price for 10 feet
          'drain_francais': { min: 500, max: 800 },
          'drain_toit': { min: 450, max: 650 },
          'installation_cheminee': { min: 2500, max: 2500 },
          'sous_dalle': { min: 350, max: 1000 }
        }
        
        const basePrice = basePrices[serviceType] || { min: 350, max: 500 }
        let estimatedPrice = basePrice.min
        let adjustments: any = {}
        
        // Special gainage calculation
        if (serviceType === 'gainage' && lengthFeet) {
          // Base: 3900$ for 10 feet, +90$ per additional foot
          const baseFeet = 10
          const additionalFeet = Math.max(0, lengthFeet - baseFeet)
          estimatedPrice = 3900 + (additionalFeet * 90)
          adjustments.gainageLength = `${lengthFeet} pieds`
        }
        
        // Location adjustment (Rive-Sud +100$)
        if (location === 'rive_sud') {
          estimatedPrice += 100
          adjustments.riveSud = 100
        }
        
        // Urgency surcharge (+75$)
        if (urgency) {
          estimatedPrice += 75
          adjustments.urgency = 75
        }
        
        // GPS tracking (+50$)
        if (gps) {
          estimatedPrice += 50
          adjustments.gps = 50
        }
        
        // Complexity adjustment
        if (complexity === 'complex') {
          estimatedPrice = Math.round(estimatedPrice * 1.3)
          adjustments.complexity = 'complex (×1.3)'
        } else if (complexity === 'very_complex') {
          estimatedPrice = Math.round(estimatedPrice * 1.6)
          adjustments.complexity = 'very_complex (×1.6)'
        }
        
        // Chimney credit (-150$ if installation not possible)
        if (chimneyInstallPossible === false && serviceType === 'drain_francais') {
          estimatedPrice -= 150
          adjustments.chimneyCredit = -150
        }
        
        // Ensure minimum 350$ + taxes
        estimatedPrice = Math.max(estimatedPrice, 350)
        
        const priceRange = {
          min: estimatedPrice,
          max: Math.max(Math.round(estimatedPrice * 1.5), basePrice.max)
        }
        
        results.push({
          toolCallId: call.id,
          result: {
            serviceType,
            location,
            basePrice: basePrice.min,
            adjustments,
            estimatedPrice: priceRange,
            message: `Estimation: ${priceRange.min}$ à ${priceRange.max}$ + taxes`,
            note: 'Prix minimum 350$ + taxes pour tout déplacement'
          }
        })
        break
      }
        
      case 'sendSMSAlert': {
        const { priority, customerInfo, recipient } = args
        
        // Phone mapping (E.164 format)
        const phoneMapping: { [key: string]: string } = {
          guillaume: Deno.env.get('GUILLAUME_PHONE') || '+15145296037',
          maxime: Deno.env.get('MAXIME_PHONE') || '+15146175425'
        }
        
        // Determine SMS recipients
        const smsTargets = []
        if (recipient === 'guillaume' || recipient === 'both') {
          smsTargets.push({
            name: 'Guillaume',
            phone: phoneMapping.guillaume
          })
        }
        if ((recipient === 'maxime' || recipient === 'both') && 
            customerInfo.serviceType === 'sous_dalle') {
          smsTargets.push({
            name: 'Maxime',
            phone: phoneMapping.maxime
          })
        }
        
        // Format SMS message
        const urgencyEmoji: { [key: string]: string } = { 
          P1: '🚨', P2: '⚡', P3: '📞', P4: '📝' 
        }
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
        
        // Log to database with detailed info
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