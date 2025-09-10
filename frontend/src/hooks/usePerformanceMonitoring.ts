/**
 * Performance Monitoring Hook
 * Real-time performance tracking and optimization
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  networkLatency: number;
  pageLoadTime: number;
  renderTime: number;
  jsHeapSize: number;
  connectionType: string;
  devicePixelRatio: number;
  viewport: { width: number; height: number };
}

interface WebVitalsMetrics {
  CLS: number;
  FID: number;
  FCP: number;
  LCP: number;
  TTFB: number;
}

export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    networkLatency: 0,
    pageLoadTime: 0,
    renderTime: 0,
    jsHeapSize: 0,
    connectionType: 'unknown',
    devicePixelRatio: 1,
    viewport: { width: 0, height: 0 },
  });

  const [webVitals, setWebVitals] = useState<Partial<WebVitalsMetrics>>({});
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'fast' | 'slow' | 'offline'>('fast');
  
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const rafIdRef = useRef<number>();
  const performanceEntriesRef = useRef<PerformanceEntry[]>([]);

  // FPS Monitoring
  const measureFPS = useCallback(() => {
    frameCountRef.current++;
    const now = Date.now();
    const delta = now - lastTimeRef.current;

    if (delta >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / delta);
      setMetrics(prev => ({ ...prev, fps }));
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    rafIdRef.current = requestAnimationFrame(measureFPS);
  }, []);

  // Memory Usage Monitoring
  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = Math.round(memory.usedJSHeapSize / 1048576); // MB
      const jsHeapSize = Math.round(memory.totalJSHeapSize / 1048576); // MB
      
      setMetrics(prev => ({ ...prev, memoryUsage, jsHeapSize }));

      // Alert for high memory usage
      if (memoryUsage > 100) {
        logger.warn('High memory usage detected', { memoryUsage, jsHeapSize });
      }
    }
  }, []);

  // Network Latency Monitoring
  const measureNetworkLatency = useCallback(async () => {
    try {
      const start = performance.now();
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
      const latency = Math.round(performance.now() - start);
      
      setMetrics(prev => ({ ...prev, networkLatency: latency }));
      
      // Determine network status
      if (latency > 1000) {
        setNetworkStatus('slow');
      } else if (latency < 200) {
        setNetworkStatus('fast');
      }
    } catch (error) {
      setNetworkStatus('offline');
    }
  }, []);

  // Device Capability Detection
  const detectDeviceCapabilities = useCallback(() => {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Detect low-end device based on multiple factors
    const hardwareConcurrency = navigator.hardwareConcurrency || 1;
    const isSlowDevice = hardwareConcurrency < 4 || devicePixelRatio < 2;
    
    setIsLowEndDevice(isSlowDevice);
    setMetrics(prev => ({ ...prev, devicePixelRatio, viewport }));
  }, []);

  // Connection Type Detection
  const detectConnection = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const connectionType = connection.effectiveType || 'unknown';
      setMetrics(prev => ({ ...prev, connectionType }));
    }
  }, []);

  // Web Vitals Integration
  const initializeWebVitals = useCallback(() => {
    if (typeof window !== 'undefined') {
      import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
        onCLS((metric) => {
          setWebVitals(prev => ({ ...prev, CLS: metric.value }));
          if (metric.value > 0.1) {
            logger.warn('Poor CLS detected', { value: metric.value });
          }
        });

        onFID((metric) => {
          setWebVitals(prev => ({ ...prev, FID: metric.value }));
          if (metric.value > 100) {
            logger.warn('Poor FID detected', { value: metric.value });
          }
        });

        onFCP((metric) => {
          setWebVitals(prev => ({ ...prev, FCP: metric.value }));
        });

        onLCP((metric) => {
          setWebVitals(prev => ({ ...prev, LCP: metric.value }));
          if (metric.value > 2500) {
            logger.warn('Poor LCP detected', { value: metric.value });
          }
        });

        onTTFB((metric) => {
          setWebVitals(prev => ({ ...prev, TTFB: metric.value }));
          if (metric.value > 600) {
            logger.warn('Poor TTFB detected', { value: metric.value });
          }
        });
      });
    }
  }, []);

  // Performance Observer for detailed metrics
  const initializePerformanceObserver = useCallback(() => {
    if ('PerformanceObserver' in window) {
      try {
        // Long Task Observer
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.duration > 50) {
              logger.warn('Long task detected', {
                duration: entry.duration,
                name: entry.name,
                startTime: entry.startTime,
              });
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });

        // Resource Timing Observer
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceResourceTiming[];
          entries.forEach((entry) => {
            if (entry.duration > 1000) {
              logger.warn('Slow resource detected', {
                name: entry.name,
                duration: entry.duration,
                transferSize: entry.transferSize,
              });
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });

        // Layout Shift Observer
        const layoutShiftObserver = new PerformanceObserver((list) => {
          let cls = 0;
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          });
          if (cls > 0.1) {
            logger.warn('Layout shift detected', { cls });
          }
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });

      } catch (error) {
        logger.error('PerformanceObserver initialization failed', error);
      }
    }
  }, []);

  // Page Load Time Calculation
  const calculatePageLoadTime = useCallback(() => {
    if ('performance' in window && performance.timing) {
      const pageLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      setMetrics(prev => ({ ...prev, pageLoadTime }));
    }
  }, []);

  // Render Time Measurement
  const measureRenderTime = useCallback(() => {
    const renderStart = performance.now();
    
    // Use setTimeout to measure after render
    setTimeout(() => {
      const renderTime = performance.now() - renderStart;
      setMetrics(prev => ({ ...prev, renderTime }));
    }, 0);
  }, []);

  // Performance Optimization Recommendations
  const getOptimizationRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    if (metrics.fps < 30) {
      recommendations.push('Consider reducing animation complexity');
    }
    
    if (metrics.memoryUsage > 100) {
      recommendations.push('Memory usage is high - check for memory leaks');
    }
    
    if (metrics.networkLatency > 1000) {
      recommendations.push('Network is slow - implement offline features');
    }
    
    if (webVitals.LCP && webVitals.LCP > 2500) {
      recommendations.push('Optimize Largest Contentful Paint');
    }
    
    if (webVitals.CLS && webVitals.CLS > 0.1) {
      recommendations.push('Reduce Cumulative Layout Shift');
    }

    if (isLowEndDevice) {
      recommendations.push('Device has limited capabilities - reduce resource usage');
    }

    return recommendations;
  }, [metrics, webVitals, isLowEndDevice]);

  // Device-specific optimizations
  const applyDeviceOptimizations = useCallback(() => {
    if (isLowEndDevice) {
      // Reduce animation quality
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
      
      // Disable non-essential features
      const elements = document.querySelectorAll('.gpu-optimization');
      elements.forEach((el) => {
        (el as HTMLElement).style.willChange = 'auto';
      });
    }

    if (networkStatus === 'slow') {
      // Disable auto-refresh features
      logger.info('Slow network detected - disabling auto-refresh');
    }
  }, [isLowEndDevice, networkStatus]);

  // Initialize monitoring
  useEffect(() => {
    detectDeviceCapabilities();
    detectConnection();
    initializeWebVitals();
    initializePerformanceObserver();
    calculatePageLoadTime();

    // Start FPS monitoring
    rafIdRef.current = requestAnimationFrame(measureFPS);

    // Set up intervals for periodic monitoring
    const memoryInterval = setInterval(measureMemory, 5000);
    const networkInterval = setInterval(measureNetworkLatency, 30000);
    const deviceInterval = setInterval(detectDeviceCapabilities, 10000);

    // Apply optimizations based on device capabilities
    applyDeviceOptimizations();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      clearInterval(memoryInterval);
      clearInterval(networkInterval);
      clearInterval(deviceInterval);
    };
  }, [
    measureFPS,
    measureMemory,
    measureNetworkLatency,
    detectDeviceCapabilities,
    initializeWebVitals,
    initializePerformanceObserver,
    calculatePageLoadTime,
    applyDeviceOptimizations,
  ]);

  // Update render time on each render
  useEffect(() => {
    measureRenderTime();
  });

  return {
    metrics,
    webVitals,
    isLowEndDevice,
    networkStatus,
    recommendations: getOptimizationRecommendations(),
    
    // Utility functions
    startPerfMeasure: (name: string) => performance.mark(`${name}-start`),
    endPerfMeasure: (name: string) => {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      logger.info(`Performance measure: ${name}`, { duration: measure.duration });
    },
    
    // Export performance data
    exportMetrics: () => ({
      ...metrics,
      webVitals,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }),
  };
}

// Hook for component-level performance monitoring
export function useComponentPerformance(componentName: string) {
  const mountTime = useRef<number>();
  const renderCount = useRef(0);

  useEffect(() => {
    mountTime.current = performance.now();
    return () => {
      if (mountTime.current) {
        const lifespan = performance.now() - mountTime.current;
        logger.info(`Component ${componentName} lifespan`, {
          lifespan,
          renders: renderCount.current,
        });
      }
    };
  }, [componentName]);

  useEffect(() => {
    renderCount.current++;
    if (renderCount.current > 20) {
      logger.warn(`Component ${componentName} has excessive renders`, {
        count: renderCount.current,
      });
    }
  });

  return {
    renderCount: renderCount.current,
    measureRender: (callback: () => void) => {
      const start = performance.now();
      callback();
      const duration = performance.now() - start;
      logger.info(`${componentName} render time`, { duration });
    },
  };
}

// Development performance overlay component
// Performance Overlay component moved to separate file
// See: components/performance/PerformanceOverlay.tsx