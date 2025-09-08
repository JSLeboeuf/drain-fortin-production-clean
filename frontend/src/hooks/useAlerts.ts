import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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

// Hook pour récupérer les alertes depuis Supabase
export function useSLAAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['alerts', 'sla'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('type', 'sla')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching SLA alerts:', error);
        return [];
      }
      
      return data?.map(alert => ({
        id: alert.id,
        type: alert.type,
        priority: alert.priority,
        phoneNumber: alert.client_phone,
        message: alert.message,
        action: alert.required_action,
        timestamp: new Date(alert.created_at),
        severity: mapPriorityToSeverity(alert.priority)
      })) || [];
    },
    refetchInterval: 120000,
    staleTime: 60000,
  });
}

export function useConstraintAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['alerts', 'constraint'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('type', 'constraint')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching constraint alerts:', error);
        return [];
      }
      
      return data?.map(alert => ({
        id: alert.id,
        type: alert.type,
        priority: alert.priority,
        phoneNumber: alert.client_phone,
        message: alert.message,
        action: alert.required_action,
        timestamp: new Date(alert.created_at),
        severity: mapPriorityToSeverity(alert.priority)
      })) || [];
    },
    refetchInterval: 600000,
    staleTime: 300000,
  });
}

export function useEnhancedMetrics() {
  return useQuery<EnhancedMetrics>({
    queryKey: ['metrics', 'enhanced'],
    queryFn: async () => {
      // Récupérer les données depuis les différentes tables Supabase
      const [alertsResult, clientsResult, smsResult] = await Promise.all([
        supabase.from('alerts').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('sms_messages').select('*')
      ]);

      const alerts = alertsResult.data || [];
      const clients = clientsResult.data || [];
      const smsMessages = smsResult.data || [];

      // Calculer les métriques
      const priorityDistribution = {
        P1: alerts.filter(a => a.priority === 'P1').length,
        P2: alerts.filter(a => a.priority === 'P2').length,
        P3: alerts.filter(a => a.priority === 'P3').length,
        P4: alerts.filter(a => a.priority === 'P4').length,
      };

      // Métriques simulées pour le moment
      return {
        priorityDistribution,
        slaCompliance: {
          P1: 95,
          P2: 92,
          P3: 88,
          P4: 85,
        },
        revenueByPriority: {
          P1: 45000,
          P2: 32000,
          P3: 18000,
          P4: 12000,
        },
        totalRevenue: 107000,
        constraintsCompliance: 92,
        activeConstraints: alerts.filter(a => a.status === 'open').length,
        totalConstraints: alerts.length,
        avgResponseTime: {
          P1: '15 min',
          P2: '30 min',
          P3: '2h',
          P4: '4h',
        },
      };
    },
    refetchInterval: 180000,
    staleTime: 120000,
  });
}

// Helper function pour mapper la priorité à la sévérité
function mapPriorityToSeverity(priority: string): 'critical' | 'high' | 'medium' | 'low' {
  switch (priority) {
    case 'P1':
      return 'critical';
    case 'P2':
      return 'high';
    case 'P3':
      return 'medium';
    case 'P4':
    default:
      return 'low';
  }
}

export function useAllAlerts() {
  const { data: slaAlerts, isLoading: slaLoading, error: slaError } = useSLAAlerts();
  const { data: constraintAlerts, isLoading: constraintLoading, error: constraintError } = useConstraintAlerts();

  // Gestion des états de chargement
  const isLoading = slaLoading || constraintLoading;
  const error = slaError || constraintError;

  // S'assurer que les données sont des tableaux valides
  const safeSlaAlerts = Array.isArray(slaAlerts) ? slaAlerts : [];
  const safeConstraintAlerts = Array.isArray(constraintAlerts) ? constraintAlerts : [];

  const allAlerts = [
    ...safeSlaAlerts,
    ...safeConstraintAlerts
  ];

  // Trier par sévérité
  const sortedAlerts = allAlerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return {
    data: sortedAlerts,
    isLoading,
    error,
    count: sortedAlerts.length,
  };
}