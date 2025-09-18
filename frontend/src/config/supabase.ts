/**
 * Supabase Configuration
 */

import { createClient } from '@supabase/supabase-js';

// Use environment variables with fallbacks
const supabaseUrl = (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
  ? 'http://localhost:54321' 
  : 'https://your-project.supabase.co';

const supabaseAnonKey = 'your-anon-key-here';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: { persistSession: true },
    realtime: { 
      params: { 
        eventsPerSecond: 10 
      }
    }
  }
);