import { supabase } from '@/lib/supabase';
import type { 
  Client, 
  SMSMessage, 
  Intervention, 
  Technician, 
  InternalAlert,
  CommunicationHistory,
  CRMStats,
  CRMFilters 
} from '@/types/crm';

// ============================================
// CLIENT SERVICES
// ============================================

export const clientService = {
  // Get all clients with optional filters
  async getClients(filters?: CRMFilters) {
    let query = supabase
      .from('clients_enriched')
      .select('*')
      .order('last_contact_date', { ascending: false });

    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.priority?.length) {
      query = query.in('priority_level', filters.priority);
    }
    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Client[];
  },

  // Get single client by ID
  async getClient(id: string) {
    const { data, error } = await supabase
      .from('clients_enriched')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Client;
  },

  // Create or update client
  async upsertClient(client: Partial<Client>) {
    const { data, error } = await supabase
      .from('clients')
      .upsert(client)
      .select()
      .single();
    
    if (error) throw error;
    return data as Client;
  },

  // Update client
  async updateClient(id: string, updates: Partial<Client>) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Client;
  },

  // Get client history
  async getClientHistory(clientId: string) {
    const [communications, interventions, sms] = await Promise.all([
      supabase
        .from('communication_history')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('interventions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('sms_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('sent_at', { ascending: false })
    ]);

    return {
      communications: communications.data || [],
      interventions: interventions.data || [],
      sms: sms.data || []
    };
  }
};

// ============================================
// SMS SERVICES
// ============================================

