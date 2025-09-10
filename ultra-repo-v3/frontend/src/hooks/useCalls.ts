import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Call, LiveCall, CallFilters } from "@/types";

export function useCalls(filters?: CallFilters) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
  }

  return useQuery<Call[]>({
    queryKey: ["/api/calls", params.toString()],
  });
}

export function useActiveCalls() {
  return useQuery<LiveCall[]>({
    queryKey: ["/api/calls/active"],
    refetchInterval: 5000,
  });
}

export function useRecentCalls(limit?: number) {
  return useQuery<Call[]>({
    queryKey: ["/api/calls/recent", limit?.toString()],
  });
}

export function useCall(id: string) {
  return useQuery<Call>({
    queryKey: ["/api/calls", id],
    enabled: !!id,
  });
}

export function useUpdateCall() {
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Call> }) => {
      const res = await apiRequest("PUT", `/api/calls/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
    },
  });
}

export function useCreateCall() {
  return useMutation({
    mutationFn: async (call: Partial<Call>) => {
      const res = await apiRequest("POST", "/api/calls", call);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
    },
  });
}
