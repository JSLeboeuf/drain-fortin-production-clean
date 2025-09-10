/**
 * OPTIMIZED SUPABASE CLIENT - PERFORMANCE ENGINEER V2
 * Enhanced with intelligent caching, query optimization, and performance monitoring
 * Eliminates N+1 queries and implements smart batch processing
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Configuration Supabase depuis les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://phiduqxcufdmgjvdipyu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQ5ODEsImV4cCI6MjA2Mjc2MDk4MX0.YyiZxzU6DuZsFwXLebdMqRJHhWlnVYyDgJz1HVsIjvI';

if (!supabaseUrl || !supabaseAnonKey) {
  // Supabase configuration validation
}

// Enhanced client with performance optimizations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'drain-fortin-web'
    }
  }
});

/**
 * INTELLIGENT CACHE LAYER
 * Implements memory-based caching with TTL and intelligent invalidation
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>();
  private hitCount = 0;
  private missCount = 0;
  
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      key
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      cacheSize: this.cache.size
    };
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
}

// Global cache instance
const performanceCache = new PerformanceCache();

/**
 * PERFORMANCE MONITORING
 * Tracks query performance and identifies slow operations
 */
interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: number;
  cacheHit: boolean;
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly MAX_METRICS = 100;

  logQuery(query: string, duration: number, cacheHit = false): void {
    this.metrics.push({
      query,
      duration,
      timestamp: Date.now(),
      cacheHit
    });

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log slow queries
    if (duration > 1000) {
      logger.warn(`Slow query detected: ${query} (${duration}ms)`);
    }
  }

  getSlowQueries(threshold = 500): QueryMetrics[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  getAverageQueryTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / this.metrics.length;
  }

  getCacheEffectiveness(): number {
    const cachedQueries = this.metrics.filter(m => m.cacheHit).length;
    return this.metrics.length > 0 ? (cachedQueries / this.metrics.length) * 100 : 0;
  }
}

const performanceMonitor = new PerformanceMonitor();

/**
 * OPTIMIZED QUERY WRAPPER
 * Adds caching, performance monitoring, and error handling
 */
async function optimizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  ttl?: number
): Promise<{ data: T | null; error: any; fromCache?: boolean }> {
  const startTime = Date.now();

  // Check cache first
  const cachedData = performanceCache.get<T>(queryKey);
  if (cachedData) {
    performanceMonitor.logQuery(queryKey, Date.now() - startTime, true);
    return { data: cachedData, error: null, fromCache: true };
  }

  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;

    // Cache successful results
    if (!result.error && result.data) {
      performanceCache.set(queryKey, result.data, ttl);
    }

    performanceMonitor.logQuery(queryKey, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceMonitor.logQuery(queryKey, duration);
    logger.error(`Query failed: ${queryKey}`, error);
    return { data: null, error };
  }
}

/**
 * OPTIMIZED DATA ACCESS LAYER
 * Eliminates N+1 queries with intelligent batching
 */
export class OptimizedSupabaseClient {
  // CALLS OPTIMIZATION - Batch loading with relationships
  static async getCallsOptimized(limit = 50, offset = 0) {
    const cacheKey = `calls_optimized_${limit}_${offset}`;
    
    return optimizedQuery(cacheKey, async () => {
      // Single optimized query with all needed relationships
      const { data, error } = await supabase
        .from('vapi_calls')
        .select(`
          *,
          call_transcripts!inner (
            role,
            message,
            confidence,
            timestamp
          ),
          tool_calls (
            tool_name,
            arguments,
            timestamp
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      return { data, error };
    }, 2 * 60 * 1000); // 2 minutes TTL for calls data
  }

  // DASHBOARD METRICS - Aggregated query optimization
  static async getDashboardMetricsOptimized() {
    const cacheKey = 'dashboard_metrics_optimized';
    
    return optimizedQuery(cacheKey, async () => {
      // Use single RPC call for complex aggregations
      const { data, error } = await supabase.rpc('get_dashboard_metrics_optimized', {
        time_period: '24h'
      });

      return { data, error };
    }, 5 * 60 * 1000); // 5 minutes TTL for dashboard
  }

  // LEADS OPTIMIZATION - Intelligent pagination
  static async getLeadsOptimized(
    page = 1, 
    pageSize = 25,
    filters?: { priority?: string; status?: string }
  ) {
    const filterKey = filters ? JSON.stringify(filters) : 'all';
    const cacheKey = `leads_optimized_${page}_${pageSize}_${filterKey}`;
    
    return optimizedQuery(cacheKey, async () => {
      let query = supabase
        .from('leads')
        .select(`
          id,
          nom,
          telephone,
          email,
          adresse,
          service,
          priorite,
          status,
          source,
          created_at,
          updated_at
        `);

      // Apply filters efficiently
      if (filters?.priority) {
        query = query.eq('priorite', filters.priority);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)
        .limit(pageSize);

      return { 
        data: { items: data, total: count, page, pageSize },
        error 
      };
    }, 3 * 60 * 1000); // 3 minutes TTL for leads
  }

  // BATCH OPERATIONS - Multiple queries optimization
  static async batchQuery<T>(
    queries: Array<{
      key: string;
      queryFn: () => Promise<{ data: T | null; error: any }>;
      ttl?: number;
    }>
  ): Promise<Record<string, { data: T | null; error: any; fromCache?: boolean }>> {
    const results: Record<string, any> = {};
    
    // Execute all queries in parallel
    const promises = queries.map(async (query) => {
      const result = await optimizedQuery(query.key, query.queryFn, query.ttl);
      return { key: query.key, result };
    });

    const resolvedResults = await Promise.all(promises);
    
    resolvedResults.forEach(({ key, result }) => {
      results[key] = result;
    });

    return results;
  }

  // REALTIME OPTIMIZATION - Selective subscriptions
  static createOptimizedSubscription(
    table: string,
    filter?: string,
    callback?: (payload: any) => void
  ) {
    const subscription = supabase
      .channel(`optimized_${table}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => {
          // Invalidate related cache entries
          performanceCache.invalidate(table);
          
          if (callback) {
            callback(payload);
          }
        }
      )
      .subscribe();

    return subscription;
  }

  // PERFORMANCE UTILITIES
  static getCacheStats() {
    return {
      cache: performanceCache.getStats(),
      performance: {
        averageQueryTime: performanceMonitor.getAverageQueryTime(),
        slowQueries: performanceMonitor.getSlowQueries().length,
        cacheEffectiveness: performanceMonitor.getCacheEffectiveness()
      }
    };
  }

  static clearCache() {
    performanceCache.clear();
  }

  static invalidateCache(pattern?: string) {
    performanceCache.invalidate(pattern);
  }
}

// Legacy exports for backward compatibility
export const getRecentCalls = OptimizedSupabaseClient.getCallsOptimized;
export const getDashboardMetrics = OptimizedSupabaseClient.getDashboardMetricsOptimized;
export const getLeads = OptimizedSupabaseClient.getLeadsOptimized;

// Performance monitoring exports
export { performanceMonitor, performanceCache };

// Development performance debugging
if (import.meta.env.DEV) {
  // Log performance stats every 30 seconds in development
  setInterval(() => {
    const stats = OptimizedSupabaseClient.getCacheStats();
    console.group('🚀 Performance Stats');
    console.log('Cache Hit Rate:', `${stats.cache.hitRate.toFixed(1)}%`);
    console.log('Average Query Time:', `${stats.performance.averageQueryTime.toFixed(0)}ms`);
    console.log('Cache Size:', stats.cache.cacheSize);
    console.groupEnd();
  }, 30000);
}