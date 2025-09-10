/**
 * Lazy Loading Utilities
 * Optimize bundle size with intelligent code splitting
 */

import React, { lazy, ComponentType, LazyExoticComponent } from 'react';
import { logger } from '@/lib/logger';

// Retry mechanism for failed chunk loads
const retry = (fn: () => Promise<any>, retriesLeft = 3, interval = 1000): Promise<any> => {
  return new Promise((resolve, reject) => {
    fn()
      .then(resolve)
      .catch((error) => {
        if (retriesLeft === 0) {
          reject(error);
          return;
        }

        setTimeout(() => {
          logger.info(`Retrying chunk load, ${retriesLeft} attempts remaining`);
          retry(fn, retriesLeft - 1, interval).then(resolve, reject);
        }, interval);
      });
  });
};

// Enhanced lazy loading with retry and error handling
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName?: string
): LazyExoticComponent<T> {
  return lazy(() =>
    retry(importFn).catch((error) => {
      logger.error(`Failed to load component ${componentName || 'unknown'}`, error);
      
      // Return error component as fallback
      return {
        default: (() => {
          return (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-red-500 mb-2">Failed to load component</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-primary text-white rounded"
                >
                  Reload Page
                </button>
              </div>
            </div>
          );
        }) as T
      };
    })
  );
}

// Preload component to improve perceived performance
export function preloadComponent(
  componentLoader: () => Promise<any>
): void {
  componentLoader().catch((error) => {
    logger.warn('Failed to preload component', error);
  });
}

// Intersection Observer based lazy loading
export function lazyLoadOnVisible<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: IntersectionObserverInit
): LazyExoticComponent<T> {
  let hasLoaded = false;
  let Component: T | null = null;

  return lazy(async () => {
    if (hasLoaded && Component) {
      return { default: Component };
    }

    // Wait for intersection if not already loaded
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      await new Promise((resolve) => {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              observer.disconnect();
              resolve(true);
            }
          },
          options
        );

        // Create temporary element to observe
        const element = document.createElement('div');
        document.body.appendChild(element);
        observer.observe(element);
        
        // Clean up after a timeout
        setTimeout(() => {
          observer.disconnect();
          element.remove();
          resolve(true);
        }, 5000);
      });
    }

    const module = await retry(importFn);
    Component = module.default;
    hasLoaded = true;
    
    return module;
  });
}

// Dynamic import with loading states
export interface DynamicImportOptions {
  loading?: ComponentType;
  error?: ComponentType<{ retry: () => void }>;
  delay?: number;
  timeout?: number;
}

export function createDynamicImport<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: DynamicImportOptions
): ComponentType {
  const LazyComponent = lazyWithRetry(importFn);

  return (props: any) => {
    const [isLoading, setIsLoading] = React.useState(true);
    const [hasError, setHasError] = React.useState(false);
    const [showLoading, setShowLoading] = React.useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout>();
    const delayRef = React.useRef<NodeJS.Timeout>();

    React.useEffect(() => {
      // Show loading after delay
      if (options?.delay) {
        delayRef.current = setTimeout(() => {
          setShowLoading(true);
        }, options.delay);
      } else {
        setShowLoading(true);
      }

      // Timeout handling
      if (options?.timeout) {
        timeoutRef.current = setTimeout(() => {
          setHasError(true);
          setIsLoading(false);
        }, options.timeout);
      }

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (delayRef.current) clearTimeout(delayRef.current);
      };
    }, []);

    if (hasError && options?.error) {
      const ErrorComponent = options.error;
      return <ErrorComponent retry={() => window.location.reload()} />;
    }

    if (isLoading && showLoading && options?.loading) {
      const LoadingComponent = options.loading;
      return <LoadingComponent />;
    }

    return (
      <React.Suspense fallback={options?.loading ? <options.loading /> : null}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}

// Bundle splitting helpers
export const splitBundle = {
  // Split vendor chunks
  vendor: (module: string) => {
    const vendors = ['react', 'react-dom', '@radix-ui', '@tanstack'];
    return vendors.some(vendor => module.includes(vendor));
  },

  // Split by route
  route: (module: string) => {
    return module.includes('/pages/');
  },

  // Split by feature
  feature: (module: string, feature: string) => {
    return module.includes(`/features/${feature}`);
  },

  // Split heavy libraries
  heavy: (module: string) => {
    const heavyLibs = ['recharts', 'moment', 'lodash'];
    return heavyLibs.some(lib => module.includes(lib));
  }
};

// Prefetch strategies
export const prefetchStrategies = {
  // Prefetch on hover
  onHover: (componentLoader: () => Promise<any>) => {
    return {
      onMouseEnter: () => preloadComponent(componentLoader),
      onFocus: () => preloadComponent(componentLoader)
    };
  },

  // Prefetch when idle
  whenIdle: (componentLoader: () => Promise<any>) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        preloadComponent(componentLoader);
      });
    } else {
      setTimeout(() => {
        preloadComponent(componentLoader);
      }, 1000);
    }
  },

  // Prefetch based on user behavior
  predictive: (componentLoader: () => Promise<any>, probability: number) => {
    if (Math.random() < probability) {
      prefetchStrategies.whenIdle(componentLoader);
    }
  }
};

// Resource hints for better loading
export function addResourceHint(url: string, type: 'prefetch' | 'preload' | 'preconnect') {
  const link = document.createElement('link');
  link.rel = type;
  link.href = url;
  
  if (type === 'preload') {
    link.as = 'script';
  }
  
  document.head.appendChild(link);
}

// Module federation helper (for micro-frontends)
export async function loadRemoteModule(
  remoteUrl: string,
  moduleName: string
): Promise<any> {
  try {
    // Dynamic script loading
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = remoteUrl;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    // Access the module from window
    const container = (window as any)[moduleName];
    if (!container) {
      throw new Error(`Module ${moduleName} not found`);
    }

    // Initialize the container
    await container.init(__webpack_share_scopes__.default);
    
    // Get the module factory
    const factory = await container.get('./Module');
    const Module = factory();
    
    return Module;
  } catch (error) {
    logger.error(`Failed to load remote module ${moduleName}`, error);
    throw error;
  }
}