import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const BREVO_API_URL = 'https://api.brevo.com/v3/transactionalSMS/sms';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Phone numbers for production
const TEAM_PHONES = {
  guillaume: '+15145296037',
  maxime: '+15146175425',
  ops1: '+15145296037',
  ops2: '+14508064888'
};

interface SMSRequest {
  to: string | string[];
  message: string;
  type?: 'alert' | 'info' | 'urgent';
  callId?: string;
}

serve(async (req) => {
  try {
    // Validate request
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { to, message, type = 'info', callId } = await req.json() as SMSRequest;

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
      // Validate phone format
      if (!/^\+1\d{10}$/.test(r)) {
        throw new Error(`Invalid phone number format: ${r}`);
      }
      return r;
    });

    // Format message based on type
    let formattedMessage = message;
    if (type === 'urgent') {
      formattedMessage = `🚨 URGENT - ${message}`;
    } else if (type === 'alert') {
      formattedMessage = `⚠️ ALERTE - ${message}`;
    }

    // Add footer
    formattedMessage += '\n- Drain Fortin AI';

    // Send SMS via Brevo
    const results = [];
    
    if (BREVO_API_KEY && BREVO_API_KEY !== 'your_brevo_key_here') {
      // PRODUCTION MODE - Send real SMS
      for (const phone of phoneNumbers) {
        try {
          const response = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'api-key': BREVO_API_KEY,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              type: 'transactional',
              unicodeEnabled: true,
              sender: 'DrainFortin',
              recipient: phone,
              content: formattedMessage
            })
          });

          const result = await response.json();
          results.push({
            phone,
            success: response.ok,
            messageId: result.messageId || null,
            error: result.message || null
          });

          // Log to database
          await supabase.from('sms_logs').insert({
            phone_number: phone,
            message: formattedMessage,
            type,
            call_id: callId,
            status: response.ok ? 'sent' : 'failed',
            provider: 'brevo',
            provider_message_id: result.messageId,
            error: result.message
          });

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
      
      for (const phone of phoneNumbers) {
        results.push({
          phone,
          success: true,
          messageId: `dev_${Date.now()}`,
          simulated: true
        });

        // Still log to database
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

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        results,
        mode: BREVO_API_KEY ? 'production' : 'development'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('SMS service error:', error);
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