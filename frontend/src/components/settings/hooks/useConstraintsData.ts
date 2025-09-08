import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchConstraints, getConstraintsByCategory, getConstraintStats, EnhancedConstraint } from "@/services/constraintService";
import { getApiBaseUrl } from "@/lib/apiClient";

interface UseConstraintsDataOptions {
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseConstraintsDataReturn {
  constraints: EnhancedConstraint[];
  constraintsByCategory: Record<string, EnhancedConstraint[]>;
  stats: ReturnType<typeof getConstraintStats>;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export function useConstraintsData(options: UseConstraintsDataOptions = {}): UseConstraintsDataReturn {
  const { enableAutoRefresh = false, refreshInterval = 30000 } = options;

  const [page] = useState(1);
  const [pageSize] = useState(50);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [getApiBaseUrl(), '/api/constraints', page, pageSize],
    queryFn: async () => {
      try {
        const res = await fetchConstraints({ page, pageSize, sort: 'id:asc' });
        return Array.isArray((res as any).items) ? (res as any).items as EnhancedConstraint[] : [];
      } catch (e: any) {
        setError(e?.message || 'Impossible de charger les contraintes');
        return [] as EnhancedConstraint[];
      }
    },
    staleTime: 60_000,
    refetchInterval: enableAutoRefresh ? refreshInterval : false,
  });

  const constraints = useMemo(() => data ?? [], [data]);

  const constraintsByCategory = useMemo(() => {
    try {
      return getConstraintsByCategory(constraints);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to categorize constraints');
      return {};
    }
  }, [constraints]);

  const stats = useMemo(() => {
    try {
      return getConstraintStats(constraints);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate statistics');
      return {
        total: 0,
        active: 0,
        inactive: 0,
        p1Count: 0,
        p2Count: 0,
        p3Count: 0,
        p4Count: 0,
        violationsTotal: 0,
        categories: {}
      };
    }
  }, [constraints]);

  const refreshData = useCallback(async () => { await refetch(); }, [refetch]);

  return {
    constraints,
    constraintsByCategory,
    stats,
    isLoading,
    error,
    refreshData,
  };
}
