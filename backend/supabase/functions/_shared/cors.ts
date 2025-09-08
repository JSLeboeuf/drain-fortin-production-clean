// Basic CORS headers for Supabase Edge Functions
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-signature",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

