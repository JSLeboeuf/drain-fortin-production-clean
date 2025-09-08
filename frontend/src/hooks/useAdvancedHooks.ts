/**
 * Hooks Personnalisés Avancés - Drain Fortin CRM
 * Collection de hooks utilitaires modernes
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';

// Hook useDebounce - Optimise les recherches et inputs
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Hook useIntersectionObserver - Lazy loading et animations
interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const { threshold = 0.1, root = null, rootMargin = '0px', triggerOnce = false } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((element: Element | null) => {
    if (elementRef.current) {
      observerRef.current?.unobserve(elementRef.current);
    }

    elementRef.current = element;

    if (element) {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    }
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);

        if (triggerOnce && entry.isIntersecting && observerRef.current) {
          observerRef.current.disconnect();
        }
      },
      { threshold, root, rootMargin }
    );

    observerRef.current.observe(elementRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, root, rootMargin, triggerOnce]);

  return { ref: setRef, isIntersecting, entry };
}

// Hook useMediaQuery - Responsive design
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Hook useLocalStorage - Persistance locale avec TypeScript
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// Hook useNotification - Interface avec le store notifications
export function useNotification() {
  const addNotification = useAppStore(state => state.addNotification);

  const notify = useCallback({
    success: (title: string, message?: string) =>
      addNotification({ type: 'success', title, message }),
    
    error: (title: string, message?: string) =>
      addNotification({ type: 'error', title, message, persistent: true }),
    
    warning: (title: string, message?: string) =>
      addNotification({ type: 'warning', title, message }),
    
    info: (title: string, message?: string) =>
      addNotification({ type: 'info', title, message }),
  }, [addNotification]);

  return notify;
}

// Hook useKeyboard - Gestion des raccourcis clavier
interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

export function useKeyboard(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const {
          key,
          metaKey = false,
          ctrlKey = false,
          shiftKey = false,
          altKey = false,
          callback,
          preventDefault = true,
        } = shortcut;

        if (
          event.key.toLowerCase() === key.toLowerCase() &&
          event.metaKey === metaKey &&
          event.ctrlKey === ctrlKey &&
          event.shiftKey === shiftKey &&
          event.altKey === altKey
        ) {
          if (preventDefault) {
            event.preventDefault();
          }
          callback(event);
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Hook useClickOutside - Fermer modals/dropdowns
export function useClickOutside<T extends HTMLElement>(
  callback: () => void
): React.RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [callback]);

  return ref;
}

// Hook useAsync - Gestion des états async
interface UseAsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
): UseAsyncState<T> & { execute: () => Promise<void> } {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, isError: false, error: null }));
    
    try {
      const data = await asyncFunction();
      setState({
        data,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      });
    } catch (error) {
      setState({
        data: null,
        error: error as Error,
        isLoading: false,
        isError: true,
        isSuccess: false,
      });
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { ...state, execute };
}

// Hook useOptimisticUpdate - Mise à jour optimiste
export function useOptimisticUpdate<T>(
  key: string,
  currentData: T
): [T, (newData: T) => void, () => void] {
  const { optimisticUpdates, addOptimisticUpdate, removeOptimisticUpdate } = useAppStore();

  const optimisticData = useMemo(() => {
    return optimisticUpdates.get(key) || currentData;
  }, [optimisticUpdates, key, currentData]);

  const updateOptimistic = useCallback(
    (newData: T) => {
      addOptimisticUpdate(key, newData);
    },
    [addOptimisticUpdate, key]
  );

  const revert = useCallback(() => {
    removeOptimisticUpdate(key);
  }, [removeOptimisticUpdate, key]);

  return [optimisticData, updateOptimistic, revert];
}

// Hook useWindowSize - Dimensions de la fenêtre
interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// Hook usePrevious - Valeur précédente
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}