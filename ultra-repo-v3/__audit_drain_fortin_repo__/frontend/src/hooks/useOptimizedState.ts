/**
 * Optimized State Management Hook - PERFORMANCE OPTIMIZED V2
 * Provides performance-optimized state management utilities
 * Fixed failing tests and improved performance patterns
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { logger } from '@/lib/logger';

/**
 * Debounced state hook - prevents excessive state updates
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay = 300
): [T, T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(newValue);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, debouncedValue, updateValue];
}

/**
 * Throttled state hook - limits update frequency
 * FIXED: Return proper tuple format and throttling logic
 */
export function useThrottledState<T>(
  initialValue: T,
  limit = 100
): [T, T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [throttledValue, setThrottledValue] = useState<T>(initialValue);
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingValueRef = useRef<T | undefined>();

  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;

    if (timeSinceLastRun >= limit) {
      setThrottledValue(newValue);
      lastRunRef.current = now;
    } else {
      pendingValueRef.current = newValue;
      
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          if (pendingValueRef.current !== undefined) {
            setThrottledValue(pendingValueRef.current);
            lastRunRef.current = Date.now();
          }
          timeoutRef.current = undefined;
          pendingValueRef.current = undefined;
        }, limit - timeSinceLastRun);
      }
    }
  }, [limit]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, throttledValue, updateValue];
}

/**
 * Lazy initial state hook - defers expensive initialization
 */
export function useLazyState<T>(
  initializer: () => T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      return initializer();
    } catch (error) {
      logger.error('Failed to initialize lazy state', error);
      return null as T;
    }
  });

  return [value, setValue];
}

/**
 * Persistent state hook with localStorage sync
 * FIXED: Added TTL handling and improved structure
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    syncAcrossTabs?: boolean;
    ttl?: number; // TTL in milliseconds
  }
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    syncAcrossTabs = false,
    ttl
  } = options || {};

  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return initialValue;
      
      const parsed = JSON.parse(item);
      
      // Check TTL if provided
      if (ttl && parsed.timestamp) {
        const now = Date.now();
        const age = now - parsed.timestamp;
        
        if (age > ttl) {
          localStorage.removeItem(key);
          return initialValue;
        }
        
        return parsed.value !== undefined ? parsed.value : initialValue;
      }
      
      // Handle both new format (with metadata) and old format (direct value)
      return parsed.value !== undefined ? parsed.value : parsed;
    } catch {
      return initialValue;
    }
  });

  const updateState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value;
      
      try {
        const dataToStore = ttl ? {
          value: newValue,
          timestamp: Date.now(),
          encrypted: false
        } : newValue;
        
        localStorage.setItem(key, JSON.stringify(dataToStore));
      } catch (error) {
        logger.warn(`Failed to persist state for key ${key}`, error);
      }
      
      return newValue;
    });
  }, [key, serialize, ttl]);

  const clearState = useCallback(() => {
    localStorage.removeItem(key);
    setState(initialValue);
  }, [key, initialValue]);

  // Sync across tabs if enabled
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const newValue = parsed.value !== undefined ? parsed.value : parsed;
          setState(newValue);
        } catch {
          // Invalid data in storage
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize, syncAcrossTabs]);

  return [state, updateState, clearState];
}

/**
 * Async state hook with loading and error states
 * FIXED: Proper initial loading state for manual execution
 */
export function useAsyncState<T>(
  asyncFunction?: () => Promise<T>,
  dependencies: React.DependencyList = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: () => Promise<void>;
  reset: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false); // Changed: Start with false for manual execution
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);

  const execute = useCallback(async () => {
    if (!asyncFunction) return;
    
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFunction();
      setData(result);
      retryCountRef.current = 0;
    } catch (err) {
      setError(err as Error);
      logger.error('Async state error', err);
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    retryCountRef.current = 0;
  }, []);

  useEffect(() => {
    if (asyncFunction && dependencies.length > 0) {
      execute();
    }
  }, dependencies);

  return { data, loading, error, execute, reset };
}

/**
 * Optimized list state hook with efficient updates
 */
export function useListState<T>(
  initialItems: T[] = [],
  keyExtractor: (item: T) => string | number
) {
  const [items, setItems] = useState<T[]>(initialItems);
  const itemMapRef = useRef(new Map<string | number, T>());

  // Update map when items change
  useEffect(() => {
    itemMapRef.current.clear();
    items.forEach(item => {
      itemMapRef.current.set(keyExtractor(item), item);
    });
  }, [items, keyExtractor]);

  const addItem = useCallback((item: T) => {
    setItems(prev => [...prev, item]);
  }, []);

  const updateItem = useCallback((key: string | number, updates: Partial<T>) => {
    setItems(prev => prev.map(item => 
      keyExtractor(item) === key 
        ? { ...item, ...updates }
        : item
    ));
  }, [keyExtractor]);

  const removeItem = useCallback((key: string | number) => {
    setItems(prev => prev.filter(item => keyExtractor(item) !== key));
  }, [keyExtractor]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return newItems;
    });
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  const getItem = useCallback((key: string | number) => {
    return itemMapRef.current.get(key);
  }, []);

  return {
    items,
    addItem,
    updateItem,
    removeItem,
    moveItem,
    clearItems,
    getItem,
    setItems
  };
}

/**
 * Combined state reducer hook for complex state management
 */
export function useStateReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
  middlewares: Array<(state: S, action: A) => A | null> = []
) {
  const [state, setState] = useState<S>(initialState);
  const stateRef = useRef<S>(state);
  stateRef.current = state;

  const dispatch = useCallback((action: A) => {
    let finalAction = action;
    
    // Apply middlewares
    for (const middleware of middlewares) {
      const result = middleware(stateRef.current, finalAction);
      if (result === null) return; // Middleware cancelled action
      finalAction = result;
    }

    setState(prev => {
      const newState = reducer(prev, finalAction);
      return newState;
    });
  }, [reducer, middlewares]);

  const reset = useCallback(() => {
    setState(initialState);
  }, [initialState]);

  return { state, dispatch, reset };
}

/**
 * Memoized state selector hook
 */
export function useStateSelector<T, R>(
  state: T,
  selector: (state: T) => R,
  dependencies: React.DependencyList = []
): R {
  return useMemo(() => selector(state), [state, ...dependencies]);
}

/**
 * Performance-optimized virtualization hook
 * NEW: For large list optimization
 */
export function useVirtualization<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length - 1
    );
    
    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex: visibleRange.startIndex,
    endIndex: visibleRange.endIndex
  };
}