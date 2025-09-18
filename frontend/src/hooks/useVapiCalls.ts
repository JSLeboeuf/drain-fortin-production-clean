/**
 * Custom hook for managing VAPI calls data from Supabase
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../config/supabase';

export interface VapiCallLog {
  id: string;
  customer_phone: string;
  status: 'active' | 'completed' | 'failed' | 'pending';
  duration?: number;
  created_at: string;
  transcript?: string;
  summary?: string;
  priority?: string;
}

export interface VapiCallStats {
  todayCalls: number;
  successCalls: number;
  failedCalls: number;
  avgDuration: number;
}

export function useVapiCalls() {
  const { data: calls, refetch: refetchCalls, isLoading, error } = useQuery({
    queryKey: ['vapi-calls'],
    queryFn: async (): Promise<VapiCallLog[]> => {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000 // Refetch toutes les 5 secondes
  });

  // Stats calculées
  const stats: VapiCallStats = {
    todayCalls: calls?.filter(c => {
      const today = new Date().toDateString();
      return new Date(c.created_at).toDateString() === today;
    }).length || 0,
    successCalls: calls?.filter(c => c.status === 'completed').length || 0,
    failedCalls: calls?.filter(c => c.status === 'failed').length || 0,
    avgDuration: calls?.length ? 
      Math.round(calls.reduce((acc, c) => acc + (c.duration || 0), 0) / calls.length) : 0
  };

  return {
    calls: calls || [],
    stats,
    isLoading,
    error,
    refetch: refetchCalls
  };
}