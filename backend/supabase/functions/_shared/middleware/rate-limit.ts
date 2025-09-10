// Rate limiting middleware for Supabase Edge Functions
import { RateLimitError } from '../utils/errors.ts';
import { logger } from '../utils/logging.ts';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (request: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  headers?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked?: boolean;
}

class InMemoryStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: number;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = await this.get(key);

    if (!existing) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs
      };
      await this.set(key, newEntry);
      return newEntry;
    }

    existing.count++;
    await this.set(key, existing);
    return existing;
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.store.delete(key);
    }

    if (expiredKeys.length > 0) {
      logger.debug('Rate limit store cleanup', { 
        expiredKeys: expiredKeys.length,
        activeKeys: this.store.size
      });
    }
  }

  getStats(): { activeKeys: number; totalRequests: number } {
    let totalRequests = 0;
    for (const entry of this.store.values()) {
      totalRequests += entry.count;
    }

    return {
      activeKeys: this.store.size,
      totalRequests
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Default configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute per IP
    keyGenerator: (req: Request) => getClientIP(req) || 'unknown',
    message: 'Too many webhook requests'
  },
  
  healthCheck: {
    windowMs: 60 * 1000, // 1 minute  
    maxRequests: 30, // 30 health checks per minute per IP
    keyGenerator: (req: Request) => getClientIP(req) || 'unknown',
    skipSuccessfulRequests: true,
    message: 'Too many health check requests'
  },

  smsAlert: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 SMS per 5 minutes per phone number
    keyGenerator: (req: Request) => {
      // Extract phone number from request body if possible
      try {
        const url = new URL(req.url);
        const phone = url.searchParams.get('phone');
        return phone || getClientIP(req) || 'unknown';
      } catch {
        return getClientIP(req) || 'unknown';
      }
    },
    message: 'SMS rate limit exceeded'
  },

  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes per IP
    keyGenerator: (req: Request) => getClientIP(req) || 'unknown',
    message: 'API rate limit exceeded'
  }
};

class RateLimiter {
  private store: InMemoryStore;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.store = new InMemoryStore();
  }

  async checkLimit(request: Request): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const key = this.config.keyGenerator(request);
    const entry = await this.store.increment(key, this.config.windowMs);

    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    logger.debug('Rate limit check', {
      key: this.maskKey(key),
      count: entry.count,
      limit: this.config.maxRequests,
      allowed,
      remaining,
      windowMs: this.config.windowMs
    });

    if (!allowed) {
      logger.warn('Rate limit exceeded', {
        key: this.maskKey(key),
        count: entry.count,
        limit: this.config.maxRequests,
        windowMs: this.config.windowMs
      });
    }

    return {
      allowed,
      limit: this.config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - Date.now()) / 1000)
    };
  }

  private maskKey(key: string): string {
    if (key.includes('.')) {
      // Mask IP address
      const parts = key.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.xxx.xxx`;
      }
    }
    
    if (key.length > 6) {
      return key.substring(0, 3) + '***' + key.substring(key.length - 3);
    }
    
    return key;
  }

  getStats() {
    return this.store.getStats();
  }

  destroy() {
    this.store.destroy();
  }
}

// Global rate limiters for different endpoints
const rateLimiters = new Map<string, RateLimiter>();

export function getRateLimiter(name: keyof typeof RATE_LIMIT_CONFIGS): RateLimiter {
  if (!rateLimiters.has(name)) {
    rateLimiters.set(name, new RateLimiter(RATE_LIMIT_CONFIGS[name]));
  }
  return rateLimiters.get(name)!;
}

// Middleware function for rate limiting
export async function withRateLimit(
  request: Request,
  limiterName: keyof typeof RATE_LIMIT_CONFIGS,
  next: () => Promise<Response>
): Promise<Response> {
  const limiter = getRateLimiter(limiterName);
  const result = await limiter.checkLimit(request);

  // Add rate limit headers
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

  if (!result.allowed) {
    headers.set('Retry-After', result.retryAfter!.toString());
    
    const config = RATE_LIMIT_CONFIGS[limiterName];
    const error = new RateLimitError(
      result.limit,
      `${config.windowMs / 1000}s`,
      result.retryAfter
    );

    logger.warn('Request rate limited', {
      limiter: limiterName,
      limit: result.limit,
      count: result.limit - result.remaining + 1,
      retryAfter: result.retryAfter
    });

    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: config.message || error.message,
          retryAfter: result.retryAfter
        }
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries())
        }
      }
    );
  }

  // Execute the request
  const response = await next();

  // Add rate limit headers to successful response
  const responseHeaders = new Headers(response.headers);
  for (const [key, value] of headers.entries()) {
    responseHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}

// Helper function to extract client IP
function getClientIP(request: Request): string | null {
  // Try different headers in order of preference
  const headers = [
    'cf-connecting-ip', // Cloudflare
    'x-forwarded-for',  // Load balancers
    'x-real-ip',        // Nginx
    'x-client-ip',      // Apache
    'x-forwarded',      // General
    'forwarded-for',    // General
    'forwarded'         // RFC 7239
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip && isValidIP(ip)) {
        return ip;
      }
    }
  }

  return null;
}

function isValidIP(ip: string): boolean {
  // Simple IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // Simple IPv6 validation (basic check)
  const ipv6Regex = /^[0-9a-fA-F:]+$/;
  return ipv6Regex.test(ip) && ip.includes(':');
}

// Rate limiting decorator for functions
export function rateLimit(limiterName: keyof typeof RATE_LIMIT_CONFIGS) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (request: Request, ...args: any[]) {
      return withRateLimit(request, limiterName, async () => {
        return method.apply(this, [request, ...args]);
      });
    };

    return descriptor;
  };
}

// Health check for rate limiting system
export function getRateLimitStats(): Record<string, any> {
  const stats: Record<string, any> = {};
  
  for (const [name, limiter] of rateLimiters.entries()) {
    stats[name] = {
      config: RATE_LIMIT_CONFIGS[name as keyof typeof RATE_LIMIT_CONFIGS],
      stats: limiter.getStats()
    };
  }

  return stats;
}

// Cleanup function for graceful shutdown
export function cleanupRateLimiters(): void {
  for (const limiter of rateLimiters.values()) {
    limiter.destroy();
  }
  rateLimiters.clear();
  logger.info('Rate limiters cleaned up');
}