export const smsService = {
  // Get all SMS messages
  async getSMSMessages(filters?: CRMFilters) {
    let query = supabase
      .from('sms_messages')
      .select(`
        *,
        client:clients(first_name, last_name, phone)
      `)
      .order('sent_at', { ascending: false });

    if (filters?.priority?.length) {
      query = query.in('priority', filters.priority);
    }
    if (filters?.dateFrom) {
      query = query.gte('sent_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('sent_at', filters.dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as SMSMessage[];
  },

  // Get SMS by ID
  async getSMS(id: string) {
    const { data, error } = await supabase
      .from('sms_messages')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as SMSMessage;
  },

  // Update SMS status
  async updateSMSStatus(id: string, status: string, errorMessage?: string) {
    const updates: any = { 
      status,
      ...(status === 'delivered' && { delivered_at: new Date().toISOString() }),
      ...(errorMessage && { error_message: errorMessage })
    };

    const { data, error } = await supabase
      .from('sms_messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as SMSMessage;
  }
};

// ============================================
// INTERVENTION SERVICES
// ============================================

export const interventionService = {
  // Get all interventions
  async getInterventions(filters?: CRMFilters) {
    let query = supabase
      .from('interventions')
      .select(`
        *,
        client:clients(first_name, last_name, phone, address),
        technician:technicians(first_name, last_name)
      `)
      .order('scheduled_date', { ascending: false });

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.priority?.length) {
      query = query.in('priority', filters.priority);
    }
    if (filters?.serviceType) {
      query = query.eq('service_type', filters.serviceType);
    }
    if (filters?.technician) {
      query = query.eq('technician_id', filters.technician);
    }
    if (filters?.dateFrom) {
      query = query.gte('scheduled_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('scheduled_date', filters.dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Intervention[];
  },

  // Get today's interventions
  async getTodayInterventions() {
    const { data, error } = await supabase
      .from('today_interventions')
      .select('*');
    
    if (error) throw error;
    return data as Intervention[];
  },

  // Get intervention by ID
  async getIntervention(id: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        client:clients(*),
        technician:technicians(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Intervention;
  },

  // Create intervention
  async createIntervention(intervention: Partial<Intervention>) {
    const { data, error } = await supabase
      .from('interventions')
      .insert(intervention)
      .select()
      .single();
    
    if (error) throw error;
    return data as Intervention;
  },

  // Update intervention
  async updateIntervention(id: string, updates: Partial<Intervention>) {
    const { data, error } = await supabase
      .from('interventions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Intervention;
  },

  // Start intervention
  async startIntervention(id: string) {
    return this.updateIntervention(id, {
      status: 'in_progress',
      started_at: new Date().toISOString()
    });
  },

  // Complete intervention
  async completeIntervention(id: string, finalPrice: number, notes?: string) {
    const { data: intervention } = await this.getIntervention(id);
    const duration = intervention?.started_at 
      ? Math.floor((Date.now() - new Date(intervention.started_at).getTime()) / 60000)
      : null;

    return this.updateIntervention(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      final_price: finalPrice,
      duration_minutes: duration,
      technician_notes: notes
    });
  }
};

// ============================================
// ALERT SERVICES
// ============================================

export const alertService = {
  // Get active alerts
  async getActiveAlerts() {
    const { data, error } = await supabase
      .from('active_alerts')
      .select('*');
    
    if (error) throw error;
    return data as InternalAlert[];
  },

  // Get all alerts
  async getAlerts(filters?: CRMFilters) {
    let query = supabase
      .from('internal_alerts')
      .select(`
        *,
        client:clients(first_name, last_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (filters?.priority?.length) {
      query = query.in('priority', filters.priority);
    }
    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as InternalAlert[];
  },

  // Acknowledge alert
  async acknowledgeAlert(id: string, userId: string) {
    const { data, error } = await supabase
      .from('internal_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as InternalAlert;
  },

  // Resolve alert
  async resolveAlert(id: string, userId: string) {
    const { data, error } = await supabase
      .from('internal_alerts')
      .update({
        status: 'resolved',
        resolved_by: userId,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as InternalAlert;
  }
};

// ============================================
// TECHNICIAN SERVICES
// ============================================

export const technicianService = {
  // Get all technicians
  async getTechnicians() {
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .eq('status', 'active')
      .order('first_name');
    
    if (error) throw error;
    return data as Technician[];
  },

  // Get available technicians
  async getAvailableTechnicians() {
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .eq('status', 'active')
      .eq('available', true);
    
    if (error) throw error;
    return data as Technician[];
  },

  // Update technician availability
  async updateAvailability(id: string, available: boolean) {
    const { data, error } = await supabase
      .from('technicians')
      .update({ available })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Technician;
  }
};

// ============================================
// STATISTICS SERVICES
// ============================================

export const statsService = {
  // Get CRM statistics
  async getStats(): Promise<CRMStats> {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      clients,
      interventions,
      todayInterventions,
      sms,
      todaySMS,
      activeAlerts,
      monthRevenue
    ] = await Promise.all([
      supabase.from('clients').select('id, status, total_revenue').eq('status', 'active'),
      supabase.from('interventions').select('id, status'),
      supabase.from('interventions').select('id').eq('scheduled_date', today),
      supabase.from('sms_messages').select('id'),
      supabase.from('sms_messages').select('id').gte('sent_at', today),
      supabase.from('active_alerts').select('*, priority'),
      supabase.from('interventions')
        .select('final_price')
        .eq('payment_status', 'paid')
        .gte('completed_at', monthStart.toISOString())
    ]);

    const p1Alerts = activeAlerts.data?.filter(a => a.priority === 'P1').length || 0;
    const p2Alerts = activeAlerts.data?.filter(a => a.priority === 'P2').length || 0;
    const totalRevenue = clients.data?.reduce((sum, c) => sum + (c.total_revenue || 0), 0) || 0;
    const monthRev = monthRevenue.data?.reduce((sum, i) => sum + (i.final_price || 0), 0) || 0;

    return {
      totalClients: clients.data?.length || 0,
      activeClients: clients.data?.filter(c => c.status === 'active').length || 0,
      totalInterventions: interventions.data?.length || 0,
      todayInterventions: todayInterventions.data?.length || 0,
      totalSMS: sms.data?.length || 0,
      todaySMS: todaySMS.data?.length || 0,
      totalRevenue,
      monthRevenue: monthRev,
      activeAlerts: activeAlerts.data?.length || 0,
      p1Alerts,
      p2Alerts,
      averageResponseTime: 15, // Minutes - calculate from real data
      customerSatisfaction: 4.7 // Calculate from ratings
    };
  }
};

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export const realtimeService = {
  // Subscribe to alerts
  subscribeToAlerts(callback: (payload: any) => void) {
    return supabase
      .channel('alerts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'internal_alerts'
      }, callback)
      .subscribe();
  },

  // Subscribe to SMS
  subscribeToSMS(callback: (payload: any) => void) {
    return supabase
      .channel('sms')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sms_messages'
      }, callback)
      .subscribe();
  },

  // Subscribe to interventions
  subscribeToInterventions(callback: (payload: any) => void) {
    return supabase
      .channel('interventions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'interventions'
      }, callback)
      .subscribe();
  },

  // Subscribe to calls
  subscribeToCalls(callback: (payload: any) => void) {
    return supabase
      .channel('calls')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vapi_calls'
      }, callback)
      .subscribe();
  },

  // Unsubscribe from channel
  unsubscribe(channel: any) {
    return supabase.removeChannel(channel);
  }
};