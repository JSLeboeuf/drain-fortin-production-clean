/**
 * Advanced Data Flow Management
 * Optimized patterns for state and data handling
 */

import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { logger } from './logger';

// Event-driven state management
export class EventBus<T extends Record<string, any>> {
  private events: Map<keyof T, Set<(data: any) => void>> = new Map();
  private history: Array<{ event: keyof T; data: any; timestamp: number }> = [];
  private maxHistory = 50;

  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.events.get(event)?.delete(handler);
    };
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    // Add to history
    this.history.push({ event, data, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Notify listeners
    this.events.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        logger.error(`EventBus handler error for ${String(event)}`, error);
      }
    });
  }

  once<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    const wrappedHandler = (data: T[K]) => {
      handler(data);
      this.off(event, wrappedHandler);
    };
    this.on(event, wrappedHandler);
  }

  off<K extends keyof T>(event: K, handler?: (data: T[K]) => void): void {
    if (handler) {
      this.events.get(event)?.delete(handler);
    } else {
      this.events.delete(event);
    }
  }

  clear(): void {
    this.events.clear();
    this.history = [];
  }

  getHistory(): typeof this.history {
    return [...this.history];
  }
}

// Global event bus instance
export const globalEventBus = new EventBus<{
  userLogin: { userId: string; timestamp: Date };
  userLogout: { userId: string };
  dataUpdate: { source: string; data: any };
  error: { error: Error; context?: string };
  notification: { type: 'success' | 'error' | 'info'; message: string };
}>();

// React hook for event bus
export function useEventBus<T extends Record<string, any>>() {
  const busRef = useRef(new EventBus<T>());
  
  useEffect(() => {
    return () => {
      busRef.current.clear();
    };
  }, []);

  return busRef.current;
}

// Observable state pattern
export class ObservableState<T> {
  private value: T;
  private observers: Set<(value: T, prevValue: T) => void> = new Set();
  private history: T[] = [];
  private maxHistory = 10;

  constructor(initialValue: T) {
    this.value = initialValue;
    this.history.push(initialValue);
  }

  get(): T {
    return this.value;
  }

  set(newValue: T | ((prev: T) => T)): void {
    const prevValue = this.value;
    this.value = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(prevValue)
      : newValue;

    // Update history
    this.history.push(this.value);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Notify observers
    this.observers.forEach(observer => {
      try {
        observer(this.value, prevValue);
      } catch (error) {
        logger.error('ObservableState observer error', error);
      }
    });
  }

  subscribe(observer: (value: T, prevValue: T) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  getHistory(): T[] {
    return [...this.history];
  }

  reset(): void {
    if (this.history.length > 0) {
      this.set(this.history[0]);
    }
  }

  undo(): void {
    if (this.history.length > 1) {
      this.history.pop(); // Remove current
      const prev = this.history[this.history.length - 1];
      this.value = prev;
      this.observers.forEach(observer => observer(this.value, this.value));
    }
  }
}

// React hook for observable state
export function useObservableState<T>(initialValue: T) {
  const [, forceUpdate] = useState({});
  const observableRef = useRef<ObservableState<T>>();

  if (!observableRef.current) {
    observableRef.current = new ObservableState(initialValue);
  }

  useEffect(() => {
    const unsubscribe = observableRef.current!.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  return observableRef.current;
}

// Data store with middleware
export interface StoreMiddleware<T> {
  name: string;
  before?: (state: T, action: any) => any;
  after?: (state: T, action: any) => void;
}

export class DataStore<T extends Record<string, any>> {
  private state: T;
  private subscribers: Set<(state: T) => void> = new Set();
  private middlewares: StoreMiddleware<T>[] = [];
  private actionHistory: Array<{ action: any; timestamp: number }> = [];

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return { ...this.state };
  }

  setState(updater: Partial<T> | ((prev: T) => Partial<T>)): void {
    const updates = typeof updater === 'function' 
      ? updater(this.state)
      : updater;

    const action = { type: 'SET_STATE', payload: updates };
    
    // Apply before middlewares
    let processedAction = action;
    for (const middleware of this.middlewares) {
      if (middleware.before) {
        processedAction = middleware.before(this.state, processedAction) || processedAction;
      }
    }

    // Update state
    this.state = { ...this.state, ...updates };
    
    // Record action
    this.actionHistory.push({ action: processedAction, timestamp: Date.now() });
    if (this.actionHistory.length > 100) {
      this.actionHistory.shift();
    }

    // Apply after middlewares
    for (const middleware of this.middlewares) {
      if (middleware.after) {
        middleware.after(this.state, processedAction);
      }
    }

    // Notify subscribers
    this.notifySubscribers();
  }

  subscribe(callback: (state: T) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  use(middleware: StoreMiddleware<T>): void {
    this.middlewares.push(middleware);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        logger.error('DataStore subscriber error', error);
      }
    });
  }

