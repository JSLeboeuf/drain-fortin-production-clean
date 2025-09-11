// Enterprise security headers middleware for production hardening
// Implements OWASP security best practices and DDoS protection

import { logger } from '../utils/logging.ts';

export interface SecurityConfig {
  enableHSTS: boolean;
  enableCSP: boolean;
  enableXFrameOptions: boolean;
  enableXContentTypeOptions: boolean;
  enableReferrerPolicy: boolean;
  enablePermissionsPolicy: boolean;
  enableExpectCT: boolean;
  hstsMaxAge: number;
  hstsIncludeSubdomains: boolean;
  hstsPreload: boolean;
  cspDirectives: Record<string, string[]>;
  environment: 'development' | 'staging' | 'production';
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableHSTS: true,
  enableCSP: true,
  enableXFrameOptions: true,
  enableXContentTypeOptions: true,
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true,
  enableExpectCT: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubdomains: true,
  hstsPreload: true,
  environment: (Deno.env.get('ENVIRONMENT') as any) || 'development',
  cspDirectives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'child-src': ["'none'"],
    'worker-src': ["'self'"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"]
  }
};

// DDoS protection configuration
export interface DDoSConfig {
  enableProtection: boolean;
  requestSizeLimit: number; // bytes
  timeWindowMs: number;
  suspiciousRequestThreshold: number;
  blockDurationMs: number;
  whitelistedIPs: string[];
  whitelistedUserAgents: string[];
  suspiciousPatterns: RegExp[];
}

