// High-performance optimization service for sub-200ms response times
// Implements caching, compression, parallel processing, and database optimization

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { logger } from '../utils/logging.ts';
import { executePooledQuery } from './connection-pool.ts';

export interface PerformanceConfig {
  enableCaching: boolean;
  enableCompression: boolean;
  enableParallelProcessing: boolean;
  enableQueryOptimization: boolean;
  cacheMaxAge: number;
  compressionThreshold: number;
  parallelQueryThreshold: number;
  maxConcurrentQueries: number;
  queryTimeoutMs: number;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableCaching: true,
  enableCompression: true,
  enableParallelProcessing: true,
  enableQueryOptimization: true,
  cacheMaxAge: parseInt(Deno.env.get('CACHE_MAX_AGE') || '300'), // 5 minutes
  compressionThreshold: parseInt(Deno.env.get('COMPRESSION_THRESHOLD') || '1024'), // 1KB
  parallelQueryThreshold: parseInt(Deno.env.get('PARALLEL_QUERY_THRESHOLD') || '3'),
  maxConcurrentQueries: parseInt(Deno.env.get('MAX_CONCURRENT_QUERIES') || '10'),
  queryTimeoutMs: parseInt(Deno.env.get('QUERY_TIMEOUT_MS') || '5000'), // 5 seconds
};

