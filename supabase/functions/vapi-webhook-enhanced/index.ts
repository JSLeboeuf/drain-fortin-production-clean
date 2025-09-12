// Enhanced VAPI Webhook with Knowledge Base Tools
// Implements VAPI Best Practices for Dynamic Information Retrieval

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

const VAPI_SERVER_SECRET = Deno.env.get('VAPI_SERVER_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Rate limiting
const rateLimitMap = new Map<string, number[]>()

// HMAC validation
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

// Enhanced tool processing with knowledge base
async function processToolCalls(toolCalls: any[]): Promise<any> {
  const results = []
  
  for (const call of toolCalls) {
    const args = call.function?.arguments || {}
    
    switch (call.function?.name) {
      
      // ========== NEW KNOWLEDGE BASE TOOLS ==========
      
      case 'searchWebsiteInfo': {
        const { category, query } = args
        
        try {
          // Search in knowledge base
          const { data, error } = await supabase
            .from('website_knowledge')
            .select('*')
            .eq('category', category)
            .textSearch('search_text', query)
            .limit(1)
            .single()
          
          if (error || !data) {
            // Fallback to cached responses
            const fallbackInfo = getFallbackInfo(category, query)
            results.push({
              toolCallId: call.id,
              result: {
                found: false,
                category,
                information: fallbackInfo,
                source: "Cache local",
                needsUpdate: true
              }
            })
          } else {
            results.push({
              toolCallId: call.id,
              result: {
                found: true,
                category,
                information: data.content,
                source: "drainfortin.ca",
                lastUpdated: data.updated_at
              }
            })
          }
        } catch (err) {
          console.error('searchWebsiteInfo error:', err)
          results.push({
            toolCallId: call.id,
            result: {
              found: false,
              error: "Erreur de recherche",
              category,
              query
            }
          })
        }
        break
      }
      
      case 'getServiceDetails': {
        const { service, includeGuarantee } = args
        
        try {
          // Get enhanced service details
          const { data } = await supabase
            .from('service_details')
            .select('*')
            .eq('service_type', service)
            .single()
          
          // Combine with static pricing
          const staticPrices = {
            'debouchage': { min: 350, max: 650 },
            'camera_inspection': { min: 350, max: 350 },
            'racines_alesage': { min: 450, max: 750 },
            'gainage': { min: 350, max: 750 },
            'drain_francais': { min: 500, max: 800 },
            'installation_cheminee': { min: 2500, max: 2500 },
            'sous_dalle': { min: 350, max: 1000 }
          }
          
          results.push({
            toolCallId: call.id,
            result: {
              service,
              pricing: staticPrices[service] || { min: 350, max: 500 },
              description: data?.description || getDefaultDescription(service),
              process: data?.process || null,
              duration: data?.typical_duration || "Variable selon le projet",
              guarantee: includeGuarantee ? (data?.guarantee || getDefaultGuarantee(service)) : null,
              certifications: data?.required_certs || ["RBQ", "CMMTQ"],
              important: service === 'debouchage' 
                ? "Tous nos services débutent par l'inspection caméra incluse"
                : null
            }
          })
        } catch (err) {
          console.error('getServiceDetails error:', err)
          results.push({
            toolCallId: call.id,
            result: {
              service,
              error: "Détails temporairement indisponibles"
            }
          })
        }
        break
      }
      
      case 'checkServiceArea': {
        const { city, postalCode } = args
        
        try {
          // Check if area is serviced
          let query = supabase
            .from('service_areas')
            .select('*')
          
          if (city) {
            query = query.ilike('city', `%${city}%`)
          }
          if (postalCode) {
            query = query.contains('postal_codes', [postalCode])
          }
          
          const { data } = await query.single()
          
          if (data) {
            const surcharge = data.zone === 'rive_sud' ? 100 : 0
            results.push({
              toolCallId: call.id,
              result: {
                serviced: true,
                city: data.city,
                zone: data.zone,
                surcharge,
                responseTime: data.typical_response_time || "2-4 heures",
                message: `Oui, nous desservons ${data.city}${surcharge ? ` avec un frais de déplacement de ${surcharge}$ pour la Rive-Sud` : ''}.`
              }
            })
          } else {
            // Check if it's a known unserviced area
            const knownUnserviced = ['ottawa', 'quebec', 'sherbrooke', 'trois-rivieres']
            const isKnownUnserviced = knownUnserviced.some(u => city.toLowerCase().includes(u))
            
            results.push({
              toolCallId: call.id,
              result: {
                serviced: !isKnownUnserviced,
                city,
                zone: 'unknown',
                surcharge: 0,
                message: isKnownUnserviced 
                  ? `Désolé, nous ne desservons pas ${city}. Nous couvrons le Grand Montréal seulement.`
                  : `Je dois vérifier si nous desservons ${city}. Puis-je avoir votre code postal pour confirmer?`
              }
            })
          }
        } catch (err) {
          console.error('checkServiceArea error:', err)
          results.push({
            toolCallId: call.id,
            result: {
              serviced: 'unknown',
              error: "Impossible de vérifier la zone actuellement"
            }
          })
        }
        break
      }
      
      case 'getCompanyInfo': {
        const { infoType } = args // 'certifications', 'hours', 'contact', 'warranty'
        
        try {
          const { data } = await supabase
            .from('company_info')
            .select('*')
            .eq('info_type', infoType)
            .single()
          
          results.push({
            toolCallId: call.id,
            result: {
              infoType,
              data: data?.content || getDefaultCompanyInfo(infoType),
              lastUpdated: data?.updated_at
            }
          })
        } catch (err) {
          results.push({
            toolCallId: call.id,
            result: {
              infoType,
              data: getDefaultCompanyInfo(infoType)
            }
          })
        }
        break
      }
      
      // ========== EXISTING TOOLS (UNCHANGED) ==========
      
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
        
        const basePrices = {
          'debouchage': { min: 350, max: 650 },
          'camera_inspection': { min: 350, max: 350 },
          'racines_alesage': { min: 450, max: 750 },
          'gainage': { min: 350, max: 750 },
          'drain_francais': { min: 500, max: 800 },
          'installation_cheminee': { min: 2500, max: 2500 },
          'sous_dalle': { min: 350, max: 1000 }
        }
        
        const basePrice = basePrices[serviceType] || { min: 350, max: 500 }
        let estimatedPrice = basePrice.min
        
        if (location === 'rive_sud') {
          estimatedPrice += 100
        }
        
        // NO urgency surcharge per contract
        // if (urgency) { estimatedPrice += 75 }
        
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
              urgency: 0, // Always 0 per contract
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
        
        const smsTargets = []
        if (recipient === 'guillaume' || recipient === 'both') {
          smsTargets.push({
            name: 'Guillaume',
            phone: Deno.env.get('GUILLAUME_PHONE') || '+14502803222'
          })
        }
        if ((recipient === 'maxime' || recipient === 'both') && 
            customerInfo.serviceType === 'sous_dalle') {
          smsTargets.push({
            name: 'Maxime',
            phone: Deno.env.get('MAXIME_PHONE') || '+15146175425'
          })
        }
        
        const urgencyEmoji = { P1: '🚨', P2: '⚡', P3: '📞', P4: '📝' }
        const smsMessage = `${urgencyEmoji[priority]} ${priority} - Drain Fortin\n` +
          `Client: ${customerInfo.name}\n` +
          `Tél: ${customerInfo.phone}\n` +
          `Service: ${customerInfo.serviceType}\n` +
          `Adresse: ${customerInfo.address || 'À confirmer'}\n` +
          `Description: ${customerInfo.description || 'Voir appel'}`
        
        const smsResults = []
        for (const target of smsTargets) {
          const success = await sendSMS(target.phone, smsMessage)
          smsResults.push({
            recipient: target.name,
            phone: target.phone,
            success
          })
        }
        
        await supabase
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
            message: `SMS ${priority} envoyé`,
            success: smsResults.some(r => r.success)
          }
        })
        break
      }
      
      default:
        results.push({
          toolCallId: call.id,
          error: `Unknown function: ${call.function?.name}`
        })
    }
  }
  
  return { results }
}

