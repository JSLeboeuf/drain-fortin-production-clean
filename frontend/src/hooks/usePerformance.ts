/**
 * React Performance Hooks
 * Optimization utilities for React components
 */

import { useRef, useCallback, useEffect, useMemo, useState, DependencyList } from 'react';
import { logger } from '@/lib/logger';

// Deep comparison hook for expensive calculations
export function useDeepCompareMemo<T>(
  factory: () => T,
  deps: DependencyList
): T {
  const ref = useRef<DependencyList>();
  const signalRef = useRef<number>(0);

  if (!ref.current || !deepEqual(deps, ref.current)) {
    ref.current = deps;
    signalRef.current += 1;
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, [signalRef.current]);
}

// Deep equality check
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
    return a === b;
  }
  
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  
  if (a.prototype !== b.prototype) return false;
  
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  
  return keys.every(k => deepEqual(a[k], b[k]));
}

// Prevent unnecessary re-renders with stable callbacks
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef<T>(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });
  
  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

// Batch state updates
export function useBatchedUpdates<T extends Record<string, any>>(
  initialState: T
): [T, (updates: Partial<T> | ((prev: T) => Partial<T>)) => void] {
  const [state, setState] = useState(initialState);
  const pendingUpdates = useRef<Partial<T>>({});
  const rafRef = useRef<number>();

  const batchUpdate = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
    const newUpdates = typeof updates === 'function' ? updates(state) : updates;
    Object.assign(pendingUpdates.current, newUpdates);

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        setState(prev => ({ ...prev, ...pendingUpdates.current }));
        pendingUpdates.current = {};
        rafRef.current = undefined;
      });
    }
  }, [state]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return [state, batchUpdate];
}

// Measure component render performance
export function useRenderTime(componentName: string) {
  const renderCount = useRef(0);
  const renderTime = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    renderTime.current = performance.now() - startTime.current;
    
    if (renderTime.current > 16) { // Longer than one frame
      logger.warn(`Slow render detected`, {
        component: componentName,
        renderCount: renderCount.current,
        renderTime: `${renderTime.current.toFixed(2)}ms`
      });
    }
    
    startTime.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
    lastRenderTime: renderTime.current
  };
}

// Lazy initial state
export function useLazyInitialState<T>(
  factory: () => T
): T {
  const [state] = useState(factory);
  return state;
}

// Previous value hook
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

// Compare and log changes
export function useWhyDidYouUpdate<T extends Record<string, any>>(
  name: string,
  props: T
) {
  const previousProps = useRef<T>();
  
  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, any> = {};
      
      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key]
          };
        }
      });
      
      if (Object.keys(changedProps).length) {
        logger.debug(`[${name}] Props changed`, changedProps);
      }
    }
    
    previousProps.current = props;
  });
}

// Selective subscription hook
export function useSelectiveSubscription<T, S>(
  source: T,
  selector: (source: T) => S,
  equalityFn?: (a: S, b: S) => boolean
): S {
  const [selectedState, setSelectedState] = useState(() => selector(source));
  const selectorRef = useRef(selector);
  const equalityFnRef = useRef(equalityFn || Object.is);
  const selectedStateRef = useRef(selectedState);
  
  useEffect(() => {
    selectorRef.current = selector;
    equalityFnRef.current = equalityFn || Object.is;
  });
  
  useEffect(() => {
    const newSelectedState = selectorRef.current(source);
    
    if (!equalityFnRef.current(newSelectedState, selectedStateRef.current)) {
      selectedStateRef.current = newSelectedState;
      setSelectedState(newSelectedState);
    }
  }, [source]);
  
  return selectedState;
}

// Unmount check hook
export function useIsMounted(): () => boolean {
  const isMounted = useRef(false);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  return useCallback(() => isMounted.current, []);
}

// Async effect hook
export function useAsyncEffect(
  effect: () => Promise<void>,
  deps?: DependencyList
): void {
  const isMounted = useIsMounted();
  
  useEffect(() => {
    const runEffect = async () => {
      try {
        await effect();
      } catch (error) {
        if (isMounted()) {
          logger.error('Async effect error', error);
        }
      }
    };
    
    runEffect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Page visibility hook
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

// Idle callback hook
export function useIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): void {
  const savedCallback = useRef(callback);
  
  useEffect(() => {
    savedCallback.current = callback;
  });
  
  useEffect(() => {
    const handleIdle: IdleRequestCallback = (deadline) => {
      savedCallback.current(deadline);
    };
    
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(handleIdle, options);
      return () => window.cancelIdleCallback(id);
    } else {
      // Fallback for unsupported browsers
      const id = setTimeout(() => {
        handleIdle({
          didTimeout: false,
          timeRemaining: () => 0
        } as IdleDeadline);
      }, 1);
      return () => clearTimeout(id);
    }
  }, [options]);
}

// Memory leak detection
export function useMemoryLeakDetector(
  componentName: string,
  threshold = 10
) {
  const instanceCount = useRef(0);
  const instanceId = useRef(Math.random());
  
  useEffect(() => {
    instanceCount.current += 1;
    
    if (instanceCount.current > threshold) {
      logger.warn(`Potential memory leak detected`, {
        component: componentName,
        instances: instanceCount.current,
        id: instanceId.current
      });
    }
    
    return () => {
      instanceCount.current -= 1;
    };
  }, [componentName, threshold]);
}

// Render optimization with memo dependencies
export function useOptimizedRender<T extends Record<string, any>>(
  props: T,
  customCompare?: (prev: T, next: T) => boolean
): boolean {
  const prevPropsRef = useRef<T>(props);
  const [, forceRender] = useState({});
  
  const shouldRender = customCompare
    ? !customCompare(prevPropsRef.current, props)
    : !shallowEqual(prevPropsRef.current, props);
  
  if (shouldRender) {
    prevPropsRef.current = props;
    forceRender({});
  }
  
  return shouldRender;
}

function shallowEqual(obj1: any, obj2: any): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every(key => obj1[key] === obj2[key]);
}

// Virtual list hook
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3
}: {
  items: T[];
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const getItemOffset = (index: number) => {
      if (typeof itemHeight === 'function') {
        let offset = 0;
        for (let i = 0; i < index; i++) {
          offset += itemHeight(i);
        }
        return offset;
      }
      return index * itemHeight;
    };
    
    const getTotalHeight = () => {
      if (typeof itemHeight === 'function') {
        return items.reduce((acc, _, i) => acc + itemHeight(i), 0);
      }
      return items.length * itemHeight;
    };
    
    let startIndex = 0;
    let accumulatedHeight = 0;
    
    // Find start index
    while (startIndex < items.length && accumulatedHeight < scrollTop) {
      const height = typeof itemHeight === 'function' 
        ? itemHeight(startIndex)
        : itemHeight;
      accumulatedHeight += height;
      if (accumulatedHeight < scrollTop) startIndex++;
    }
    
    startIndex = Math.max(0, startIndex - overscan);
    
    // Find end index
    let endIndex = startIndex;
    accumulatedHeight = 0;
    
    while (endIndex < items.length && accumulatedHeight < containerHeight + scrollTop) {
      const height = typeof itemHeight === 'function'
        ? itemHeight(endIndex)
        : itemHeight;
      accumulatedHeight += height;
      endIndex++;
    }
    
    endIndex = Math.min(items.length, endIndex + overscan);
    
    return {
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex),
      totalHeight: getTotalHeight(),
      offsetY: getItemOffset(startIndex)
    };
  }, [items, itemHeight, containerHeight, overscan, scrollTop]);
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    ...visibleRange,
    handleScroll
  };
}