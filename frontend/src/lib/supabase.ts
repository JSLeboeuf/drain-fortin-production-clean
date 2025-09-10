import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

// Configuration Supabase depuis les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation des variables d'environnement
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'Missing Supabase environment variables. Please check your .env file.';
  logger.error(errorMessage, { 
    hasUrl: !!supabaseUrl, 
    hasKey: !!supabaseAnonKey 
  });
  throw new Error(errorMessage);
}

// Créer le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Types pour les tables Supabase
export interface VapiCall {
  id: string;
  call_id: string;
  customer_phone: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
  transcript?: string;
  priority?: string;
  status?: string;
  recording_url?: string;
  metadata?: any;
  created_at: string;
}

export interface Lead {
  id: string;
  nom: string;
  telephone: string;
  email?: string;
  adresse?: string;
  service?: string;
  urgence?: boolean;
  priorite?: string;
  source?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface SMSLog {
  id: string;
  to_number: string;
  from_number: string;
  message: string;
  status: string;
  priority?: string;
  sent_at: string;
  created_at: string;
}

// Services pour interagir avec Supabase
export const supabaseServices = {
  // Récupérer les appels récents
  async getRecentCalls(limit = 10): Promise<VapiCall[]> {
    const { data, error } = await supabase
      .from('vapi_calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching calls', error);
      return [];
    }

    return data || [];
  },

  // Récupérer les leads
  async getLeads(limit = 50): Promise<Lead[]> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching leads', error);
      return [];
    }

    return data || [];
  },

  // Récupérer les logs SMS
  async getSMSLogs(limit = 20): Promise<SMSLog[]> {
    const { data, error } = await supabase
      .from('sms_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching SMS logs', error);
      return [];
    }

    return data || [];
  },

  // Récupérer les métriques du dashboard
  async getDashboardMetrics() {
    try {
      // Appels du jour
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCalls, error: callsError } = await supabase
        .from('vapi_calls')
        .select('*')
        .gte('created_at', today);

      if (callsError) throw callsError;

      // Leads du jour
      const { data: todayLeads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', today);

      if (leadsError) throw leadsError;

      // Calculer les métriques
      const totalCalls = todayCalls?.length || 0;
      const totalLeads = todayLeads?.length || 0;
      const urgentCalls = todayCalls?.filter(c => c.priority === 'P1').length || 0;
      const avgDuration = todayCalls?.reduce((acc, c) => acc + (c.duration || 0), 0) / (totalCalls || 1);

      return {
        totalCalls,
        totalLeads,
        urgentCalls,
        avgDuration: Math.round(avgDuration / 60), // en minutes
        conversionRate: totalCalls > 0 ? Math.round((totalLeads / totalCalls) * 100) : 0
      };
    } catch (error) {
      logger.error('Error fetching dashboard metrics', error);
      return {
        totalCalls: 0,
        totalLeads: 0,
        urgentCalls: 0,
        avgDuration: 0,
        conversionRate: 0
      };
    }
  },

  // Subscription temps réel pour les nouveaux appels
  subscribeToNewCalls(callback: (call: VapiCall) => void) {
    return supabase
      .channel('new-calls')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'vapi_calls' },
        (payload) => {
          callback(payload.new as VapiCall);
        }
      )
      .subscribe();
  }
};

export default supabase;

// Realtime helpers (optional) for instant UI updates
export function subscribeToNewClients(callback: (client: any) => void) {
  return supabase
    .channel('new-clients')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'clients' },
      (payload) => {
        callback(payload.new as any);
      }
    )
    .subscribe();
}

export function subscribeToSMSMessages(callback: (sms: any) => void) {
  return supabase
    .channel('new-sms-messages')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'sms_messages' },
      (payload) => {
        callback(payload.new as any);
      }
    )
    .subscribe();
}
