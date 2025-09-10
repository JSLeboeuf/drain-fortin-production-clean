// Persistent (PostgreSQL) rate limiting for Supabase Edge Functions
import { logger } from '../utils/logging.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

export interface PersistentRateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
  keyGenerator?: (request: Request) => string;
  headers?: boolean;
}

export const DEFAULT_PERSISTENT_LIMITS: Record<string, PersistentRateLimitConfig> = {
  webhook: {
    windowSeconds: parseInt(Deno.env.get('RATE_LIMIT_WINDOW_SECONDS') || '60'),
    maxRequests: parseInt(Deno.env.get('RATE_LIMIT_MAX_REQUESTS') || '100'),
    keyGenerator: (req: Request) => {
      const ip = getClientIP(req) || 'unknown';
      const sig = req.headers.get('x-vapi-signature') || 'nosig';
      const url = new URL(req.url);
      return `${ip}:${sig.slice(0, 16)}:${url.pathname}`;
    },
    headers: true
  }
};

interface LimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfter?: number; // seconds
}

export async function withPersistentRateLimit(
  request: Request,
  limiterName: keyof typeof DEFAULT_PERSISTENT_LIMITS,
  supabase: SupabaseClient,
  next: () => Promise<Response>
): Promise<Response> {
  const config = DEFAULT_PERSISTENT_LIMITS[limiterName];
  const key = (config.keyGenerator?.(request)) || `${getClientIP(request) || 'unknown'}:${new URL(request.url).pathname}`;

  const result = await incrementAndCheckLimit(supabase, key, config.windowSeconds, config.maxRequests);

  const headers = new Headers();
  if (config.headers) {
    headers.set('X-RateLimit-Limit', String(config.maxRequests));
    headers.set('X-RateLimit-Remaining', String(Math.max(config.limit - result.count, 0)));
    if (!result.allowed && result.retryAfter !== undefined) {
      headers.set('Retry-After', String(result.retryAfter));
    }
  }

  if (!result.allowed) {
    logger.warn('Persistent rate limit exceeded', { key, limiter: String(limiterName), count: result.count, limit: config.maxRequests });
    return new Response(
      JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Too many requests', retryAfter: result.retryAfter } }),
      { status: 429, headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers.entries()) } }
    );
  }

  const response = await next();
  const outHeaders = new Headers(response.headers);
  for (const [k, v] of headers.entries()) outHeaders.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: outHeaders });
}

async function incrementAndCheckLimit(
  supabase: SupabaseClient,
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<LimitResult> {
  try {
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests
    });
    if (error) throw error;

    // Expected data: { count: number, allowed: boolean, retry_after: number }
    return {
      allowed: !!data?.allowed,
      count: Number(data?.count || 0),
      limit: maxRequests,
      retryAfter: data?.retry_after !== undefined ? Number(data.retry_after) : undefined
    };
  } catch (e) {
    // Fail-open but log error – better availability than false positives
    logger.error('Rate limit RPC failed, proceeding fail-open', e as Error, { key });
    return { allowed: true, count: 1, limit: maxRequests };
  }
}

function getClientIP(request: Request): string | null {
  const headers = [
    'cf-connecting-ip',
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ];
  for (const h of headers) {
    const v = request.headers.get(h);
    if (v) return v.split(',')[0].trim();
  }
  return null;
}

