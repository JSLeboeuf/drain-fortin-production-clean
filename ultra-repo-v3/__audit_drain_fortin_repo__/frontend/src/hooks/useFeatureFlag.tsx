import { useMemo } from "react";
import { logger } from "@/lib/logger";

// Configuration des feature flags - centralisée pour faciliter la maintenance
export interface FeatureFlags {
  // Performance et optimisations
  lazyLoadingEnabled: boolean;
  errorBoundariesEnabled: boolean;
  websocketOptimizations: boolean;
  
  // Interface utilisateur
  enhancedAlerts: boolean;
  realTimeMetrics: boolean;
  advancedAnalytics: boolean;
  
  // Monitoring et debug
  performanceLogging: boolean;
  detailedErrorReporting: boolean;
  consoleDebugging: boolean;
  
  // Fonctionnalités business
  constraintValidation: boolean;
  roiTracking: boolean;
  smartInsights: boolean;
  onboardingFlow: boolean;
  
  // Intégrations externes
  sentryIntegration: boolean;
  analyticsTracking: boolean;
  webhooksEnabled: boolean;
}

// Configuration par défaut - safe defaults pour production
const defaultFlags: FeatureFlags = {
  // Performance optimisations - activées en production
  lazyLoadingEnabled: true,
  errorBoundariesEnabled: true,
  websocketOptimizations: true,
  
  // UI features - graduellement activées
  enhancedAlerts: true,
  realTimeMetrics: true,
  advancedAnalytics: false, // À activer après Phase 3
  
  // Monitoring - conditionnels selon l'environnement
  performanceLogging: false,
  detailedErrorReporting: false,
  consoleDebugging: false,
  
  // Business features - activées progressivement
  constraintValidation: true,
  roiTracking: false, // Temporairement désactivé pour debug
  smartInsights: false, // Temporairement désactivé pour debug
  onboardingFlow: true,
  
  // Intégrations - préparées pour Phase 3
  sentryIntegration: false,
  analyticsTracking: false,
  webhooksEnabled: false,
};

// Configuration par environnement
const getEnvironmentFlags = (): Partial<FeatureFlags> => {
  if (import.meta.env.DEV) {
    return {
      // En développement - plus de debug et fonctionnalités expérimentales
      performanceLogging: true,
      detailedErrorReporting: true,
      consoleDebugging: true,
      advancedAnalytics: true,
      roiTracking: true,
      smartInsights: true,
    };
  }
  
  if (import.meta.env.PROD) {
    return {
      // En production - configuration optimisée et stable
      performanceLogging: false,
      detailedErrorReporting: false,
      consoleDebugging: false,
      sentryIntegration: true, // À activer après configuration Sentry
      analyticsTracking: true, // À activer après configuration analytics
    };
  }
  
  return {};
};

// Configuration runtime - peut être étendue avec API ou localStorage
const getRuntimeFlags = (): Partial<FeatureFlags> => {
  try {
    const stored = localStorage.getItem('vapi_feature_flags');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

/**
 * Hook principal pour les feature flags
 * Priorité: runtime > environment > defaults
 */
export function useFeatureFlag<K extends keyof FeatureFlags>(flag: K): FeatureFlags[K] {
  return useMemo(() => {
    const environmentFlags = getEnvironmentFlags();
    const runtimeFlags = getRuntimeFlags();
    
    // Merge avec priorité: runtime > environment > defaults
    const finalFlags: FeatureFlags = {
      ...defaultFlags,
      ...environmentFlags,
      ...runtimeFlags,
    };
    
    return finalFlags[flag];
  }, [flag]);
}

/**
 * Hook pour récupérer plusieurs flags d'un coup
 */
export function useFeatureFlags<K extends keyof FeatureFlags>(flags: K[]): Pick<FeatureFlags, K> {
  return useMemo(() => {
    const environmentFlags = getEnvironmentFlags();
    const runtimeFlags = getRuntimeFlags();
    
    const finalFlags: FeatureFlags = {
      ...defaultFlags,
      ...environmentFlags,
      ...runtimeFlags,
    };
    
    return flags.reduce((acc, flag) => {
      acc[flag] = finalFlags[flag];
      return acc;
    }, {} as Pick<FeatureFlags, K>);
  }, [flags]);
}

/**
 * Hook pour obtenir toute la configuration
 * Utile pour debug et configuration avancée
 */
export function useAllFeatureFlags(): FeatureFlags {
  return useMemo(() => {
    const environmentFlags = getEnvironmentFlags();
    const runtimeFlags = getRuntimeFlags();
    
    return {
      ...defaultFlags,
      ...environmentFlags,
      ...runtimeFlags,
    };
  }, []);
}

/**
 * Utilitaire pour définir des flags runtime
 * Utile pour testing et configuration dynamique
 */
export function setFeatureFlag<K extends keyof FeatureFlags>(
  flag: K,
  value: FeatureFlags[K]
): void {
  try {
    const current = getRuntimeFlags();
    const updated = { ...current, [flag]: value };
    localStorage.setItem('vapi_feature_flags', JSON.stringify(updated));
    
    // Déclencher un re-render des composants qui utilisent ce flag
    window.dispatchEvent(new CustomEvent('feature-flag-update', { detail: { flag, value } }));
  } catch (error) {
    if (import.meta.env.DEV) {
      logger.warn('Failed to set feature flag:', flag, error);
    }
  }
}

/**
 * Reset tous les flags runtime
 */
export function resetFeatureFlags(): void {
  try {
    localStorage.removeItem('vapi_feature_flags');
    window.dispatchEvent(new CustomEvent('feature-flag-reset'));
  } catch (error) {
    if (import.meta.env.DEV) {
      logger.warn('Failed to reset feature flags:', error);
    }
  }
}

/**
 * Hook conditionnel - ne rend le composant que si le flag est actif
 * Utile pour les fonctionnalités expérimentales
 */
export function withFeatureFlag<K extends keyof FeatureFlags>(
  flag: K,
  Component: React.ComponentType<any>
) {
  return function FeatureFlaggedComponent(props: any) {
    const isEnabled = useFeatureFlag(flag);
    return isEnabled ? <Component {...props} /> : null;
  };
}