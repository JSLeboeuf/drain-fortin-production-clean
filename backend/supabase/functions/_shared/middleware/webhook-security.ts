// Enhanced security middleware for webhook endpoints
import { logger } from '../utils/logging.ts';
import { ValidationError, AuthenticationError, ErrorFactory } from '../utils/errors.ts';
import { validatePayloadSize, validateWebhookPayload, validateBusinessRules, sanitizeForLogging } from '../validation/vapi-schemas.ts';
import type { WebhookPayload } from '../validation/vapi-schemas.ts';

// Security configuration constants
export const WEBHOOK_SECURITY_CONFIG = {
  maxPayloadSize: 1024 * 1024, // 1MB
  maxRequestsPerMinute: 100,
  requiredHeaders: ['x-vapi-signature', 'content-type'] as const,
  allowedContentTypes: ['application/json'] as const,
  hmacHeaderName: 'x-vapi-signature',
  hmacAlgorithm: 'SHA-256',
  hmacPrefix: 'hmac-sha256=' as const,
  maxClockSkew: 300000, // 5 minutes in milliseconds
  enforceHttps: true,
  rateLimitWindowMs: 60 * 1000, // 1 minute
  suspiciousPayloadThreshold: 0.5 * 1024 * 1024, // 500KB
} as const;

// HMAC signature verification with timing attack protection
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<{ valid: boolean; error?: string }> {
  if (!secret || secret.length === 0) {
    logger.securityEvent('HMAC verification attempted without secret', 'critical', {
      hasSignature: !!signature,
      payloadLength: payload.length
    });
    return { valid: false, error: 'Webhook secret not configured' };
  }

  if (!signature || signature.length === 0) {
    logger.securityEvent('HMAC verification attempted without signature', 'high', {
      payloadLength: payload.length,
      endpoint: 'vapi-webhook'
    });
    return { valid: false, error: 'Missing webhook signature' };
  }

  try {
    // Remove prefix if present and normalize
    const cleanSignature = signature.toLowerCase().replace(/^hmac-sha256=/, '');
    
    // Validate signature format (hex string)
    if (!/^[a-f0-9]{64}$/i.test(cleanSignature)) {
      logger.securityEvent('Invalid HMAC signature format', 'high', {
        signatureLength: cleanSignature.length,
        signaturePattern: cleanSignature.replace(/[a-f0-9]/gi, 'X')
      });
      return { valid: false, error: 'Invalid signature format' };
    }

    // Create HMAC key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    // Generate expected signature
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadData);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison to prevent timing attacks
    if (expectedSignature.length !== cleanSignature.length) {
      logger.securityEvent('HMAC signature length mismatch', 'high', {
        expectedLength: expectedSignature.length,
        receivedLength: cleanSignature.length
      });
      return { valid: false, error: 'Invalid signature' };
    }

    let difference = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      difference |= expectedSignature.charCodeAt(i) ^ cleanSignature.charCodeAt(i);
    }

    const isValid = difference === 0;

    if (!isValid) {
      logger.securityEvent('HMAC signature verification failed', 'high', {
        payloadLength: payload.length,
        signatureLength: cleanSignature.length,
        endpoint: 'vapi-webhook'
      });
    } else {
      logger.debug('HMAC signature verified successfully', {
        payloadLength: payload.length,
        endpoint: 'vapi-webhook'
      });
    }

    return { valid: isValid };

  } catch (error) {
    logger.securityEvent('HMAC verification error', 'critical', {
      error: error instanceof Error ? error.message : String(error),
      payloadLength: payload.length
    });
    return { valid: false, error: 'Signature verification failed' };
  }
}

