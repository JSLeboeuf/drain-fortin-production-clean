/**
 * Optimized State Management Hook
 * Provides performance-optimized state management utilities
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
 */
export function useThrottledState<T>(
  initialValue: T,
  limit = 100
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const lastRunRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingValueRef = useRef<T>();

  const updateValue = useCallback((newValue: T) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;

    if (timeSinceLastRun >= limit) {
      setValue(newValue);
      lastRunRef.current = now;
    } else {
      pendingValueRef.current = newValue;
      
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          if (pendingValueRef.current !== undefined) {
            setValue(pendingValueRef.current);
            lastRunRef.current = Date.now();
          }
          timeoutRef.current = undefined;
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

  return [value, updateValue];
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
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    syncAcrossTabs?: boolean;
  }
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    syncAcrossTabs = false
  } = options || {};

  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
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
        localStorage.setItem(key, serialize(newValue));
      } catch (error) {
        logger.warn(`Failed to persist state for key ${key}`, error);
      }
      
      return newValue;
    });
  }, [key, serialize]);

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
          setState(deserialize(e.newValue));
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
 */
export function useAsyncState<T>(
  asyncFunction: () => Promise<T>,
  dependencies: React.DependencyList = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);

  const execute = useCallback(async () => {
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

  useEffect(() => {
    execute();
  }, dependencies);

  const retry = useCallback(() => {
    retryCountRef.current += 1;
    execute();
  }, [execute]);

  return { data, loading, error, retry };
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