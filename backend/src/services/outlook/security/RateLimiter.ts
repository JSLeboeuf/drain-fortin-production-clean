/**
 * RateLimiter.ts - Système de limitation de taux avancé
 * Implémente multiple algorithmes (Token Bucket, Sliding Window, Fixed Window)
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { EventEmitter } from 'events';
import { AuditLogger } from './AuditLogger';
import { CacheManager } from '../utils/CacheManager';
import {
  RateLimitConfig,
  RateLimitStrategy,
  RateLimitWindow,
  RateLimitResult,
  RateLimitStatistics,
  RateLimitBucket,
  RateLimitKey,
  RateLimitPolicy
} from '../config/outlook.types';

/**
 * Configuration par défaut du rate limiter
 */
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequestsPerMinute: 100,
  maxRequestsPerHour: 5000,
  maxConcurrentRequests: 10,
  backoffMultiplier: 2,
  strategy: 'sliding_window',
  windowSize: 60000, // 1 minute
  enableBurst: true,
  burstCapacity: 20,
  cleanupInterval: 300000, // 5 minutes
  policies: {
    default: {
      maxRequests: 100,
      windowMs: 60000,
      skipOnError: false
    }
  }
};

/**
 * Classe principale du rate limiter
 */
export class RateLimiter extends EventEmitter {
  private readonly config: RateLimitConfig;
  private readonly auditLogger?: AuditLogger;
  private readonly cacheManager: CacheManager;
  