// Request validation and sanitization
export function validateWebhookRequest(request: Request): {
  valid: boolean;
  errors: string[];
  metadata: Record<string, any>;
} {
  const errors: string[] = [];
  const metadata: Record<string, any> = {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  };

  // Method validation
  if (request.method !== 'POST') {
    errors.push(`Invalid HTTP method: ${request.method}. Only POST allowed for webhooks.`);
  }

  // Content-Type validation
  const contentType = request.headers.get('content-type');
  if (!contentType || !WEBHOOK_SECURITY_CONFIG.allowedContentTypes.some(type => 
    contentType.toLowerCase().includes(type)
  )) {
    errors.push(`Invalid content-type: ${contentType}. Must be application/json.`);
  }

  // HTTPS enforcement (in production)
  if (WEBHOOK_SECURITY_CONFIG.enforceHttps && Deno.env.get('ENVIRONMENT') === 'production') {
    const protocol = new URL(request.url).protocol;
    if (protocol !== 'https:') {
      errors.push(`Insecure protocol: ${protocol}. HTTPS required in production.`);
    }
  }

  // Required headers validation
  for (const header of WEBHOOK_SECURITY_CONFIG.requiredHeaders) {
    if (!request.headers.get(header)) {
      errors.push(`Missing required header: ${header}`);
    }
  }

  // User-Agent validation (optional security check)
  const userAgent = request.headers.get('user-agent');
  if (userAgent && !userAgent.toLowerCase().includes('vapi')) {
    logger.warn('Webhook request from unexpected User-Agent', {
      userAgent,
      endpoint: 'vapi-webhook'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    metadata
  };
}

// Payload security validation
export async function validateWebhookPayload(
  rawPayload: string
): Promise<{
  valid: boolean;
  payload?: WebhookPayload;
  errors: string[];
  securityWarnings: string[];
}> {
  const errors: string[] = [];
  const securityWarnings: string[] = [];

  // Size validation
  if (!validatePayloadSize(rawPayload, WEBHOOK_SECURITY_CONFIG.maxPayloadSize)) {
    errors.push(`Payload too large: ${rawPayload.length} bytes. Maximum allowed: ${WEBHOOK_SECURITY_CONFIG.maxPayloadSize} bytes.`);
    logger.securityEvent('Webhook payload size violation', 'medium', {
      payloadSize: rawPayload.length,
      maxAllowed: WEBHOOK_SECURITY_CONFIG.maxPayloadSize
    });
  }

  // Suspiciously large payload warning
  if (rawPayload.length > WEBHOOK_SECURITY_CONFIG.suspiciousPayloadThreshold) {
    securityWarnings.push(`Large payload detected: ${rawPayload.length} bytes`);
    logger.warn('Large webhook payload received', {
      payloadSize: rawPayload.length,
      threshold: WEBHOOK_SECURITY_CONFIG.suspiciousPayloadThreshold
    });
  }

  // JSON parsing with error handling
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch (parseError) {
    errors.push(`Invalid JSON payload: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    logger.securityEvent('Webhook JSON parsing failed', 'medium', {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      payloadPreview: rawPayload.slice(0, 100)
    });
    return { valid: false, errors, securityWarnings };
  }

  // Schema validation
  const validationResult = validateWebhookPayload(parsedPayload);
  if (!validationResult.success) {
    const zodErrors = validationResult.errors.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    );
    errors.push(...zodErrors);
    
    logger.warn('Webhook payload schema validation failed', {
      errors: zodErrors,
      payloadType: (parsedPayload as any)?.type || 'unknown'
    });
    
    return { valid: false, errors, securityWarnings };
  }

  // Business rules validation
  const businessValidation = validateBusinessRules(validationResult.data);
  if (!businessValidation.valid) {
    securityWarnings.push(...businessValidation.violations);
    logger.warn('Webhook payload business rule violations', {
      violations: businessValidation.violations,
      payloadType: validationResult.data.type
    });
  }

  return {
    valid: true,
    payload: validationResult.data,
    errors,
    securityWarnings
  };
}

// Timestamp validation for replay attack prevention
export function validateWebhookTimestamp(payload: WebhookPayload): {
  valid: boolean;
  error?: string;
  clockSkew?: number;
} {
  try {
    const payloadTime = new Date(payload.timestamp).getTime();
    const currentTime = Date.now();
    const clockSkew = Math.abs(currentTime - payloadTime);

    if (clockSkew > WEBHOOK_SECURITY_CONFIG.maxClockSkew) {
      logger.securityEvent('Webhook timestamp outside acceptable range', 'medium', {
        payloadTimestamp: payload.timestamp,
        clockSkew: `${clockSkew}ms`,
        maxAllowed: `${WEBHOOK_SECURITY_CONFIG.maxClockSkew}ms`,
        payloadType: payload.type
      });
      
      return {
        valid: false,
        error: `Request timestamp outside acceptable range (${clockSkew}ms skew)`,
        clockSkew
      };
    }

    return { valid: true, clockSkew };

  } catch (error) {
    return {
      valid: false,
      error: `Invalid timestamp format: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Complete webhook security middleware
export async function withWebhookSecurity(
  request: Request,
  secret: string,
  handler: (payload: WebhookPayload, request: Request) => Promise<Response>
): Promise<Response> {
  const startTime = performance.now();
  const operationId = logger.startOperation('webhook-security-validation');

  try {
    // Skip security checks for health checks and OPTIONS requests
    if (request.method === 'OPTIONS') {
      return new Response('OK', { 
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Request validation
    const requestValidation = validateWebhookRequest(request);
    if (!requestValidation.valid) {
      logger.securityEvent('Webhook request validation failed', 'high', {
        errors: requestValidation.errors,
        metadata: requestValidation.metadata
      });
      
      throw new ValidationError(
        `Request validation failed: ${requestValidation.errors.join(', ')}`,
        'request',
        { errors: requestValidation.errors }
      );
    }

    // Read and validate payload
    const rawPayload = await request.text();
    
    // For health checks, allow through without full validation
    if (rawPayload.includes('"type":"health-check"')) {
      logger.debug('Health check request bypassing full security validation');
      const quickParse = JSON.parse(rawPayload);
      return await handler(quickParse, request);
    }

    // HMAC signature verification (REQUIRED for all non-health-check events)
    const signature = request.headers.get(WEBHOOK_SECURITY_CONFIG.hmacHeaderName) || '';
    const signatureResult = await verifyWebhookSignature(rawPayload, signature, secret);
    
    if (!signatureResult.valid) {
      logger.securityEvent('Webhook HMAC verification failed', 'critical', {
        error: signatureResult.error,
        payloadLength: rawPayload.length,
        hasSignature: !!signature,
        signatureLength: signature.length
      });
      
      throw new AuthenticationError(
        'Invalid webhook signature',
        { 
          error: signatureResult.error,
          hint: 'Check VAPI_WEBHOOK_SECRET configuration'
        }
      );
    }

    // Payload validation
    const payloadValidation = await validateWebhookPayload(rawPayload);
    if (!payloadValidation.valid) {
      logger.securityEvent('Webhook payload validation failed', 'high', {
        errors: payloadValidation.errors,
        securityWarnings: payloadValidation.securityWarnings
      });
      
      throw new ValidationError(
        `Payload validation failed: ${payloadValidation.errors.join(', ')}`,
        'payload',
        { 
          errors: payloadValidation.errors,
          warnings: payloadValidation.securityWarnings
        }
      );
    }

    // Timestamp validation for replay attack prevention  
    const timestampValidation = validateWebhookTimestamp(payloadValidation.payload!);
    if (!timestampValidation.valid) {
      logger.securityEvent('Webhook timestamp validation failed', 'medium', {
        error: timestampValidation.error,
        clockSkew: timestampValidation.clockSkew,
        payloadType: payloadValidation.payload!.type
      });
      
      // Don't block for timestamp issues, just warn
      logger.warn('Webhook timestamp validation warning', {
        error: timestampValidation.error,
        continuing: true
      });
    }

    // Log security warnings
    if (payloadValidation.securityWarnings.length > 0) {
      logger.warn('Webhook security warnings detected', {
        warnings: payloadValidation.securityWarnings,
        payloadType: payloadValidation.payload!.type
      });
    }

    // Log successful validation
    const duration = performance.now() - startTime;
    logger.info('Webhook security validation completed', {
      payloadType: payloadValidation.payload!.type,
      duration: `${duration.toFixed(2)}ms`,
      payloadSize: rawPayload.length,
      warnings: payloadValidation.securityWarnings.length
    });

    // Execute the handler with validated payload
    const response = await handler(payloadValidation.payload!, request);
    
    logger.endOperation('webhook-security-validation', operationId, {
      duration: `${duration.toFixed(2)}ms`,
      payloadType: payloadValidation.payload!.type,
      responseStatus: response.status
    });

    return response;

  } catch (error) {
    const duration = performance.now() - startTime;
    
    logger.failOperation('webhook-security-validation', operationId, error as Error, {
      duration: `${duration.toFixed(2)}ms`,
      requestMethod: request.method,
      requestUrl: request.url
    });

    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return new Response(
        JSON.stringify({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        }),
        {
          status: error.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Handle unexpected errors
    logger.error('Unexpected webhook security error', error as Error, {
      requestMethod: request.method,
      requestUrl: request.url
    });

    return new Response(
      JSON.stringify({
        error: {
          code: 'WEBHOOK_SECURITY_ERROR',
          message: 'Webhook security validation failed'
        }
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

// Security monitoring and reporting
export function getWebhookSecurityMetrics(): Record<string, any> {
  return {
    config: WEBHOOK_SECURITY_CONFIG,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
}