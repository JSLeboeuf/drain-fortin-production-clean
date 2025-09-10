/**
 * Monitoring Hook
 * React hook for integrating monitoring in components
 */

import { useEffect, useRef, useCallback } from 'react';
import { monitoring } from '@/services/monitoring';

interface UseMonitoringOptions {
  componentName: string;
  trackMount?: boolean;
  trackPerformance?: boolean;
  trackErrors?: boolean;
}

export function useMonitoring(options: UseMonitoringOptions) {
  const { componentName, trackMount = true, trackPerformance = true, trackErrors = true } = options;
  const mountTime = useRef<number>();
  const renderCount = useRef(0);

  // Track component mount
  useEffect(() => {
    if (!trackMount) return;

    mountTime.current = performance.now();
    monitoring.trackEvent('component_mount', { component: componentName });

    return () => {
      if (mountTime.current) {
        const lifespan = performance.now() - mountTime.current;
        monitoring.recordMetric(`Component:${componentName}:Lifespan`, lifespan, 'ms');
        monitoring.trackEvent('component_unmount', { 
          component: componentName,
          lifespan,
          renders: renderCount.current,
        });
      }
    };
  }, [componentName, trackMount]);

  // Track renders
  useEffect(() => {
    if (!trackPerformance) return;
    
    renderCount.current++;
    if (renderCount.current > 10) {
      monitoring.recordMetric(`Component:${componentName}:ExcessiveRenders`, renderCount.current, 'count');
    }
  });

  // Error tracking wrapper
  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    if (!trackErrors) return;
    
    monitoring.recordError({
      message: `Component Error in ${componentName}: ${error.message}`,
      stack: error.stack,
      level: 'error',
      context: {
        component: componentName,
        ...context,
      },
    });
  }, [componentName, trackErrors]);

  // Performance tracking wrapper
  const trackOperation = useCallback((operationName: string) => {
    if (!trackPerformance) return { end: () => {} };
    
    const start = performance.now();
    
    return {
      end: (success = true) => {
        const duration = performance.now() - start;
        monitoring.recordMetric(
          `Component:${componentName}:${operationName}`,
          duration,
          'ms',
          { success: success.toString() }
        );
      },
    };
  }, [componentName, trackPerformance]);

  // User interaction tracking
  const trackInteraction = useCallback((action: string, details?: Record<string, any>) => {
    monitoring.trackEvent(`${componentName}:${action}`, details);
  }, [componentName]);

  return {
    trackError,
    trackOperation,
    trackInteraction,
    metrics: monitoring.getMetrics(),
    errors: monitoring.getErrors(),
  };
}

// Performance monitoring hook
export function usePerformanceMonitor(threshold = 16) {
  const frameTime = useRef<number>();
  const jankCount = useRef(0);

  useEffect(() => {
    let rafId: number;
    
    const measureFrame = (timestamp: number) => {
      if (frameTime.current) {
        const delta = timestamp - frameTime.current;
        if (delta > threshold) {
          jankCount.current++;
          monitoring.recordMetric('FrameJank', delta, 'ms');
        }
      }
      frameTime.current = timestamp;
      rafId = requestAnimationFrame(measureFrame);
    };

    rafId = requestAnimationFrame(measureFrame);

    return () => {
      cancelAnimationFrame(rafId);
      if (jankCount.current > 0) {
        monitoring.recordMetric('TotalJankFrames', jankCount.current, 'count');
      }
    };
  }, [threshold]);

  return jankCount.current;
}

// Network monitoring hook
export function useNetworkMonitor() {
  useEffect(() => {
    if (!navigator.connection) return;

    const connection = navigator.connection as any;
    
    const handleConnectionChange = () => {
      monitoring.trackEvent('network_change', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });
    };

    connection.addEventListener('change', handleConnectionChange);
    
    // Initial network info
    handleConnectionChange();

    return () => {
      connection.removeEventListener('change', handleConnectionChange);
    };
  }, []);
}

// Memory monitoring hook
export function useMemoryMonitor(interval = 60000) {
  useEffect(() => {
    if (!(performance as any).memory) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
      const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);
      
      monitoring.recordMetric('MemoryUsed', usedMB, 'bytes', { unit: 'MB' });
      
      // Alert if memory usage is high
      const usage = (usedMB / limitMB) * 100;
      if (usage > 90) {
        monitoring.recordError({
          message: `High memory usage: ${usage.toFixed(1)}%`,
          level: 'warning',
          context: { usedMB, totalMB, limitMB },
        });
      }
    };

    const intervalId = setInterval(checkMemory, interval);
    checkMemory(); // Initial check

    return () => clearInterval(intervalId);
  }, [interval]);
}