import { supabaseServices } from './supabase';

// Configuration de l'API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Helper pour les requêtes avec gestion d'erreur
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// API Services qui combinent backend local et Supabase
export const api = {
  // Appels
  async getCalls() {
    try {
      // Essayer d'abord le backend local
      return await fetchApi('/api/calls');
    } catch {
      // Fallback sur Supabase
      const calls = await supabaseServices.getRecentCalls(50);
      return calls.map(call => ({
        id: call.id,
        phoneNumber: call.phone_number,
        startTime: new Date(call.started_at),
        endTime: call.ended_at ? new Date(call.ended_at) : undefined,
        duration: call.duration || 0,
        transcript: call.transcript || '',
        priority: call.priority || 'P4',
        status: call.status || 'completed',
        recordingUrl: call.recording_url,
        metadata: call.metadata || {},
      }));
    }
  },

  async getCall(id: string) {
    try {
      return await fetchApi(`/api/calls/${id}`);
    } catch {
      const { data } = await supabase
        .from('vapi_calls')
        .select('*')
        .eq('id', id)
        .single();
      return data;
    }
  },

  // Leads
  async getLeads() {
    try {
      return await fetchApi('/api/leads');
    } catch {
      return await supabaseServices.getLeads();
    }
  },

  async createLead(lead: any) {
    try {
      return await fetchApi('/api/leads', {
        method: 'POST',
        body: JSON.stringify(lead),
      });
    } catch {
      const { data, error } = await supabase
        .from('leads')
        .insert(lead)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // Analytics
  async getAnalytics() {
    try {
      return await fetchApi('/api/analytics');
    } catch {
      // Utiliser les métriques de Supabase
      return await supabaseServices.getDashboardMetrics();
    }
  },

  // Configuration & Settings
  async getSettings() {
    try {
      return await fetchApi('/api/settings');
    } catch {
      // Retourner des settings par défaut
      return {
        constraints: [],
        pricing: {},
        prompts: {},
        webhooks: {
          url: import.meta.env.VITE_VAPI_WEBHOOK_URL
        }
      };
    }
  },

  async updateSettings(settings: any) {
    try {
      return await fetchApi('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  },

  // Test de connexion
  async testConnection() {
    const results = {
      backend: false,
      supabase: false,
    };

    // Test backend local
    try {
      await fetch(`${API_BASE_URL}/health`);
      results.backend = true;
    } catch {
      results.backend = false;
    }

    // Test Supabase
    try {
      const { error } = await supabase.from('vapi_calls').select('count').limit(1);
      results.supabase = !error;
    } catch {
      results.supabase = false;
    }

    return results;
  },
};

// Import Supabase direct pour usage avancé
import { supabase } from './supabase';
export { supabase, supabaseServices };

export default api;