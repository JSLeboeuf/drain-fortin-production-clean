import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { debounce, throttle } from '@/utils/performance';

// ============================================
// PERFORMANCE MONITORING HOOK
// ============================================

interface PerformanceMetrics {
  fps: number;
  memory: number;
  loadTime: number;
  renderTime: number;
  networkLatency: number;
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    loadTime: 0,
    renderTime: 0,
    networkLatency: 0
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setMetrics(prev => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime))
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      rafId = requestAnimationFrame(measureFPS);
    };

    // Start FPS monitoring
    rafId = requestAnimationFrame(measureFPS);

    // Memory monitoring (if available)
    if ('memory' in performance) {
      const memoryInterval = setInterval(() => {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memory: Math.round(memory.usedJSHeapSize / 1048576) // MB
        }));
      }, 2000);

      return () => {
        cancelAnimationFrame(rafId);
        clearInterval(memoryInterval);
      };
    }

    return () => cancelAnimationFrame(rafId);
  }, []);

  return metrics;
};

// ============================================
// VIRTUAL SCROLL HOOK FOR LARGE LISTS
// ============================================

interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  getScrollElement?: () => HTMLElement | null;
}

export const useVirtualScroll = <T>(
  items: T[],
  options: VirtualScrollOptions
) => {
  const { itemHeight, containerHeight, overscan = 3, getScrollElement } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(
    () => items.slice(visibleRange.start, visibleRange.end + 1),
    [items, visibleRange]
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  useEffect(() => {
    const scrollElement = getScrollElement?.() || window;
    
    const handleScroll = throttle(() => {
      const newScrollTop = scrollElement === window
        ? window.pageYOffset || document.documentElement.scrollTop
        : (scrollElement as HTMLElement).scrollTop;
      
      setScrollTop(newScrollTop);
      setIsScrolling(true);
      
      // Reset scrolling state after scroll ends
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    }, 16); // ~60fps

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeoutRef.current);
    };
  }, [getScrollElement]);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    isScrolling,
    visibleRange
  };
};

// ============================================
// LAZY LOAD IMAGES HOOK
// ============================================

interface LazyImageOptions {
  threshold?: number;
  rootMargin?: string;
  placeholder?: string;
}

export const useLazyImage = (
  src: string,
  options: LazyImageOptions = {}
) => {
  const { threshold = 0.1, rootMargin = '50px', placeholder = '' } = options;
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image();
          
          img.onload = () => {
            setImageSrc(src);
            setIsLoading(false);
          };
          
          img.onerror = () => {
            setError(new Error(`Failed to load image: ${src}`));
            setIsLoading(false);
          };
          
          img.src = src;
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(imgRef.current);
    
    return () => observer.disconnect();
  }, [src, threshold, rootMargin]);

  return { imageSrc, isLoading, error, imgRef };
};

// ============================================
// DEBOUNCED INPUT HOOK
// ============================================

export const useDebouncedValue = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// ============================================
// PREFETCH HOOK FOR ROUTE PRELOADING
// ============================================

interface PrefetchOptions {
  onHover?: boolean;
  onVisible?: boolean;
  delay?: number;
}

export const usePrefetch = (
  importFn: () => Promise<any>,
  options: PrefetchOptions = {}
) => {
  const { onHover = true, onVisible = false, delay = 50 } = options;
  const [isPrefetched, setIsPrefetched] = useState(false);
  const prefetchTimeoutRef = useRef<NodeJS.Timeout>();
  const linkRef = useRef<HTMLElement>(null);

  const prefetch = useCallback(() => {
    if (isPrefetched) return;
    
    prefetchTimeoutRef.current = setTimeout(() => {
      importFn()
        .then(() => setIsPrefetched(true))
        .catch(err => console.error('Prefetch failed:', err));
    }, delay);
  }, [importFn, delay, isPrefetched]);

  const cancelPrefetch = useCallback(() => {
    clearTimeout(prefetchTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!linkRef.current) return;

    const element = linkRef.current;
    
    // Prefetch on hover
    if (onHover) {
      element.addEventListener('mouseenter', prefetch);
      element.addEventListener('mouseleave', cancelPrefetch);
      element.addEventListener('touchstart', prefetch);
    }

    // Prefetch on visible
    if (onVisible) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            prefetch();
            observer.disconnect();
          }
        },
        { rootMargin: '100px' }
      );
      
      observer.observe(element);
      
      return () => {
        observer.disconnect();
        element.removeEventListener('mouseenter', prefetch);
        element.removeEventListener('mouseleave', cancelPrefetch);
        element.removeEventListener('touchstart', prefetch);
      };
    }

    return () => {
      element.removeEventListener('mouseenter', prefetch);
      element.removeEventListener('mouseleave', cancelPrefetch);
      element.removeEventListener('touchstart', prefetch);
    };
  }, [onHover, onVisible, prefetch, cancelPrefetch]);

  return { linkRef, isPrefetched, prefetch };
};

// ============================================
// NETWORK STATUS HOOK
// ============================================

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [effectiveType, setEffectiveType] = useState<string>('unknown');
  const [downlink, setDownlink] = useState<number>(0);
  const [rtt, setRtt] = useState<number>(0);
  const [saveData, setSaveData] = useState(false);

  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setConnectionType(connection.type || 'unknown');
        setEffectiveType(connection.effectiveType || 'unknown');
        setDownlink(connection.downlink || 0);
        setRtt(connection.rtt || 0);
        setSaveData(connection.saveData || false);
      }
    };

    updateNetworkStatus();

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', updateNetworkStatus);
      
      return () => {
        window.removeEventListener('online', updateNetworkStatus);
        window.removeEventListener('offline', updateNetworkStatus);
        connection?.removeEventListener('change', updateNetworkStatus);
      };
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  return {
    isOnline,
    connectionType,
    effectiveType,
    downlink,
    rtt,
    saveData,
    isSlowConnection: effectiveType === '2g' || effectiveType === 'slow-2g',
    isFastConnection: effectiveType === '4g'
  };
};

// ============================================
// TRANSITION HOOK FOR NON-URGENT UPDATES
// ============================================

export const useOptimizedState = <T>(initialValue: T) => {
  const [state, setState] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  
  const setOptimizedState = useCallback((value: T | ((prev: T) => T)) => {
    startTransition(() => {
      setState(value);
    });
  }, []);

  return [state, setOptimizedState, isPending] as const;
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Debounce implementation
function debounceImpl<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle implementation
function throttleImpl<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}