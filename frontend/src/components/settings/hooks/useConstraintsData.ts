import { useState, useMemo, useCallback, useEffect } from "react";
import { transformConstraintsData, getConstraintsByCategory, getConstraintStats, EnhancedConstraint } from "@/services/constraintService";

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
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataTimestamp, setDataTimestamp] = useState(Date.now());

  const constraints = useMemo(() => {
    try {
      setError(null);
      return transformConstraintsData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load constraints data');
      return [];
    }
  }, [dataTimestamp]);

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

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate async data refresh
      await new Promise(resolve => setTimeout(resolve, 100));
      setDataTimestamp(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!enableAutoRefresh) return;

    const intervalId = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [enableAutoRefresh, refreshInterval, refreshData]);

  return {
    constraints,
    constraintsByCategory,
    stats,
    isLoading,
    error,
    refreshData,
  };
}