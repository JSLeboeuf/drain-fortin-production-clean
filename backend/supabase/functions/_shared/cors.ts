// Secure CORS headers for Supabase Edge Functions
// Production-ready configuration with restricted origins

// Environment-based CORS configuration
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'development';

// Define allowed origins based on environment
const PRODUCTION_ORIGINS = [
  'https://drain-fortin-crm.com',
  'https://www.drain-fortin.com',
  'https://phiduqxcufdmgjvdipyu.supabase.co',
  // Add your production domain here
];

const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  ...PRODUCTION_ORIGINS
];

// Get allowed origins based on environment
export function getAllowedOrigins(): string[] {
  const customOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (customOrigins) {
    return customOrigins.split(',').map(origin => origin.trim());
  }
  
  return ENVIRONMENT === 'production' 
    ? PRODUCTION_ORIGINS 
    : DEVELOPMENT_ORIGINS;
}

// Check if origin is allowed
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin);
}

// Generate CORS headers based on request origin
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isOriginAllowed(origin) ? origin : 'null';
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-signature",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Max-Age": "86400", // 24 hours
    "Vary": "Origin",
    // Security headers
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
  };
}

// Legacy export for backward compatibility (but now secure)
export const corsHeaders: Record<string, string> = {
  // This will be overridden by getCorsHeaders() in production
  "Access-Control-Allow-Origin": ENVIRONMENT === 'production' ? 'null' : '*',
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-signature",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block"
};

// Rate limiting helper
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export function getRateLimitConfig(): RateLimitConfig {
  return {
    windowMs: parseInt(Deno.env.get('RATE_LIMIT_WINDOW_MS') || '60000'),
    maxRequests: parseInt(Deno.env.get('RATE_LIMIT_MAX_REQUESTS') || '100')
  };
}

// Security validation helpers
export function validateContentType(contentType: string | null): boolean {
  const allowedTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'text/plain'
  ];
  
  if (!contentType) return false;
  return allowedTypes.some(type => contentType.includes(type));
}

export function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const allowedHeaders = [
    'authorization',
    'content-type',
    'x-client-info',
    'x-vapi-signature',
    'apikey'
  ];
  
  allowedHeaders.forEach(header => {
    const value = headers.get(header);
    if (value) {
      sanitized[header] = value;
    }
  });
  
  return sanitized;
}