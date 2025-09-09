import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase, supabaseServices, VapiCall, Lead, SMSLog } from "@/lib/supabase";
import api from "@/lib/api";

// Hook pour récupérer les appels depuis Supabase avec optimisations
export function useSupabaseCalls(limit = 10) {
  return useQuery({
    queryKey: ['supabase', 'calls', limit],
    queryFn: () => supabaseServices.getRecentCalls(limit),
    refetchInterval: 10000, // Refresh toutes les 10 secondes
    staleTime: 5000, // Data stays fresh for 5 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on tab focus
    refetchOnMount: 'always',
  });
}

// Hook pour récupérer les leads
export function useSupabaseLeads(limit = 50) {
  return useQuery({
    queryKey: ['supabase', 'leads', limit],
    queryFn: () => supabaseServices.getLeads(limit),
    refetchInterval: 30000, // Refresh toutes les 30 secondes
  });
}

// Hook pour récupérer les logs SMS
export function useSupabaseSMSLogs(limit = 20) {
  return useQuery({
    queryKey: ['supabase', 'sms_logs', limit],
    queryFn: () => supabaseServices.getSMSLogs(limit),
  });
}

// Hook pour les métriques du dashboard
export function useSupabaseDashboardMetrics() {
  return useQuery({
    queryKey: ['supabase', 'dashboard_metrics'],
    queryFn: () => supabaseServices.getDashboardMetrics(),
    refetchInterval: 60000, // Refresh chaque minute
  });
}

// Hook pour les appels temps réel
export function useRealtimeCalls() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = supabaseServices.subscribeToNewCalls((newCall: VapiCall) => {
      // Invalider et refetch les queries relatives aux appels
      queryClient.invalidateQueries({ queryKey: ['supabase', 'calls'] });
      queryClient.invalidateQueries({ queryKey: ['supabase', 'dashboard_metrics'] });
      
      // Notification removed for production
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);
}

// Hook pour tester la connexion
export function useConnectionStatus() {
  return useQuery({
    queryKey: ['connection', 'status'],
    queryFn: () => api.testConnection(),
    refetchInterval: 30000, // Test toutes les 30 secondes
    staleTime: 20000,
  });
}

// Hook pour créer un lead
export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (lead: Partial<Lead>) => {
      return supabase
        .from('leads')
        .insert(lead)
        .select()
        .single();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabase', 'leads'] });
    },
  });
}

// Hook pour mettre à jour un appel
export function useUpdateCall() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<VapiCall> }) => {
      return supabase
        .from('vapi_calls')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabase', 'calls'] });
    },
  });
}

// Hook pour récupérer les contraintes depuis la DB
export function useConstraints() {
  return useQuery({
    queryKey: ['supabase', 'constraints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_constraints')
        .select('*')
        .order('category', { ascending: true });
      
      if (error) {
        // Error handled silently in production
        return [];
      }
      
      return data || [];
    },
    staleTime: 300000, // Cache pour 5 minutes
  });
}

// Hook pour récupérer les règles de tarification
export function usePricingRules() {
  return useQuery({
    queryKey: ['supabase', 'pricing_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .order('priority', { ascending: true });
      
      if (error) {
        // Error handled silently in production
        return [];
      }
      
      return data || [];
    },
    staleTime: 300000,
  });
}

// Hook combiné pour toutes les métriques
export function useDashboardData() {
  const calls = useSupabaseCalls(20);
  const leads = useSupabaseLeads(10);
  const metrics = useSupabaseDashboardMetrics();
  const connection = useConnectionStatus();
  
  // Activer les mises à jour temps réel
  useRealtimeCalls();
  
  return {
    calls: Array.isArray(calls.data) ? calls.data : [],
    leads: Array.isArray(leads.data) ? leads.data : [],
    metrics: metrics.data || {
      totalCalls: 0,
      totalLeads: 0,
      urgentCalls: 0,
      avgDuration: 0,
      conversionRate: 0
    },
    connectionStatus: connection.data || { backend: false, supabase: false },
    isLoading: calls.isLoading || leads.isLoading || metrics.isLoading,
    error: calls.error || leads.error || metrics.error,
  };
}

export default {
  useSupabaseCalls,
  useSupabaseLeads,
  useSupabaseSMSLogs,
  useSupabaseDashboardMetrics,
  useRealtimeCalls,
  useConnectionStatus,
  useCreateLead,
  useUpdateCall,
  useConstraints,
  usePricingRules,
  useDashboardData,
};