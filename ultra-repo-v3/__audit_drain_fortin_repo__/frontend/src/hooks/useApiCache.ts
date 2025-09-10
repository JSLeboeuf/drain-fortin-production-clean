import { useCallback, useRef, useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';

interface CacheConfig {
  staleTime?: number;        // Temps avant que les données soient considérées périmées
  cacheTime?: number;        // Temps de conservation en cache
  refetchInterval?: number;  // Intervalle de rafraîchissement
  dedupeInterval?: number;   // Éviter requêtes dupliquées dans cet intervalle
}

const DEFAULT_CONFIG: CacheConfig = {
  staleTime: 60000,         // 1 minute
  cacheTime: 300000,        // 5 minutes
  refetchInterval: 120000,  // 2 minutes (réduit de 30s)
  dedupeInterval: 5000      // 5 secondes
};

// Configuration optimisée par endpoint
const ENDPOINT_CONFIG: Record<string, CacheConfig> = {
  '/api/analytics/dashboard': {
    staleTime: 120000,      // 2 minutes
    cacheTime: 600000,      // 10 minutes
    refetchInterval: 180000, // 3 minutes
    dedupeInterval: 10000
  },
  '/api/metrics/enhanced': {
    staleTime: 120000,
    cacheTime: 600000,
    refetchInterval: 180000,
    dedupeInterval: 10000
  },
  '/api/alerts/sla': {
    staleTime: 60000,
    cacheTime: 300000,
    refetchInterval: 120000,  // 2 minutes pour alertes
    dedupeInterval: 5000
  },
  '/api/alerts/constraints': {
    staleTime: 300000,       // 5 minutes
    cacheTime: 900000,       // 15 minutes
    refetchInterval: 600000, // 10 minutes
    dedupeInterval: 30000
  },
  '/api/calls/recent': {
    staleTime: 30000,        // 30 secondes
    cacheTime: 180000,       // 3 minutes
    refetchInterval: 60000,  // 1 minute
    dedupeInterval: 5000
  },
  '/api/settings': {
    staleTime: 600000,       // 10 minutes
    cacheTime: 1800000,      // 30 minutes
    refetchInterval: null,   // Pas de refresh auto
    dedupeInterval: 60000
  }
};

export function useApiCache(endpoint: string, customConfig?: CacheConfig) {
  const config = { 
    ...DEFAULT_CONFIG, 
    ...ENDPOINT_CONFIG[endpoint], 
    ...customConfig 
  };
  
  const lastFetch = useRef<Record<string, number>>({});
  const pendingRequests = useRef<Record<string, Promise<any>>>({});

  // Nettoyer les requêtes en cours périodiquement
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      Object.keys(lastFetch.current).forEach(key => {
        if (now - lastFetch.current[key] > 60000) {
          delete lastFetch.current[key];
          delete pendingRequests.current[key];
        }
      });
    }, 60000);

    return () => clearInterval(cleanup);
  }, []);

  const fetchWithCache = useCallback(async (url: string, options?: RequestInit) => {
    const cacheKey = `${url}${JSON.stringify(options?.body || '')}`;
    const now = Date.now();
    
    // Vérifier si une requête identique est déjà en cours
    if (pendingRequests.current[cacheKey]) {
      return pendingRequests.current[cacheKey];
    }
    
    // Vérifier la déduplication
    if (config.dedupeInterval && lastFetch.current[cacheKey]) {
      const timeSinceLastFetch = now - lastFetch.current[cacheKey];
      if (timeSinceLastFetch < config.dedupeInterval) {
        // Retourner les données du cache si disponibles
        const cachedData = queryClient.getQueryData([url]);
        if (cachedData) return Promise.resolve(cachedData);
      }
    }

    // Nouvelle requête
    lastFetch.current[cacheKey] = now;
    
    const request = fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        'Cache-Control': 'max-age=60',
        'X-Request-Time': now.toString()
      }
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      // Mettre en cache
      queryClient.setQueryData([url], data, {
        stale: config.staleTime
      });
      
      delete pendingRequests.current[cacheKey];
      return data;
    }).catch(error => {
      delete pendingRequests.current[cacheKey];
      throw error;
    });

    pendingRequests.current[cacheKey] = request;
    return request;
  }, [config]);

  const invalidateCache = useCallback((patterns?: string[]) => {
    if (patterns) {
      patterns.forEach(pattern => {
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.includes(pattern);
          }
        });
      });
    } else {
      queryClient.invalidateQueries();
    }
  }, []);

  const prefetchData = useCallback(async (urls: string[]) => {
    const promises = urls.map(url => {
      const config = ENDPOINT_CONFIG[url] || DEFAULT_CONFIG;
      return queryClient.prefetchQuery({
        queryKey: [url],
        queryFn: () => fetchWithCache(url),
        staleTime: config.staleTime,
        cacheTime: config.cacheTime
      });
    });
    
    await Promise.all(promises);
  }, [fetchWithCache]);

  return {
    fetchWithCache,
    invalidateCache,
    prefetchData,
    config
  };
}

// Hook pour optimiser les requêtes du dashboard
export function useOptimizedDashboard() {
  const cache = useApiCache('/api/analytics/dashboard');
  
  useEffect(() => {
    // Précharger les données critiques au montage
    cache.prefetchData([
      '/api/analytics/dashboard',
      '/api/metrics/enhanced',
      '/api/alerts/sla',
      '/api/calls/recent/5'
    ]);
  }, []);

  return cache;
}

// Gestionnaire de batch pour requêtes multiples
export function useBatchRequests() {
  const batch = useRef<Array<{ url: string; resolve: Function; reject: Function }>>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const executeBatch = useCallback(async () => {
    if (batch.current.length === 0) return;
    
    const currentBatch = [...batch.current];
    batch.current = [];
    
    try {
      const responses = await Promise.all(
        currentBatch.map(({ url }) => fetch(url).then(r => r.json()))
      );
      
      currentBatch.forEach(({ resolve }, index) => {
        resolve(responses[index]);
      });
    } catch (error) {
      currentBatch.forEach(({ reject }) => {
        reject(error);
      });
    }
  }, []);

  const addToBatch = useCallback((url: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      batch.current.push({ url, resolve, reject });
      
      // Débounce: attendre 50ms pour grouper les requêtes
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(executeBatch, 50);
    });
  }, [executeBatch]);

  return { addToBatch };
}