import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Analytics, DashboardMetrics } from "@/types";
import { useMemo } from "react";

export function useAnalytics(dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  if (dateFrom) params.append("dateFrom", dateFrom);
  if (dateTo) params.append("dateTo", dateTo);

  return useQuery<Analytics[]>({
    queryKey: ["/api/analytics", params.toString()],
  });
}

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ["/api/analytics/dashboard"],
    refetchInterval: 180000, // Optimisé: refresh toutes les 3 minutes
    staleTime: 120000, // Données fraîches pendant 2 minutes
    cacheTime: 600000, // Garde en cache 10 minutes
  });
}

export function useCreateAnalytics() {
  return useMutation({
    mutationFn: async (analytics: Partial<Analytics>) => {
      const res = await apiRequest("POST", "/api/analytics", analytics);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });
}
