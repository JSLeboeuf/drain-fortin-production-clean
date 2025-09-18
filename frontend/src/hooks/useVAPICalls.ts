/**
 * Custom hook for VAPI calls data
 * Manages call data fetching and real-time updates
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/config/supabase';
import type { VAPICall, UseVAPICallsResult } from '@/types';

export const useVAPICalls = (): UseVAPICallsResult => {
  const { data: calls, isLoading, error, refetch } = useQuery({
    queryKey: ['vapi-calls'],
    queryFn: async (): Promise<VAPICall[]> => {
      const { data, error } = await supabase
        .from('vapi_calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('vapi-monitoring')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'vapi_calls' 
        }, 
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    calls,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};