  private buckets: Map<string, RateLimitBucket> = new Map();
  private concurrentRequests: Map<string, number> = new Map();
  private statistics: RateLimitStatistics = {
    totalRequests: 0,
    allowedRequests: 0,
    blockedRequests: 0,
    averageWaitTime: 0,
    peakConcurrency: 0,
    bucketsActive: 0
  };
  
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    config: Partial<RateLimitConfig> = {},
    dependencies: {
      auditLogger?: AuditLogger;
      cacheManager: CacheManager;
    }
  ) {
    super();
    
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    this.auditLogger = dependencies.auditLogger;
    this.cacheManager = dependencies.cacheManager;
    
    // Démarrer le nettoyage automatique
    this.startCleanupTimer();
    
    this.auditLogger?.log('info', 'RateLimiter initialized', {
      component: 'RateLimiter',
      strategy: this.config.strategy,
      maxRequestsPerMinute: this.config.maxRequestsPerMinute
    });
  }

  /**
   * Vérifie et applique la limitation de taux
   */
  async checkRateLimit(
    key: RateLimitKey,
    options: {
      weight?: number;
      policyName?: string;
      skipOnError?: boolean;
    } = {}
  ): Promise<RateLimitResult> {
    const { weight = 1, policyName = 'default', skipOnError } = options;
    const policy = this.config.policies[policyName] || this.config.policies.default;
    const startTime = Date.now();
    
    try {
      this.statistics.totalRequests++;
      
      // Générer la clé de bucket
      const bucketKey = this.generateBucketKey(key, policyName);
      
      // Vérifier les limites de concurrence
      const concurrencyCheck = await this.checkConcurrencyLimit(bucketKey, weight);
      if (!concurrencyCheck.allowed) {
        return concurrencyCheck;
      }
      
      // Appliquer la stratégie de rate limiting
      const rateLimitCheck = await this.applyRateLimitStrategy(
        bucketKey, 
        weight, 
        policy
      );
      
      if (rateLimitCheck.allowed) {
        this.statistics.allowedRequests++;
        this.incrementConcurrentRequests(bucketKey, weight);
        
        this.emit('requestAllowed', {
          key: bucketKey,
          weight,
          remaining: rateLimitCheck.remaining,
          resetTime: rateLimitCheck.resetTime
        });
      } else {
        this.statistics.blockedRequests++;
        
        this.emit('requestBlocked', {
          key: bucketKey,
          weight,
          retryAfter: rateLimitCheck.retryAfter,
          reason: 'rate_limit_exceeded'
        });
      }
      
      const duration = Date.now() - startTime;
      this.updateAverageWaitTime(duration);
      
      await this.auditLogger?.log('debug', 'Rate limit check completed', {
        component: 'RateLimiter',
        key: bucketKey,
        allowed: rateLimitCheck.allowed,
        remaining: rateLimitCheck.remaining,
        duration
      });
      
      return rateLimitCheck;
      
    } catch (error) {
      this.auditLogger?.log('error', 'Rate limit check failed', {
        component: 'RateLimiter',
        key: key.toString(),
        error: (error as Error).message
      });
      
      if (skipOnError ?? policy.skipOnError) {
        return {
          allowed: true,
          remaining: -1,
          resetTime: Date.now() + policy.windowMs,
          retryAfter: 0
        };
      }
      
      throw error;
    }
  }

  /**
   * Applique la stratégie de rate limiting
   */
  private async applyRateLimitStrategy(
    bucketKey: string,
    weight: number,
    policy: RateLimitPolicy
  ): Promise<RateLimitResult> {
    switch (this.config.strategy) {
      case 'token_bucket':
        return this.applyTokenBucketStrategy(bucketKey, weight, policy);
      
      case 'sliding_window':
        return this.applySlidingWindowStrategy(bucketKey, weight, policy);
      
      case 'fixed_window':
        return this.applyFixedWindowStrategy(bucketKey, weight, policy);
      
      default:
        return this.applySlidingWindowStrategy(bucketKey, weight, policy);
    }
  }

  /**
   * Implémente la stratégie Token Bucket
   */
  private async applyTokenBucketStrategy(
    bucketKey: string,
    weight: number,
    policy: RateLimitPolicy
  ): Promise<RateLimitResult> {
    const now = Date.now();
    let bucket = this.buckets.get(bucketKey);
    
    if (!bucket) {
      bucket = {
        tokens: policy.maxRequests,
        lastRefill: now,
        capacity: policy.maxRequests,
        refillRate: policy.maxRequests / (policy.windowMs / 1000), // tokens per second
        requests: []
      };
      this.buckets.set(bucketKey, bucket);
    }
    
    // Refill tokens
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / 1000) * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
    
    if (bucket.tokens >= weight) {
      bucket.tokens -= weight;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetTime: now + (policy.windowMs - (tokensToAdd * 1000 / bucket.refillRate)),
        retryAfter: 0
      };
    } else {
      const retryAfter = Math.ceil((weight - bucket.tokens) / bucket.refillRate * 1000);
      return {
        allowed: false,
        remaining: Math.floor(bucket.tokens),
        resetTime: now + retryAfter,
        retryAfter
      };
    }
  }

  /**
   * Implémente la stratégie Sliding Window
   */
  private async applySlidingWindowStrategy(
    bucketKey: string,
    weight: number,
    policy: RateLimitPolicy
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - policy.windowMs;
    
    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        tokens: 0,
        lastRefill: now,
        capacity: policy.maxRequests,
        refillRate: 0,
        requests: []
      };
      this.buckets.set(bucketKey, bucket);
    }
    
    // Nettoyer les anciennes requêtes
    bucket.requests = bucket.requests.filter(req => req.timestamp > windowStart);
    
    const currentRequests = bucket.requests.reduce((sum, req) => sum + req.weight, 0);
    const remaining = policy.maxRequests - currentRequests;
    
    if (remaining >= weight) {
      bucket.requests.push({ timestamp: now, weight });
      
      return {
        allowed: true,
        remaining: remaining - weight,
        resetTime: Math.min(...bucket.requests.map(r => r.timestamp)) + policy.windowMs,
        retryAfter: 0
      };
    } else {
      const oldestRequest = Math.min(...bucket.requests.map(r => r.timestamp));
      const retryAfter = (oldestRequest + policy.windowMs) - now;
      
      return {
        allowed: false,
        remaining,
        resetTime: oldestRequest + policy.windowMs,
        retryAfter: Math.max(0, retryAfter)
      };
    }
  }

  /**
   * Implémente la stratégie Fixed Window
   */
  private async applyFixedWindowStrategy(
    bucketKey: string,
    weight: number,
    policy: RateLimitPolicy
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / policy.windowMs) * policy.windowMs;
    const windowEnd = windowStart + policy.windowMs;
    
    let bucket = this.buckets.get(bucketKey);
    if (!bucket || bucket.lastRefill < windowStart) {
      bucket = {
        tokens: 0,
        lastRefill: windowStart,
        capacity: policy.maxRequests,
        refillRate: 0,
        requests: []
      };
      this.buckets.set(bucketKey, bucket);
    }
    
    if (bucket.tokens + weight <= policy.maxRequests) {
      bucket.tokens += weight;
      
      return {
        allowed: true,
        remaining: policy.maxRequests - bucket.tokens,
        resetTime: windowEnd,
        retryAfter: 0
      };
    } else {
      return {
        allowed: false,
        remaining: policy.maxRequests - bucket.tokens,
        resetTime: windowEnd,
        retryAfter: windowEnd - now
      };
    }
  }

  /**
   * Vérifie les limites de concurrence
   */
  private async checkConcurrencyLimit(
    bucketKey: string,
    weight: number
  ): Promise<RateLimitResult> {
    const current = this.concurrentRequests.get(bucketKey) || 0;
    
    if (current + weight <= this.config.maxConcurrentRequests) {
      return {
        allowed: true,
        remaining: this.config.maxConcurrentRequests - current - weight,
        resetTime: Date.now() + 60000, // Reset in 1 minute
        retryAfter: 0
      };
    } else {
      return {
        allowed: false,
        remaining: this.config.maxConcurrentRequests - current,
        resetTime: Date.now() + 60000,
        retryAfter: 1000 * this.config.backoffMultiplier // Exponential backoff
      };
    }
  }

  /**
   * Incrémente les requêtes concurrentes
   */
  private incrementConcurrentRequests(bucketKey: string, weight: number): void {
    const current = this.concurrentRequests.get(bucketKey) || 0;
    const newValue = current + weight;
    this.concurrentRequests.set(bucketKey, newValue);
    
    this.statistics.peakConcurrency = Math.max(this.statistics.peakConcurrency, newValue);
  }

  /**
   * Libère les requêtes concurrentes
   */
  async releaseRequest(
    key: RateLimitKey,
    options: {
      weight?: number;
      policyName?: string;
    } = {}
  ): Promise<void> {
    const { weight = 1, policyName = 'default' } = options;
    const bucketKey = this.generateBucketKey(key, policyName);
    
    const current = this.concurrentRequests.get(bucketKey) || 0;
    const newValue = Math.max(0, current - weight);
    
    if (newValue === 0) {
      this.concurrentRequests.delete(bucketKey);
    } else {
      this.concurrentRequests.set(bucketKey, newValue);
    }
    
    this.emit('requestReleased', {
      key: bucketKey,
      weight,
      remaining: this.config.maxConcurrentRequests - newValue
    });
    
    await this.auditLogger?.log('debug', 'Concurrent request released', {
      component: 'RateLimiter',
      key: bucketKey,
      weight,
      newConcurrentCount: newValue
    });
  }

  /**
   * Génère une clé unique pour le bucket
   */
  private generateBucketKey(key: RateLimitKey, policyName: string): string {
    if (typeof key === 'string') {
      return `${policyName}:${key}`;
    }
    
    if (typeof key === 'object') {
      const parts = [];
      if (key.userId) parts.push(`user:${key.userId}`);
      if (key.operation) parts.push(`op:${key.operation}`);
      if (key.resource) parts.push(`res:${key.resource}`);
      if (key.clientId) parts.push(`client:${key.clientId}`);
      
      return `${policyName}:${parts.join(':')}`;
    }
    
    return `${policyName}:${key}`;
  }

  /**
   * Met à jour le temps d'attente moyen
   */
  private updateAverageWaitTime(duration: number): void {
    const totalRequests = this.statistics.totalRequests;
    const currentAverage = this.statistics.averageWaitTime;
    
    this.statistics.averageWaitTime = 
      (currentAverage * (totalRequests - 1) + duration) / totalRequests;
  }

  /**
   * Démarre le timer de nettoyage
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Nettoie les buckets expirés
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, bucket] of this.buckets.entries()) {
      // Nettoyer les anciennes requêtes
      const windowStart = now - (this.config.windowSize || 60000);
      bucket.requests = bucket.requests.filter(req => req.timestamp > windowStart);
      
      // Supprimer les buckets vides et anciens
      if (bucket.requests.length === 0 && 
          (now - bucket.lastRefill) > this.config.cleanupInterval) {
        this.buckets.delete(key);
        cleaned++;
      }
    }
    
    this.statistics.bucketsActive = this.buckets.size;
    
    if (cleaned > 0) {
      this.auditLogger?.log('debug', 'Rate limiter cleanup completed', {
        component: 'RateLimiter',
        bucketsRemoved: cleaned,
        bucketsActive: this.statistics.bucketsActive
      });
    }
  }

  /**
   * Crée une politique de rate limiting personnalisée
   */
  addPolicy(name: string, policy: RateLimitPolicy): void {
    this.config.policies[name] = policy;
    
    this.auditLogger?.log('info', 'Rate limit policy added', {
      component: 'RateLimiter',
      policyName: name,
      maxRequests: policy.maxRequests,
      windowMs: policy.windowMs
    });
  }

  /**
   * Supprime une politique
   */
  removePolicy(name: string): void {
    if (name !== 'default') {
      delete this.config.policies[name];
      
      this.auditLogger?.log('info', 'Rate limit policy removed', {
        component: 'RateLimiter',
        policyName: name
      });
    }
  }

  /**
   * Obtient les statistiques du rate limiter
   */
  getStatistics(): RateLimitStatistics {
    return {
      ...this.statistics,
      bucketsActive: this.buckets.size,
      concurrentRequestsActive: Array.from(this.concurrentRequests.values())
        .reduce((sum, count) => sum + count, 0)
    };
  }

  /**
   * Réinitialise les statistiques
   */
  resetStatistics(): void {
    this.statistics = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      averageWaitTime: 0,
      peakConcurrency: 0,
      bucketsActive: this.buckets.size
    };
    
    this.auditLogger?.log('info', 'Rate limiter statistics reset', {
      component: 'RateLimiter'
    });
  }

  /**
   * Obtient l'état d'un bucket spécifique
   */
  getBucketState(key: RateLimitKey, policyName = 'default'): RateLimitBucket | undefined {
    const bucketKey = this.generateBucketKey(key, policyName);
    return this.buckets.get(bucketKey);
  }

  /**
   * Force la réinitialisation d'un bucket
   */
  resetBucket(key: RateLimitKey, policyName = 'default'): void {
    const bucketKey = this.generateBucketKey(key, policyName);
    this.buckets.delete(bucketKey);
    this.concurrentRequests.delete(bucketKey);
    
    this.auditLogger?.log('info', 'Rate limit bucket reset', {
      component: 'RateLimiter',
      key: bucketKey
    });
  }

  /**
   * Crée un middleware pour Express
   */
  createExpressMiddleware(options: {
    policyName?: string;
    keyGenerator?: (req: any) => RateLimitKey;
    skipOnError?: boolean;
  } = {}) {
    const { 
      policyName = 'default',
      keyGenerator = (req: any) => req.ip,
      skipOnError = false
    } = options;
    
    return async (req: any, res: any, next: any) => {
      try {
        const key = keyGenerator(req);
        const result = await this.checkRateLimit(key, { policyName, skipOnError });
        
        // Ajouter les headers de rate limiting
        res.set({
          'X-RateLimit-Limit': this.config.policies[policyName].maxRequests,
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });
        
        if (result.allowed) {
          // Nettoyer à la fin de la requête
          res.on('finish', () => {
            this.releaseRequest(key, { policyName }).catch(err => {
              this.auditLogger?.log('error', 'Failed to release request', {
                component: 'RateLimiter',
                error: err.message
              });
            });
          });
          
          next();
        } else {
          res.set('Retry-After', Math.ceil(result.retryAfter / 1000));
          res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: result.retryAfter
          });
        }
        
      } catch (error) {
        if (skipOnError) {
          next();
        } else {
          next(error);
        }
      }
    };
  }

  /**
   * Nettoie les ressources
   */
  async dispose(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.buckets.clear();
    this.concurrentRequests.clear();
    this.removeAllListeners();
    
    this.auditLogger?.log('info', 'RateLimiter disposed', {
      component: 'RateLimiter',
      finalStatistics: this.getStatistics()
    });
  }
}

export default RateLimiter;