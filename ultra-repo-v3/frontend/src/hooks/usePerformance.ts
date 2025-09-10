import { useEffect, useRef, useCallback, useState } from 'react';

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const renderStartTime = useRef(0);
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    avgRenderTime: 0,
    lastRenderTime: 0,
  });

  useEffect(() => {
    renderCount.current++;
    const renderTime = performance.now() - renderStartTime.current;
    
    setMetrics(prev => ({
      renderCount: renderCount.current,
      avgRenderTime: (prev.avgRenderTime * (renderCount.current - 1) + renderTime) / renderCount.current,
      lastRenderTime: renderTime,
    }));

    // Log performance issues
    if (renderTime > 16.67) { // More than 1 frame (60fps)
      // Performance warning removed for production
    }

    // Report to monitoring service in production
    if (import.meta.env.PROD && renderCount.current % 100 === 0) {
      // Send metrics to monitoring service
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: componentName,
          metrics,
          timestamp: Date.now(),
        }),
      }).catch(() => {}); // Silent fail
    }
  });

  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  return metrics;
}

// Memory leak detector
export function useMemoryLeakDetector(componentName: string) {
  const mounted = useRef(true);
  const timers = useRef(new Set<NodeJS.Timeout>());
  const subscriptions = useRef(new Set<() => void>());

  useEffect(() => {
    return () => {
      mounted.current = false;
      
      // Check for active timers
      if (timers.current.size > 0) {
        // Memory leak detection removed for production
        timers.current.forEach(timer => clearTimeout(timer));
      }
      
      // Check for active subscriptions
      if (subscriptions.current.size > 0) {
        // Memory leak detection removed for production
        subscriptions.current.forEach(unsub => unsub());
      }
    };
  }, [componentName]);

  const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      if (mounted.current) {
        callback();
        timers.current.delete(timer);
      }
    }, delay);
    timers.current.add(timer);
    return timer;
  }, []);

  const safeClearTimeout = useCallback((timer: NodeJS.Timeout) => {
    clearTimeout(timer);
    timers.current.delete(timer);
  }, []);

  const addSubscription = useCallback((unsubscribe: () => void) => {
    subscriptions.current.add(unsubscribe);
    return () => {
      unsubscribe();
      subscriptions.current.delete(unsubscribe);
    };
  }, []);

  return {
    safeSetTimeout,
    safeClearTimeout,
    addSubscription,
    isMounted: () => mounted.current,
  };
}

// Debounced value hook
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Throttled callback hook
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100
): T {
  const lastRun = useRef(0);
  const timeout = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = now;
    } else {
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        callback(...args);
        lastRun.current = Date.now();
      }, delay - (now - lastRun.current));
    }
  }, [callback, delay]) as T;
}

// Intersection observer for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting) {
        setHasIntersected(true);
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return { isIntersecting, hasIntersected };
}

// Virtual list hook for large datasets
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex,
  };
}

// Request idle callback hook
export function useIdleCallback(callback: () => void, delay: number = 0) {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(callback, { timeout: delay });
      return () => window.cancelIdleCallback(id);
    } else {
      const timer = setTimeout(callback, delay);
      return () => clearTimeout(timer);
    }
  }, [callback, delay]);
}

// Render time measurement
export function useRenderTime(componentName: string) {
  const renderStart = useRef(performance.now());
  
  useEffect(() => {
    const renderTime = performance.now() - renderStart.current;
    
    if (import.meta.env.DEV) {
      // Render time logging removed for production
    }
    
    // Track slow renders
    if (renderTime > 50) {
      // Slow render warning removed for production
    }
  });
  
  // Reset for next render
  renderStart.current = performance.now();
}