// High-performance in-memory cache with LRU eviction
class HighPerformanceCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>();
  private maxSize: number;
  private currentSize = 0;
  private accessCounter = 0;

  constructor(maxSizeMB = 50) {
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  }

  set(key: string, value: any, ttlSeconds = 300): void {
    const serialized = JSON.stringify(value);
    const size = new Blob([serialized]).size;
    
    // Check if we need to evict items
    this.evictIfNeeded(size);
    
    const entry: CacheEntry = {
      value: serialized,
      size,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttlSeconds * 1000),
      accessCount: 1,
      lastAccessed: Date.now()
    };
    
    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    this.currentSize += size;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    
    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.accessOrder.set(key, ++this.accessCounter);
    
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      this.delete(key);
      return null;
    }
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }
  }

  private evictIfNeeded(newItemSize: number): void {
    while (this.currentSize + newItemSize > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  getStats(): CacheStats {
    let totalAccesses = 0;
    let expiredEntries = 0;
    const now = Date.now();
    
    for (const entry of this.cache.values()) {
      totalAccesses += entry.accessCount;
      if (now > entry.expiresAt) {
        expiredEntries++;
      }
    }
    
    return {
      size: this.cache.size,
      memoryUsageMB: this.currentSize / (1024 * 1024),
      maxMemoryMB: this.maxSize / (1024 * 1024),
      utilization: (this.currentSize / this.maxSize) * 100,
      totalAccesses,
      expiredEntries,
      hitRate: 0 // Would need hit/miss tracking
    };
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.currentSize = 0;
    this.accessCounter = 0;
  }
}

interface CacheEntry {
  value: string;
  size: number;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  size: number;
  memoryUsageMB: number;
  maxMemoryMB: number;
  utilization: number;
  totalAccesses: number;
  expiredEntries: number;
  hitRate: number;
}

// Global cache instance
const globalCache = new HighPerformanceCache();

// Response compression utility
export function compressResponse(data: any, threshold = DEFAULT_PERFORMANCE_CONFIG.compressionThreshold): {
  compressed: boolean;
  data: string;
  originalSize: number;
  compressedSize: number;
} {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  const originalSize = new Blob([serialized]).size;
  
  if (originalSize < threshold) {
    return {
      compressed: false,
      data: serialized,
      originalSize,
      compressedSize: originalSize
    };
  }
  
  // Note: Deno doesn't have built-in compression in Edge Functions
  // This would typically use gzip/brotli compression
  // For now, we'll simulate the interface
  return {
    compressed: false, // Would be true with actual compression
    data: serialized,
    originalSize,
    compressedSize: originalSize // Would be smaller with actual compression
  };
}

// Parallel query execution manager
export class ParallelQueryManager {
  private activeQueries = new Set<Promise<any>>();
  private maxConcurrent: number;

  constructor(maxConcurrent = DEFAULT_PERFORMANCE_CONFIG.maxConcurrentQueries) {
    this.maxConcurrent = maxConcurrent;
  }

  async execute<T>(
    queries: Array<() => Promise<T>>,
    options?: { timeout?: number; failFast?: boolean }
  ): Promise<T[]> {
    const { timeout = DEFAULT_PERFORMANCE_CONFIG.queryTimeoutMs, failFast = false } = options || {};
    
    if (queries.length <= this.maxConcurrent) {
      // Execute all queries in parallel
      return this.executeBatch(queries, timeout, failFast);
    }
    
    // Execute in batches to respect concurrency limit
    const results: T[] = [];
    
    for (let i = 0; i < queries.length; i += this.maxConcurrent) {
      const batch = queries.slice(i, i + this.maxConcurrent);
      const batchResults = await this.executeBatch(batch, timeout, failFast);
      results.push(...batchResults);
    }
    
    return results;
  }

  private async executeBatch<T>(
    queries: Array<() => Promise<T>>,
    timeout: number,
    failFast: boolean
  ): Promise<T[]> {
    const startTime = performance.now();
    
    const wrappedQueries = queries.map(async (query, index) => {
      const queryStart = performance.now();
      
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Query ${index} timeout after ${timeout}ms`)), timeout);
        });
        
        const result = await Promise.race([query(), timeoutPromise]);
        const duration = performance.now() - queryStart;
        
        logger.debug('Parallel query completed', {
          queryIndex: index,
          duration: `${duration.toFixed(2)}ms`
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - queryStart;
        logger.warn('Parallel query failed', {
          queryIndex: index,
          duration: `${duration.toFixed(2)}ms`,
          error: (error as Error).message
        });
        
        if (failFast) {
          throw error;
        }
        
        return null as T;
      }
    });
    
    const results = failFast 
      ? await Promise.all(wrappedQueries)
      : await Promise.allSettled(wrappedQueries).then(results => 
          results.map(result => result.status === 'fulfilled' ? result.value : null)
        );
    
    const totalDuration = performance.now() - startTime;
    logger.info('Parallel query batch completed', {
      queryCount: queries.length,
      totalDuration: `${totalDuration.toFixed(2)}ms`,
      averageDuration: `${(totalDuration / queries.length).toFixed(2)}ms`,
      failedQueries: results.filter(r => r === null).length
    });
    
    return results;
  }
}

// Query optimization patterns
export class QueryOptimizer {
  private static instance: QueryOptimizer;
  private queryCache = new Map<string, any>();
  private queryStats = new Map<string, QueryStats>();

  static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  async optimizedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    options?: {
      ttl?: number;
      useCache?: boolean;
      usePool?: boolean;
      timeout?: number;
    }
  ): Promise<T> {
    const {
      ttl = DEFAULT_PERFORMANCE_CONFIG.cacheMaxAge,
      useCache = true,
      usePool = true,
      timeout = DEFAULT_PERFORMANCE_CONFIG.queryTimeoutMs
    } = options || {};

    const startTime = performance.now();
    
    // Try cache first
    if (useCache) {
      const cached = globalCache.get<T>(cacheKey);
      if (cached) {
        logger.debug('Cache hit', { cacheKey });
        this.updateQueryStats(cacheKey, performance.now() - startTime, true);
        return cached;
      }
    }
    
    // Execute query
    try {
      const result = usePool 
        ? await executePooledQuery(async () => queryFn(), { timeout })
        : await queryFn();
      
      const duration = performance.now() - startTime;
      
      // Cache result
      if (useCache && result) {
        globalCache.set(cacheKey, result, ttl);
      }
      
      this.updateQueryStats(cacheKey, duration, false);
      
      logger.debug('Query executed successfully', {
        cacheKey,
        duration: `${duration.toFixed(2)}ms`,
        cached: false,
        usePool
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.updateQueryStats(cacheKey, duration, false, true);
      
      logger.error('Optimized query failed', error as Error, {
        cacheKey,
        duration: `${duration.toFixed(2)}ms`,
        usePool
      });
      
      throw error;
    }
  }

  private updateQueryStats(
    cacheKey: string,
    duration: number,
    cacheHit: boolean,
    error = false
  ): void {
    const stats = this.queryStats.get(cacheKey) || {
      totalExecutions: 0,
      totalDuration: 0,
      cacheHits: 0,
      errors: 0,
      averageDuration: 0,
      lastExecuted: 0
    };
    
    stats.totalExecutions++;
    stats.totalDuration += duration;
    stats.lastExecuted = Date.now();
    
    if (cacheHit) {
      stats.cacheHits++;
    }
    
    if (error) {
      stats.errors++;
    }
    
    stats.averageDuration = stats.totalDuration / stats.totalExecutions;
    
    this.queryStats.set(cacheKey, stats);
  }

  getQueryStats(): Array<QueryStats & { cacheKey: string }> {
    return Array.from(this.queryStats.entries()).map(([cacheKey, stats]) => ({
      cacheKey,
      ...stats
    }));
  }

  clearQueryStats(): void {
    this.queryStats.clear();
  }
}

interface QueryStats {
  totalExecutions: number;
  totalDuration: number;
  cacheHits: number;
  errors: number;
  averageDuration: number;
  lastExecuted: number;
}

// Main performance optimization wrapper
export async function withPerformanceOptimization<T>(
  request: Request,
  handler: () => Promise<T>,
  config: Partial<PerformanceConfig> = {}
): Promise<Response> {
  const fullConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  const startTime = performance.now();
  const operationId = logger.startOperation('performance-optimization');

  try {
    // Execute handler
    const result = await handler();
    
    // Optimize response
    const optimization = compressResponse(result, fullConfig.compressionThreshold);
    
    // Prepare response headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add performance headers
    const duration = performance.now() - startTime;
    headers['X-Response-Time'] = `${duration.toFixed(2)}ms`;
    headers['X-Cache-Status'] = 'MISS'; // Would be determined by actual cache usage
    
    if (optimization.compressed) {
      headers['Content-Encoding'] = 'gzip';
      headers['X-Original-Size'] = optimization.originalSize.toString();
      headers['X-Compressed-Size'] = optimization.compressedSize.toString();
    }

    // Add cache headers if applicable
    if (fullConfig.enableCaching) {
      headers['Cache-Control'] = `public, max-age=${fullConfig.cacheMaxAge}`;
      headers['ETag'] = `"${await generateETag(optimization.data)}"`;
    }

    logger.endOperation('performance-optimization', operationId, {
      duration: `${duration.toFixed(2)}ms`,
      compressed: optimization.compressed,
      originalSize: optimization.originalSize,
      compressedSize: optimization.compressedSize,
      compressionRatio: optimization.originalSize > 0 
        ? `${((1 - optimization.compressedSize / optimization.originalSize) * 100).toFixed(1)}%`
        : '0%'
    });

    return new Response(optimization.data, {
      status: 200,
      headers
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    
    logger.failOperation('performance-optimization', operationId, error as Error, {
      duration: `${duration.toFixed(2)}ms`
    });

    return new Response(
      JSON.stringify({
        error: {
          code: 'PERFORMANCE_ERROR',
          message: 'Request processing failed'
        }
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${duration.toFixed(2)}ms`
        }
      }
    );
  }
}

