// Barrel exports pour hooks - Re-exports ciblés optimisés pour tree-shaking

// Core React Query hooks
export { 
  useAnalytics, 
  useDashboardMetrics, 
  useCreateAnalytics 
} from "./useAnalytics";

export { 
  useCalls, 
  useActiveCalls, 
  useRecentCalls, 
  useCall, 
  useUpdateCall, 
  useCreateCall 
} from "./useCalls";

export { 
  useSLAAlerts, 
  useConstraintAlerts, 
  useEnhancedMetrics, 
  useAllAlerts 
} from "./useAlerts";

export { 
  useSettings, 
  useSetting, 
  useUpdateSetting 
} from "./useSettings";

// WebSocket and real-time hooks
export { useWebSocket } from "./useWebSocket";

// UI hooks
export { useToast, toast } from "./use-toast";

// Feature flags system
export { 
  useFeatureFlag, 
  useFeatureFlags, 
  useAllFeatureFlags,
  setFeatureFlag,
  resetFeatureFlags,
  withFeatureFlag
} from "./useFeatureFlag";

// Types re-export pour convenience
export type { Alert, EnhancedMetrics } from "./useAlerts";
export type { FeatureFlags } from "./useFeatureFlag";