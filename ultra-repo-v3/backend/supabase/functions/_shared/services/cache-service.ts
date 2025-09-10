// Performance-optimized in-memory cache service with LRU eviction
interface CacheEntry<T> {
  data: T;
  expires: number;
  hits: number;
  lastAccess: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(maxSize = 1000, defaultTTL = 300000) { // 5 min default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  // Set with optional TTL
  set<T>(key: string, data: T, ttl?: number): void {
    // LRU eviction if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl ?? this.defaultTTL),
      hits: 0,
      lastAccess: Date.now(),
    });
  }

  // Get with hit tracking
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    
    return entry.data as T;
  }

  // Get or set pattern for atomic operations
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }

  // Batch get for multiple keys
  getMany<T>(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    
    return results;
  }

  // Batch set for multiple entries
  setMany<T>(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    for (const { key, value, ttl } of entries) {
      this.set(key, value, ttl);
    }
  }

  // Invalidate cache entries by pattern
  invalidate(pattern: string | RegExp): number {
    let count = 0;
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/\*/g, '.*'))
      : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  // Clear entire cache
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: (hitRate * 100).toFixed(2) + '%',
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  // Private: LRU eviction
  private evictLRU(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldest = key;
        oldestTime = entry.lastAccess;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
      this.stats.evictions++;
    }
  }

  // Private: Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    }
  }

  // Private: Estimate memory usage
  private estimateMemoryUsage(): string {
    let bytes = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      bytes += key.length * 2; // UTF-16
      bytes += JSON.stringify(entry.data).length * 2;
      bytes += 24; // Overhead for numbers and object structure
    }

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

export function getCache(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

// Cache decorators for functions
export function cached(ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cache = getCache();
      const key = `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
      
      return cache.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };
    
    return descriptor;
  };
}

// Cache key generator for complex objects
export function generateCacheKey(...parts: any[]): string {
  return parts
    .map(part => {
      if (typeof part === 'object') {
        return JSON.stringify(part);
      }
      return String(part);
    })
    .join(':');
}

// Performance timing wrapper
export function timed(label?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const methodLabel = label || `${target.constructor.name}.${propertyKey}`;
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        
        if (duration > 100) {
          console.warn(`[Performance] ${methodLabel} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        console.error(`[Performance] ${methodLabel} failed after ${duration.toFixed(2)}ms`, error);
        throw error;
      }
    };
    
    return descriptor;
  };
}