export const DDOS_PROTECTION_CONFIG: DDoSConfig = {
  enableProtection: true,
  requestSizeLimit: 2 * 1024 * 1024, // 2MB
  timeWindowMs: 60 * 1000, // 1 minute
  suspiciousRequestThreshold: 50,
  blockDurationMs: 15 * 60 * 1000, // 15 minutes
  whitelistedIPs: (Deno.env.get('DDOS_WHITELIST_IPS') || '').split(',').filter(Boolean),
  whitelistedUserAgents: [
    'vapi',
    'supabase',
    'health-check',
    'monitoring'
  ],
  suspiciousPatterns: [
    /\.\.(\/|\\)/,  // Directory traversal
    /<script/i,     // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i,  // JavaScript protocol
    /vbscript:/i,   // VBScript protocol
    /data:text\/html/i, // Data URI XSS
    /eval\(/i,      // Code injection
    /expression\(/i, // CSS expression injection
  ]
};

// Blocked IP tracking (in-memory for Edge Functions)
const blockedIPs = new Map<string, { blockedUntil: number; reason: string; attempts: number }>();
const suspiciousActivity = new Map<string, { count: number; windowStart: number; lastSeen: number }>();

export function getSecurityHeaders(config: Partial<SecurityConfig> = {}): Record<string, string> {
  const fullConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  const headers: Record<string, string> = {};

  // HTTP Strict Transport Security (HSTS)
  if (fullConfig.enableHSTS && fullConfig.environment === 'production') {
    let hstsValue = `max-age=${fullConfig.hstsMaxAge}`;
    if (fullConfig.hstsIncludeSubdomains) hstsValue += '; includeSubDomains';
    if (fullConfig.hstsPreload) hstsValue += '; preload';
    headers['Strict-Transport-Security'] = hstsValue;
  }

  // Content Security Policy (CSP)
  if (fullConfig.enableCSP) {
    const cspParts = Object.entries(fullConfig.cspDirectives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
    headers['Content-Security-Policy'] = cspParts;
  }

  // X-Frame-Options
  if (fullConfig.enableXFrameOptions) {
    headers['X-Frame-Options'] = 'DENY';
  }

  // X-Content-Type-Options
  if (fullConfig.enableXContentTypeOptions) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // Referrer Policy
  if (fullConfig.enableReferrerPolicy) {
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  }

  // Permissions Policy (Feature Policy replacement)
  if (fullConfig.enablePermissionsPolicy) {
    headers['Permissions-Policy'] = [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'fullscreen=(self)',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'picture-in-picture=()'
    ].join(', ');
  }

  // Expect-CT (Certificate Transparency)
  if (fullConfig.enableExpectCT && fullConfig.environment === 'production') {
    headers['Expect-CT'] = 'max-age=86400, enforce';
  }

  // Additional security headers
  headers['X-XSS-Protection'] = '1; mode=block';
  headers['X-DNS-Prefetch-Control'] = 'off';
  headers['X-Download-Options'] = 'noopen';
  headers['X-Permitted-Cross-Domain-Policies'] = 'none';
  headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';
  headers['Cross-Origin-Resource-Policy'] = 'same-origin';

  // Cache control for security-sensitive endpoints
  headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
  headers['Pragma'] = 'no-cache';
  headers['Expires'] = '0';

  // Server signature hiding
  headers['Server'] = 'Secure-Edge-Function';

  return headers;
}

export function isDDoSProtected(request: Request, config: DDoSConfig = DDOS_PROTECTION_CONFIG): {
  allowed: boolean;
  reason?: string;
  action?: 'block' | 'monitor' | 'challenge';
} {
  if (!config.enableProtection) {
    return { allowed: true };
  }

  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const requestSize = parseInt(request.headers.get('content-length') || '0');
  const now = Date.now();

  // Check if IP is whitelisted
  if (clientIP && config.whitelistedIPs.includes(clientIP)) {
    return { allowed: true };
  }

  // Check if user agent is whitelisted
  if (config.whitelistedUserAgents.some(ua => userAgent.toLowerCase().includes(ua.toLowerCase()))) {
    return { allowed: true };
  }

  // Check if IP is currently blocked
  if (clientIP) {
    const blocked = blockedIPs.get(clientIP);
    if (blocked && now < blocked.blockedUntil) {
      logger.warn('Blocked IP attempted access', {
        ip: clientIP,
        reason: blocked.reason,
        attempts: blocked.attempts,
        blockedUntil: new Date(blocked.blockedUntil).toISOString()
      });
      return { allowed: false, reason: `IP blocked: ${blocked.reason}`, action: 'block' };
    } else if (blocked && now >= blocked.blockedUntil) {
      // Unblock expired blocks
      blockedIPs.delete(clientIP);
    }
  }

  // Check request size
  if (requestSize > config.requestSizeLimit) {
    if (clientIP) {
      blockIP(clientIP, 'Oversized request', config);
    }
    logger.securityEvent('Request size limit exceeded', 'high', {
      ip: clientIP,
      requestSize,
      limit: config.requestSizeLimit,
      userAgent
    });
    return { allowed: false, reason: 'Request too large', action: 'block' };
  }

  // Check for suspicious patterns in URL and headers
  const url = request.url;
  const suspiciousInUrl = config.suspiciousPatterns.some(pattern => pattern.test(url));
  const suspiciousInUA = config.suspiciousPatterns.some(pattern => pattern.test(userAgent));

  if (suspiciousInUrl || suspiciousInUA) {
    if (clientIP) {
      blockIP(clientIP, 'Suspicious pattern detected', config);
    }
    logger.securityEvent('Suspicious request pattern detected', 'critical', {
      ip: clientIP,
      url,
      userAgent,
      patterns: config.suspiciousPatterns.filter(p => p.test(url) || p.test(userAgent)).map(p => p.toString())
    });
    return { allowed: false, reason: 'Suspicious request pattern', action: 'block' };
  }

  // Track request frequency
  if (clientIP) {
    let activity = suspiciousActivity.get(clientIP);
    
    if (!activity || now - activity.windowStart > config.timeWindowMs) {
      // Start new tracking window
      activity = { count: 1, windowStart: now, lastSeen: now };
    } else {
      // Increment counter
      activity.count++;
      activity.lastSeen = now;
    }
    
    suspiciousActivity.set(clientIP, activity);

    // Check if threshold exceeded
    if (activity.count > config.suspiciousRequestThreshold) {
      blockIP(clientIP, 'Request frequency exceeded', config);
      logger.securityEvent('Request frequency threshold exceeded', 'high', {
        ip: clientIP,
        count: activity.count,
        threshold: config.suspiciousRequestThreshold,
        timeWindow: config.timeWindowMs
      });
      return { allowed: false, reason: 'Too many requests', action: 'block' };
    }

    // Monitor for potential issues
    if (activity.count > config.suspiciousRequestThreshold * 0.7) {
      logger.warn('High request frequency detected', {
        ip: clientIP,
        count: activity.count,
        threshold: config.suspiciousRequestThreshold,
        progress: `${Math.round((activity.count / config.suspiciousRequestThreshold) * 100)}%`
      });
      return { allowed: true, action: 'monitor' };
    }
  }

  return { allowed: true };
}

function blockIP(ip: string, reason: string, config: DDoSConfig): void {
  const existing = blockedIPs.get(ip);
  const attempts = existing ? existing.attempts + 1 : 1;
  
  blockedIPs.set(ip, {
    blockedUntil: Date.now() + config.blockDurationMs,
    reason,
    attempts
  });

  // Clean up tracking
  suspiciousActivity.delete(ip);

  logger.securityEvent('IP address blocked', 'critical', {
    ip,
    reason,
    attempts,
    blockDuration: `${config.blockDurationMs}ms`
  });
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

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      return value.split(',')[0].trim();
    }
  }

  return null;
}

// Security middleware wrapper
export async function withSecurityHeaders(
  request: Request,
  next: () => Promise<Response>,
  config?: Partial<SecurityConfig>
): Promise<Response> {
  const startTime = performance.now();

  // DDoS protection check
  const ddosCheck = isDDoSProtected(request);
  if (!ddosCheck.allowed) {
    const securityHeaders = getSecurityHeaders(config);
    
    return new Response(
      JSON.stringify({
        error: {
          code: 'SECURITY_VIOLATION',
          message: ddosCheck.reason || 'Request blocked by security policy',
          action: ddosCheck.action
        }
      }),
      {
        status: ddosCheck.action === 'block' ? 429 : 403,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders
        }
      }
    );
  }

  // Log monitoring events
  if (ddosCheck.action === 'monitor') {
    logger.warn('Request under monitoring', {
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      url: request.url
    });
  }

  try {
    // Execute the request
    const response = await next();
    
    // Add security headers to response
    const securityHeaders = getSecurityHeaders(config);
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

    // Apply security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });

    const duration = performance.now() - startTime;
    logger.debug('Security middleware completed', {
      duration: `${duration.toFixed(2)}ms`,
      status: response.status,
      ip: getClientIP(request)
    });

    return newResponse;

  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Security middleware error', error as Error, {
      duration: `${duration.toFixed(2)}ms`,
      ip: getClientIP(request),
      url: request.url
    });

    // Return secure error response
    const securityHeaders = getSecurityHeaders(config);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders
        }
      }
    );
  }
}

