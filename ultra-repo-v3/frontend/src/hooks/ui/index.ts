/**
 * UI Hooks - User Interface Management
 * Hooks for UI state, interactions, and user experience
 */

// Re-export UI-related hooks from parent directory
export { useToast, toast } from "../use-toast";

// Re-export feature flags (UI feature control)
export { 
  useFeatureFlag, 
  useFeatureFlags, 
  useAllFeatureFlags,
  setFeatureFlag,
  resetFeatureFlags,
  withFeatureFlag
} from "../useFeatureFlag";

// Placeholder for additional UI hooks
// export { useModal } from './useModal';
// export { useTheme } from './useTheme';
// export { useMediaQuery } from './useMediaQuery';
// export { useLocalStorage } from './useLocalStorage';