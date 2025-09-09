import { supabase } from '../lib/supabase';

export interface DashboardStats {
  clients: {
    total: number;
    active: number;
    new: number;
  };
  interventions: {
    today: number;
    week: number;
    month: number;
  };
  sms: {
    sent: number;
    delivered: number;
    failed: number;
  };
  revenue: {
    month: number;
    year: number;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Fetch clients stats
    const { data: clients } = await supabase
      .from('clients')
      .select('*', { count: 'exact' });

    const { data: activeClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('status', 'active');

    // Fetch interventions stats
    const today = new Date().toISOString().split('T')[0];
    const { data: todayInterventions } = await supabase
      .from('interventions')
      .select('*', { count: 'exact' })
      .gte('scheduled_date', today);

    // Fetch SMS stats
    const { data: smsStats } = await supabase
      .from('sms_messages')
      .select('status');

    const smsSent = smsStats?.length || 0;
    const smsDelivered = smsStats?.filter(s => s.status === 'delivered').length || 0;
    const smsFailed = smsStats?.filter(s => s.status === 'failed').length || 0;

    return {
      clients: {
        total: clients?.length || 0,
        active: activeClients?.length || 0,
        new: 12 // Mock for now
      },
      interventions: {
        today: todayInterventions?.length || 0,
        week: 23, // Mock
        month: 89 // Mock
      },
      sms: {
        sent: smsSent,
        delivered: smsDelivered,
        failed: smsFailed
      },
      revenue: {
        month: 45000, // Mock
        year: 380000 // Mock
      }
    };
  } catch (error) {
    // Error handled silently in production
    throw error;
  }
}

export async function getActiveAlerts() {
  try {
    const { data, error } = await supabase
      .from('internal_alerts')
      .select('*')
      .eq('status', 'active')
      .order('priority', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    // Error handled silently in production
    return [];
  }
}