import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Twilio configuration
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || '+14502803222';
const TWILIO_API_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

// Supabase configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Team phone numbers
const TEAM_PHONES = {
  guillaume: '+15145296037',
  maxime: '+15146175425',
  ops1: '+15145296037',
  ops2: '+14508064888',
  urgence: '+15145296037' // Guillaume for urgent
};

interface SMSRequest {
  to: string | string[];
  message: string;
  type?: 'alert' | 'info' | 'urgent' | 'appointment';
  callId?: string;
  clientName?: string;
  clientPhone?: string;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { to, message, type = 'info', callId, clientName, clientPhone } = await req.json() as SMSRequest;

    // Validate inputs
    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Determine recipients
    const recipients = Array.isArray(to) ? to : [to];
    const phoneNumbers = recipients.map(r => {
      // Map team names to phone numbers
      if (r in TEAM_PHONES) {
        return TEAM_PHONES[r as keyof typeof TEAM_PHONES];
      }
      // Validate phone format (E.164)
      if (!/^\+1\d{10}$/.test(r)) {
        console.warn(`Invalid phone format: ${r}, attempting to fix...`);
        // Try to fix common formats
        let fixed = r.replace(/\D/g, ''); // Remove non-digits
        if (fixed.length === 10) {
          fixed = '+1' + fixed;
        } else if (fixed.length === 11 && fixed.startsWith('1')) {
          fixed = '+' + fixed;
        }
        return fixed;
      }
      return r;
    });

    // Format message based on type
    let formattedMessage = '';
    
    switch (type) {
      case 'urgent':
        formattedMessage = `🚨 URGENT DRAIN FORTIN\n\n${message}`;
        if (clientName && clientPhone) {
          formattedMessage += `\n\nClient: ${clientName}\nTél: ${clientPhone}`;
        }
        formattedMessage += '\n\nRépondre IMMÉDIATEMENT';
        break;
        
      case 'alert':
        formattedMessage = `⚠️ ALERTE DRAIN FORTIN\n\n${message}`;
        if (clientName) {
          formattedMessage += `\n\nClient: ${clientName}`;
        }
        break;
        
      case 'appointment':
        formattedMessage = `📅 RDV DRAIN FORTIN\n\n${message}`;
        if (clientName && clientPhone) {
          formattedMessage += `\n\nClient: ${clientName}\nTél: ${clientPhone}`;
        }
        break;
        
      default:
        formattedMessage = `DRAIN FORTIN\n\n${message}`;
    }

    // Add timestamp
    const timestamp = new Date().toLocaleString('fr-CA', { 
      timeZone: 'America/Montreal',
      hour12: false 
    });
    formattedMessage += `\n\n${timestamp}`;

    // Send SMS via Twilio
    const results = [];
    
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && 
        TWILIO_ACCOUNT_SID !== 'your_account_sid_here') {
      
      // PRODUCTION MODE - Send real SMS via Twilio
      console.log('📱 Sending SMS via Twilio to:', phoneNumbers);
      
      for (const phone of phoneNumbers) {
        try {
          // Create Basic Auth header
          const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
          
          // Prepare form data
          const formData = new URLSearchParams();
          formData.append('To', phone);
          formData.append('From', TWILIO_PHONE_NUMBER);
          formData.append('Body', formattedMessage);
          
          // Send SMS
          const response = await fetch(TWILIO_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
          });

          const result = await response.json();
          
          if (response.ok) {
            console.log(`✅ SMS sent to ${phone}: ${result.sid}`);
            results.push({
              phone,
              success: true,
              messageId: result.sid,
              status: result.status
            });

            // Log success to database
            await supabase.from('sms_logs').insert({
              phone_number: phone,
              message: formattedMessage,
              type,
              call_id: callId,
              status: 'sent',
              provider: 'twilio',
              provider_message_id: result.sid,
              cost: result.price || 0
            });
          } else {
            console.error(`❌ SMS failed to ${phone}:`, result);
            results.push({
              phone,
              success: false,
              error: result.message || 'Unknown error'
            });

            // Log failure
            await supabase.from('sms_logs').insert({
              phone_number: phone,
              message: formattedMessage,
              type,
              call_id: callId,
              status: 'failed',
              provider: 'twilio',
              error: result.message
            });
          }

        } catch (error) {
          console.error(`Failed to send SMS to ${phone}:`, error);
          results.push({
            phone,
            success: false,
            error: error.message
          });
        }
      }
    } else {
      // DEVELOPMENT MODE - Simulate SMS
      console.log('⚠️ SMS in development mode - not sending real messages');
      console.log('Would send to:', phoneNumbers);
      console.log('Message:', formattedMessage);
      
      for (const phone of phoneNumbers) {
        results.push({
          phone,
          success: true,
          messageId: `dev_${Date.now()}`,
          simulated: true
        });

        // Still log to database as simulated
        await supabase.from('sms_logs').insert({
          phone_number: phone,
          message: formattedMessage,
          type,
          call_id: callId,
          status: 'simulated',
          provider: 'development',
          provider_message_id: `dev_${Date.now()}`
        });
      }
    }

    // Send alert to dashboard if urgent
    if (type === 'urgent' && callId) {
      await supabase.from('internal_alerts').insert({
        priority: 'urgent',
        title: 'SMS Urgent Envoyé',
        message: `SMS urgent envoyé à ${phoneNumbers.join(', ')}`,
        call_id: callId,
        status: 'active'
      });
    }

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        results,
        mode: TWILIO_ACCOUNT_SID ? 'production' : 'development',
        timestamp
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('SMS service error:', error);
    
    // Log critical error
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from('error_logs').insert({
      service: 'sms-twilio',
      error: error.message,
      stack: error.stack,
      severity: 'critical'
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});