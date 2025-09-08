import { useQuery } from "@tanstack/react-query";

export interface Alert {
  id: string;
  type: string;
  priority?: string;
  phoneNumber?: string;
  message: string;
  action?: string;
  timestamp?: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface EnhancedMetrics {
  priorityDistribution: {
    P1: number;
    P2: number;
    P3: number;
    P4: number;
  };
  slaCompliance: {
    P1: number;
    P2: number;
    P3: number;
    P4: number;
  };
  revenueByPriority: {
    P1: number;
    P2: number;
    P3: number;
    P4: number;
  };
  totalRevenue: number;
  constraintsCompliance: number;
  activeConstraints: number;
  totalConstraints: number;
  avgResponseTime: {
    P1: string;
    P2: string;
    P3: string;
    P4: string;
  };
}

export function useSLAAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['/api/alerts/sla'],
    refetchInterval: 120000, // Optimisé: refresh toutes les 2 minutes
    staleTime: 60000, // Données fraîches pendant 1 minute
  });
}

export function useConstraintAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['/api/alerts/constraints'],
    refetchInterval: 600000, // Optimisé: refresh toutes les 10 minutes
    staleTime: 300000, // Données fraîches pendant 5 minutes
  });
}

export function useEnhancedMetrics() {
  return useQuery<EnhancedMetrics>({
    queryKey: ['/api/metrics/enhanced'],
    refetchInterval: 180000, // Optimisé: refresh toutes les 3 minutes
    staleTime: 120000,
    cacheTime: 600000,
  });
}

export function useAllAlerts() {
  const { data: slaAlerts = [] } = useSLAAlerts();
  const { data: constraintAlerts = [] } = useConstraintAlerts();
  
  return [...slaAlerts, ...constraintAlerts].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}