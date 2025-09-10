/**
 * API Hooks - Data Fetching and Management
 * Hooks for API calls, React Query, and data management
 */

// Re-export API-related hooks from parent directory
export { 
  useAnalytics, 
  useDashboardMetrics, 
  useCreateAnalytics 
} from "../useAnalytics";

export { 
  useCalls, 
  useActiveCalls, 
  useRecentCalls, 
  useCall, 
  useUpdateCall, 
  useCreateCall 
} from "../useCalls";

export { 
  useSLAAlerts, 
  useConstraintAlerts, 
  useEnhancedMetrics, 
  useAllAlerts 
} from "../useAlerts";

export { 
  useSettings, 
  useSetting, 
  useUpdateSetting 
} from "../useSettings";

// Re-export WebSocket hooks
export { useWebSocket } from "../useWebSocket";