// ETag generation for caching
async function generateETag(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// Performance monitoring and metrics
export function getPerformanceMetrics(): {
  cache: CacheStats;
  queries: Array<QueryStats & { cacheKey: string }>;
  config: PerformanceConfig;
} {
  return {
    cache: globalCache.getStats(),
    queries: QueryOptimizer.getInstance().getQueryStats(),
    config: DEFAULT_PERFORMANCE_CONFIG
  };
}

// Warm up cache with common queries
export async function warmUpCache(
  commonQueries: Array<{ key: string; queryFn: () => Promise<any>; ttl?: number }>
): Promise<void> {
  const startTime = performance.now();
  const parallelManager = new ParallelQueryManager();
  
  const warmupQueries = commonQueries.map(({ key, queryFn, ttl }) => async () => {
    try {
      const result = await queryFn();
      globalCache.set(key, result, ttl);
      return { key, success: true };
    } catch (error) {
      logger.warn('Cache warmup failed for query', { key, error: (error as Error).message });
      return { key, success: false, error: (error as Error).message };
    }
  });
  
  const results = await parallelManager.execute(warmupQueries, { failFast: false });
  const duration = performance.now() - startTime;
  const successful = results.filter(r => r && r.success).length;
  
  logger.info('Cache warmup completed', {
    totalQueries: commonQueries.length,
    successful,
    failed: commonQueries.length - successful,
    duration: `${duration.toFixed(2)}ms`
  });
}

// Cleanup function for performance optimization
export function cleanupPerformanceOptimizations(): void {
  globalCache.clear();
  QueryOptimizer.getInstance().clearQueryStats();
  logger.info('Performance optimizations cleaned up');
}