// Cleanup function for blocked IPs (call periodically)
export function cleanupBlockedIPs(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [ip, block] of blockedIPs.entries()) {
    if (now >= block.blockedUntil) {
      blockedIPs.delete(ip);
      cleaned++;
    }
  }

  // Clean up old suspicious activity tracking
  for (const [ip, activity] of suspiciousActivity.entries()) {
    if (now - activity.lastSeen > DDOS_PROTECTION_CONFIG.timeWindowMs * 2) {
      suspiciousActivity.delete(ip);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('Cleaned up expired security entries', {
      cleanedEntries: cleaned,
      remainingBlocked: blockedIPs.size,
      remainingTracked: suspiciousActivity.size
    });
  }
}

// Get security metrics for monitoring
export function getSecurityMetrics(): {
  blockedIPs: number;
  trackedIPs: number;
  totalBlocks: number;
  recentBlocks: Array<{ ip: string; reason: string; blockedUntil: string; attempts: number }>;
} {
  const now = Date.now();
  const recentBlocks = Array.from(blockedIPs.entries())
    .filter(([_, block]) => now < block.blockedUntil)
    .slice(0, 10) // Latest 10 blocks
    .map(([ip, block]) => ({
      ip: ip.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.***.**'), // Mask IP
      reason: block.reason,
      blockedUntil: new Date(block.blockedUntil).toISOString(),
      attempts: block.attempts
    }));

  return {
    blockedIPs: blockedIPs.size,
    trackedIPs: suspiciousActivity.size,
    totalBlocks: Array.from(blockedIPs.values()).reduce((sum, block) => sum + block.attempts, 0),
    recentBlocks
  };
}

// Initialize cleanup timer (call once per edge function deployment)
let cleanupTimer: number | null = null;

export function initSecurityCleanup(): void {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(() => {
    cleanupBlockedIPs();
  }, 5 * 60 * 1000); // Clean up every 5 minutes
}

export function stopSecurityCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}