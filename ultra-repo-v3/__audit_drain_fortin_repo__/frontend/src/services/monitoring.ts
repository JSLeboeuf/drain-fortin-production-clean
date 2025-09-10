/**
 * Monitoring Service
 * Centralized monitoring, metrics, and observability
 */

import { logger } from '@/lib/logger';

// Performance metrics types
interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  tags?: Record<string, string>;
  timestamp: number;
}

interface ErrorEvent {
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  context?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastCheck: number;
  message?: string;
}

class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorEvent[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private sessionId: string;
  private userId?: string;
  private isInitialized = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeMonitoring();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMonitoring() {
    if (this.isInitialized) return;

    // Initialize Web Vitals monitoring
    this.initializeWebVitals();

    // Initialize error boundary
    this.initializeErrorBoundary();

    // Initialize performance observer
    this.initializePerformanceObserver();

    // Start health checks
    this.startHealthChecks();

    // Initialize Sentry if configured
    if (import.meta.env['VITE_SENTRY_DSN']) {
      this.initializeSentry();
    }

    this.isInitialized = true;
    logger.info('Monitoring service initialized', { sessionId: this.sessionId });
  }

  private initializeWebVitals() {
    if (typeof window === 'undefined') return;

    // Core Web Vitals
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS((metric) => this.recordMetric('CLS', metric.value, 'count'));
      onFID((metric) => this.recordMetric('FID', metric.value, 'ms'));
      onFCP((metric) => this.recordMetric('FCP', metric.value, 'ms'));
      onLCP((metric) => this.recordMetric('LCP', metric.value, 'ms'));
      onTTFB((metric) => this.recordMetric('TTFB', metric.value, 'ms'));
    });
  }

  private initializeErrorBoundary() {
    if (typeof window === 'undefined') return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.recordError({
        message: event.message,
        stack: event.error?.stack,
        level: 'error',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        level: 'error',
        context: {
          promise: event.promise,
        },
      });
    });
  }

  private initializePerformanceObserver() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    // Long Task Observer
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            this.recordMetric('LongTask', entry.duration, 'ms', {
              name: entry.name,
              startTime: entry.startTime.toString(),
            });
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Long task observer not supported
    }

    // Resource timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          if (resourceEntry.duration > 1000) {
            this.recordMetric('SlowResource', resourceEntry.duration, 'ms', {
              name: resourceEntry.name,
              type: resourceEntry.initiatorType,
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      // Resource observer not supported
    }
  }

  private startHealthChecks() {
    // Check API health every 30 seconds
    setInterval(() => {
      this.checkAPIHealth();
      this.checkSupabaseHealth();
      this.checkWebSocketHealth();
    }, 30000);

    // Initial checks
    this.checkAPIHealth();
    this.checkSupabaseHealth();
    this.checkWebSocketHealth();
  }

  private async checkAPIHealth() {
    const start = Date.now();
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      const latency = Date.now() - start;
      const status = response.ok ? 'healthy' : 'degraded';
      
      this.updateHealthCheck('api', {
        service: 'api',
        status,
        latency,
        lastCheck: Date.now(),
        message: response.ok ? 'API is healthy' : `API returned ${response.status}`,
      });
    } catch (error) {
      this.updateHealthCheck('api', {
        service: 'api',
        status: 'unhealthy',
        latency: Date.now() - start,
        lastCheck: Date.now(),
        message: error instanceof Error ? error.message : 'API health check failed',
      });
    }
  }

  private async checkSupabaseHealth() {
    const start = Date.now();
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env['VITE_SUPABASE_URL']!,
        import.meta.env['VITE_SUPABASE_ANON_KEY']!
      );
      
      const { error } = await supabase.from('calls').select('count', { count: 'exact', head: true });
      const latency = Date.now() - start;
      
      this.updateHealthCheck('supabase', {
        service: 'supabase',
        status: error ? 'degraded' : 'healthy',
        latency,
        lastCheck: Date.now(),
        message: error ? error.message : 'Supabase is healthy',
      });
    } catch (error) {
      this.updateHealthCheck('supabase', {
        service: 'supabase',
        status: 'unhealthy',
        latency: Date.now() - start,
        lastCheck: Date.now(),
        message: 'Supabase health check failed',
      });
    }
  }

  private checkWebSocketHealth() {
    // Check if WebSocket is connected
    const wsConnected = (window as any).__WS_CONNECTED__ || false;
    
    this.updateHealthCheck('websocket', {
      service: 'websocket',
      status: wsConnected ? 'healthy' : 'unhealthy',
      latency: 0,
      lastCheck: Date.now(),
      message: wsConnected ? 'WebSocket connected' : 'WebSocket disconnected',
    });
  }

  private updateHealthCheck(service: string, check: HealthCheck) {
    this.healthChecks.set(service, check);
    
    // Alert if service is unhealthy
    if (check.status === 'unhealthy') {
      this.recordError({
        message: `Service ${service} is unhealthy: ${check.message}`,
        level: 'error',
        context: { check },
      });
    }
  }

  private initializeSentry() {
    import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn: import.meta.env['VITE_SENTRY_DSN'],
        environment: import.meta.env['VITE_ENVIRONMENT'] || 'development',
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
          }),
        ],
        tracesSampleRate: import.meta.env['PROD'] ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend: (event) => {
          // Filter out non-critical errors
          if (event.level === 'warning') {
            return null;
          }
          return event;
        },
      });

      Sentry.setUser({
        id: this.userId,
        session: this.sessionId,
      });
    });
  }

  // Public API
  public recordMetric(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'] = 'ms',
    tags?: Record<string, string>
  ) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      tags,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log important metrics
    if (value > 1000 && unit === 'ms') {
      logger.warn(`Slow performance detected: ${name}`, { metric });
    }
  }

  public recordError(error: Omit<ErrorEvent, 'timestamp' | 'userId' | 'sessionId'>) {
    const errorEvent: ErrorEvent = {
      ...error,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.errors.push(errorEvent);

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    // Log to console
    logger.error(error.message, error.context);

    // Send to Sentry if available
    if (window.Sentry) {
      window.Sentry.captureException(new Error(error.message), {
        level: error.level === 'error' ? 'error' : 'warning',
        extra: error.context,
      });
    }
  }

  public setUser(userId: string) {
    this.userId = userId;
    if (window.Sentry) {
      window.Sentry.setUser({ id: userId });
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getErrors(): ErrorEvent[] {
    return [...this.errors];
  }

  public getHealthStatus(): Record<string, HealthCheck> {
    return Object.fromEntries(this.healthChecks);
  }

  public getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.metrics[0]?.timestamp || Date.now(),
      metrics: this.metrics.length,
      errors: this.errors.length,
    };
  }

  public trackEvent(name: string, properties?: Record<string, any>) {
    logger.info(`Event: ${name}`, properties);
    
    if (window.gtag) {
      window.gtag('event', name, properties);
    }

    if (window.Sentry) {
      window.Sentry.addBreadcrumb({
        message: name,
        category: 'user',
        level: 'info',
        data: properties,
      });
    }
  }

  public startTransaction(name: string) {
    const start = performance.now();
    
    return {
      end: (status: 'success' | 'error' = 'success') => {
        const duration = performance.now() - start;
        this.recordMetric(`Transaction:${name}`, duration, 'ms', { status });
        
        if (window.Sentry) {
          const transaction = window.Sentry.startTransaction({ name });
          transaction.setStatus(status === 'success' ? 'ok' : 'internal_error');
          transaction.finish();
        }
      },
    };
  }
}

// Singleton instance
export const monitoring = new MonitoringService();

// Export types
export type { PerformanceMetric, ErrorEvent, HealthCheck };

// Declare global types
declare global {
  interface Window {
    Sentry: any;
    gtag: any;
    __WS_CONNECTED__: boolean;
  }
}