// Fallback information when database is unavailable
function getFallbackInfo(category: string, query: string): string {
  const fallbacks = {
    zones: "Nous desservons le Grand Montréal incluant Montréal, Laval, Rive-Sud et Rive-Nord.",
    services: "Débouchage, inspection caméra, enlèvement de racines, gainage, drain français.",
    garanties: "Garanties variables selon le service. Contactez-nous pour les détails.",
    certifications: "Entreprise certifiée RBQ et membre CMMTQ.",
    horaires: "6h à 15h du lundi au vendredi, parfois le samedi."
  }
  return fallbacks[category] || "Information temporairement indisponible."
}

function getDefaultDescription(service: string): string {
  const descriptions = {
    debouchage: "Service de débouchage professionnel avec inspection caméra incluse.",
    gainage: "Installation de gaine structurale pour réhabilitation de conduites.",
    racines_alesage: "Enlèvement de racines par alésage mécanique.",
    drain_francais: "Nettoyage et entretien de drain français."
  }
  return descriptions[service] || "Service professionnel de plomberie."
}

function getDefaultGuarantee(service: string): string {
  const guarantees = {
    gainage: "25 ans sur les matériaux, 5 ans main d'œuvre",
    debouchage: "30 jours satisfaction",
    drain_francais: "10 ans étanchéité"
  }
  return guarantees[service] || "Garantie selon les normes de l'industrie"
}

function getDefaultCompanyInfo(infoType: string): any {
  const info = {
    certifications: {
      rbq: "À confirmer",
      cmmtq: "Membre actif",
      certifications: ["RBQ", "CMMTQ", "APCHQ"]
    },
    hours: {
      regular: "6h00 à 15h00",
      days: "Lundi au vendredi",
      weekend: "Samedi sur demande",
      emergency: "Service d'urgence 24/7 via agent IA"
    },
    contact: {
      phone: "438-900-4385",
      email: "estimation@drainfortin.ca",
      website: "drainfortin.ca"
    },
    warranty: {
      general: "Garanties complètes sur tous nos services",
      details: "Variables selon le type de service"
    }
  }
  return info[infoType] || {}
}

// SMS sending function
async function sendSMS(phone: string, message: string): Promise<boolean> {
  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
  const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.log('SMS simulation:', phone, message)
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
          From: TWILIO_PHONE_NUMBER || '+14389004385',
          To: phone,
          Body: message
        })
      }
    )
    
    return response.ok
  } catch (error) {
    console.error('SMS error:', error)
    return false
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
    
    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    switch (message.type) {
      case 'tool-calls': {
        const toolResponse = await processToolCalls(message.toolCalls)
        return new Response(
          JSON.stringify(toolResponse),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      case 'end-of-call-report': {
        await supabase
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
        break
      }
      
      default:
        console.log(`Received ${message.type}`)
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