  getActionHistory(): typeof this.actionHistory {
    return [...this.actionHistory];
  }
}

// React hook for data store
export function useDataStore<T extends Record<string, any>>(
  initialState: T
): [T, (updater: Partial<T> | ((prev: T) => Partial<T>)) => void] {
  const [state, setState] = useState(initialState);
  const storeRef = useRef<DataStore<T>>();

  if (!storeRef.current) {
    storeRef.current = new DataStore(initialState);
  }

  useEffect(() => {
    const unsubscribe = storeRef.current!.subscribe(setState);
    return unsubscribe;
  }, []);

  const updateState = useCallback((updater: Partial<T> | ((prev: T) => Partial<T>)) => {
    storeRef.current!.setState(updater);
  }, []);

  return [state, updateState];
}

// Optimistic updates manager
export class OptimisticUpdater<T> {
  private baseState: T;
  private optimisticState: T;
  private pendingUpdates: Map<string, any> = new Map();
  private subscribers: Set<(state: T) => void> = new Set();

  constructor(initialState: T) {
    this.baseState = initialState;
    this.optimisticState = initialState;
  }

  applyOptimistic(id: string, updater: (state: T) => T): void {
    this.pendingUpdates.set(id, updater);
    this.optimisticState = updater(this.optimisticState);
    this.notify();
  }

  commit(id: string, newBaseState?: T): void {
    if (newBaseState) {
      this.baseState = newBaseState;
    }
    this.pendingUpdates.delete(id);
    this.recalculateOptimisticState();
  }

  revert(id: string): void {
    this.pendingUpdates.delete(id);
    this.recalculateOptimisticState();
  }

  private recalculateOptimisticState(): void {
    this.optimisticState = this.baseState;
    this.pendingUpdates.forEach(updater => {
      this.optimisticState = updater(this.optimisticState);
    });
    this.notify();
  }

  getState(): T {
    return this.optimisticState;
  }

  subscribe(callback: (state: T) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    this.subscribers.forEach(callback => callback(this.optimisticState));
  }
}

// React hook for optimistic updates
export function useOptimisticState<T>(
  initialState: T,
  serverUpdate: (state: T) => Promise<T>
) {
  const [state, setState] = useState(initialState);
  const updaterRef = useRef<OptimisticUpdater<T>>();

  if (!updaterRef.current) {
    updaterRef.current = new OptimisticUpdater(initialState);
  }

  useEffect(() => {
    const unsubscribe = updaterRef.current!.subscribe(setState);
    return unsubscribe;
  }, []);

  const update = useCallback(async (updater: (state: T) => T) => {
    const updateId = Math.random().toString(36);
    
    // Apply optimistic update
    updaterRef.current!.applyOptimistic(updateId, updater);
    
    try {
      // Perform server update
      const newState = await serverUpdate(updaterRef.current!.getState());
      updaterRef.current!.commit(updateId, newState);
    } catch (error) {
      // Revert on error
      updaterRef.current!.revert(updateId);
      throw error;
    }
  }, [serverUpdate]);

  return [state, update] as const;
}

// Query cache manager
export class QueryCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data as T;
  }

  set(key: string, data: any, ttl = 5 * 60 * 1000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
    this.notifySubscribers(key, data);
  }

  invalidate(pattern?: string | RegExp): void {
    if (!pattern) {
      this.cache.clear();
    } else if (typeof pattern === 'string') {
      this.cache.delete(pattern);
    } else {
      Array.from(this.cache.keys())
        .filter(key => pattern.test(key))
        .forEach(key => this.cache.delete(key));
    }
  }

  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);
    
    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  private notifySubscribers(key: string, data: any): void {
    this.subscribers.get(key)?.forEach(callback => callback(data));
  }

  getSize(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global query cache instance
export const queryCache = new QueryCache();

// React hook for cached queries
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; staleWhileRevalidate?: boolean }
) {
  const [data, setData] = useState<T | undefined>(() => queryCache.get(key));
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher();
      queryCache.set(key, result, options?.ttl);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, options?.ttl]);

  useEffect(() => {
    const cached = queryCache.get<T>(key);
    
    if (cached) {
      setData(cached);
      if (options?.staleWhileRevalidate) {
        fetch(); // Revalidate in background
      }
    } else {
      fetch();
    }

    const unsubscribe = queryCache.subscribe(key, setData);
    return unsubscribe;
  }, [key]);

  return { data, loading, error, refetch: fetch };
}