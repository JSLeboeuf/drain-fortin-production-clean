/**
 * Supabase Configuration
 * Centralized database client configuration
 */

import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { 
    persistSession: true 
  },
  realtime: { 
    params: { 
      eventsPerSecond: 10 
    }
  }
});

export default supabase;