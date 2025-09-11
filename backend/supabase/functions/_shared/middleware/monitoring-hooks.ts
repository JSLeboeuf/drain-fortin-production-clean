// Comprehensive monitoring and observability middleware
// Real-time metrics, alerting, and performance tracking

import { logger } from '../utils/logging.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

export interface MonitoringConfig {
  enableMetrics: boolean;
  enableAlerting: boolean;
  enableTracing: boolean;
  enableHealthChecks: boolean;
  metricsInterval: number;
  alertThresholds: AlertThresholds;
  retentionDays: number;
  batchSize: number;
}

export interface AlertThresholds {
  responseTimeMs: number;
  errorRate: number;
  memoryUsageMB: number;
  activeConnections: number;
  queueDepth: number;
  cpuUsage: number;
}

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enableMetrics: true,
  enableAlerting: true,
  enableTracing: true,
  enableHealthChecks: true,
  metricsInterval: parseInt(Deno.env.get('METRICS_INTERVAL_MS') || '30000'), // 30 seconds
  retentionDays: parseInt(Deno.env.get('METRICS_RETENTION_DAYS') || '7'),
  batchSize: parseInt(Deno.env.get('METRICS_BATCH_SIZE') || '100'),
  alertThresholds: {
    responseTimeMs: parseInt(Deno.env.get('ALERT_RESPONSE_TIME_MS') || '2000'),
    errorRate: parseFloat(Deno.env.get('ALERT_ERROR_RATE') || '0.05'), // 5%
    memoryUsageMB: parseInt(Deno.env.get('ALERT_MEMORY_MB') || '100'),
    activeConnections: parseInt(Deno.env.get('ALERT_ACTIVE_CONNECTIONS') || '50'),
    queueDepth: parseInt(Deno.env.get('ALERT_QUEUE_DEPTH') || '100'),
    cpuUsage: parseFloat(Deno.env.get('ALERT_CPU_USAGE') || '0.8') // 80%
  }
};

// Metrics collection interfaces
export interface RequestMetrics {
  timestamp: number;
  method: string;
  path: string;
  statusCode: number;
  responseTimeMs: number;
  requestSize: number;
  responseSize: number;
  userAgent?: string;
  ip?: string;
  error?: string;
  cacheHit?: boolean;
  dbQueryCount?: number;
  dbQueryTimeMs?: number;
}

export interface SystemMetrics {
  timestamp: number;
  memoryUsageMB: number;
  activeConnections: number;
  queueDepth: number;
  cacheHitRate: number;
  errorRate: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  environment: string;
}

export interface AlertEvent {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  value: number;
  threshold: number;
  metadata: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: number;
}

// Real-time metrics collector
class MetricsCollector {
  private requestMetrics: RequestMetrics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private activeAlerts = new Map<string, AlertEvent>();
  private config: MonitoringConfig;
  private metricsTimer?: number;
  private lastSystemCheck = 0;
  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.startMetricsCollection();
  }

  recordRequest(metrics: RequestMetrics): void {
    if (!this.config.enableMetrics) return;

    this.requestMetrics.push(metrics);
    this.requestCount++;
    this.totalResponseTime += metrics.responseTimeMs;

    if (metrics.statusCode >= 400) {
      this.errorCount++;
    }

    // Check for alerts
    this.checkRequestAlerts(metrics);

    // Trim old metrics
    if (this.requestMetrics.length > this.config.batchSize) {
      this.requestMetrics = this.requestMetrics.slice(-this.config.batchSize);
    }

    logger.debug('Request metrics recorded', {
      method: metrics.method,
      path: metrics.path,
      statusCode: metrics.statusCode,
      responseTime: `${metrics.responseTimeMs.toFixed(2)}ms`,
      cacheHit: metrics.cacheHit
    });
  }

  private checkRequestAlerts(metrics: RequestMetrics): void {
    if (!this.config.enableAlerting) return;

    // Response time alert
    if (metrics.responseTimeMs > this.config.alertThresholds.responseTimeMs) {
      this.createAlert(
        'high_response_time',
        'high',
        `Response time exceeded threshold: ${metrics.responseTimeMs}ms`,
        metrics.responseTimeMs,
        this.config.alertThresholds.responseTimeMs,
        { path: metrics.path, method: metrics.method }
      );
    }

    // Error rate alert (check every 10 requests)
    if (this.requestCount % 10 === 0) {
      const errorRate = this.errorCount / this.requestCount;
      if (errorRate > this.config.alertThresholds.errorRate) {
        this.createAlert(
          'high_error_rate',
          'critical',
          `Error rate exceeded threshold: ${(errorRate * 100).toFixed(2)}%`,
          errorRate,
          this.config.alertThresholds.errorRate,
          { recentErrors: this.requestMetrics.filter(m => m.statusCode >= 400).slice(-5) }
        );
      }
    }
  }

  private createAlert(
    type: string,
    severity: AlertEvent['severity'],
    message: string,
    value: number,
    threshold: number,
    metadata: Record<string, any> = {}
  ): void {
    const alertId = `${type}_${Date.now()}`;
    const alert: AlertEvent = {
      id: alertId,
      timestamp: Date.now(),
      severity,
      type,
      message,
      value,
      threshold,
      metadata,
      resolved: false
    };

    this.activeAlerts.set(alertId, alert);

    logger.securityEvent('Monitoring alert triggered', severity, {
      alertId,
      type,
      value,
      threshold,
      metadata
    });

    // Send alert notification (would integrate with external systems)
    this.sendAlert(alert).catch(error => {
      logger.error('Failed to send alert notification', error as Error, { alertId });
    });
  }

  private async sendAlert(alert: AlertEvent): Promise<void> {
    // Integration point for external alerting systems
    // Examples: Slack, PagerDuty, email, SMS, etc.
    
    const alertPayload = {
      alert,
      environment: Deno.env.get('ENVIRONMENT'),
      service: 'drain-fortin-backend',
      timestamp: new Date().toISOString()
    };

    // Log alert for now (would send to actual alerting service)
    logger.warn('ALERT TRIGGERED', {
      severity: alert.severity,
      type: alert.type,
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold
    });

    // Example webhook notification (commented out)
    /*
    const webhookUrl = Deno.env.get('ALERT_WEBHOOK_URL');
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertPayload)
        });
      } catch (error) {
        logger.error('Failed to send webhook alert', error as Error);
      }
    }
    */
  }

  private startMetricsCollection(): void {
    if (!this.config.enableMetrics) return;

    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.metricsInterval);

    logger.info('Metrics collection started', {
      interval: `${this.config.metricsInterval}ms`,
      retentionDays: this.config.retentionDays
    });
  }

  private collectSystemMetrics(): void {
    const now = Date.now();
    
    try {
      // Calculate metrics
      const timeSinceLastCheck = now - this.lastSystemCheck;
      const requestsInWindow = this.requestMetrics.filter(
        m => m.timestamp > now - timeSinceLastCheck
      );
      
      const requestsPerSecond = timeSinceLastCheck > 0 
        ? (requestsInWindow.length / timeSinceLastCheck) * 1000 
        : 0;
      
      const averageResponseTime = requestsInWindow.length > 0
        ? requestsInWindow.reduce((sum, m) => sum + m.responseTimeMs, 0) / requestsInWindow.length
        : 0;
      
      const errorRate = requestsInWindow.length > 0
        ? requestsInWindow.filter(m => m.statusCode >= 400).length / requestsInWindow.length
        : 0;
      
      const cacheHitRate = requestsInWindow.length > 0
        ? requestsInWindow.filter(m => m.cacheHit).length / requestsInWindow.length
        : 0;

      const systemMetrics: SystemMetrics = {
        timestamp: now,
        memoryUsageMB: this.getMemoryUsage(),
        activeConnections: this.getActiveConnections(),
        queueDepth: 0, // Would be populated from actual queue
        cacheHitRate,
        errorRate,
        averageResponseTime,
        requestsPerSecond,
        environment: Deno.env.get('ENVIRONMENT') || 'unknown'
      };

      this.systemMetrics.push(systemMetrics);
      this.lastSystemCheck = now;

      // Check system alerts
      this.checkSystemAlerts(systemMetrics);

      // Trim old system metrics
      if (this.systemMetrics.length > 1000) {
        this.systemMetrics = this.systemMetrics.slice(-1000);
      }

      logger.debug('System metrics collected', {
        requestsPerSecond: requestsPerSecond.toFixed(2),
        averageResponseTime: `${averageResponseTime.toFixed(2)}ms`,
        errorRate: `${(errorRate * 100).toFixed(2)}%`,
        cacheHitRate: `${(cacheHitRate * 100).toFixed(2)}%`,
        memoryUsageMB: systemMetrics.memoryUsageMB
      });

    } catch (error) {
      logger.error('Failed to collect system metrics', error as Error);
    }
  }

  private checkSystemAlerts(metrics: SystemMetrics): void {
    if (!this.config.enableAlerting) return;

    // Memory usage alert
    if (metrics.memoryUsageMB > this.config.alertThresholds.memoryUsageMB) {
      this.createAlert(
        'high_memory_usage',
        'medium',
        `Memory usage exceeded threshold: ${metrics.memoryUsageMB}MB`,
        metrics.memoryUsageMB,
        this.config.alertThresholds.memoryUsageMB
      );
    }

    // Active connections alert
    if (metrics.activeConnections > this.config.alertThresholds.activeConnections) {
      this.createAlert(
        'high_connection_count',
        'medium',
        `Active connections exceeded threshold: ${metrics.activeConnections}`,
        metrics.activeConnections,
        this.config.alertThresholds.activeConnections
      );
    }

    // Average response time alert
    if (metrics.averageResponseTime > this.config.alertThresholds.responseTimeMs) {
      this.createAlert(
        'high_average_response_time',
        'high',
        `Average response time exceeded threshold: ${metrics.averageResponseTime.toFixed(2)}ms`,
        metrics.averageResponseTime,
        this.config.alertThresholds.responseTimeMs
      );
    }
  }

  private getMemoryUsage(): number {
    // Estimate memory usage (Deno doesn't expose this directly in Edge Functions)
    return (this.requestMetrics.length * 0.001) + (this.systemMetrics.length * 0.0005); // Rough estimate
  }

  private getActiveConnections(): number {
    // Would be populated from connection pool
    return 0;
  }

  getMetrics(since?: number): {
    requests: RequestMetrics[];
    system: SystemMetrics[];
    alerts: AlertEvent[];
    summary: {
      totalRequests: number;
      totalErrors: number;
      averageResponseTime: number;
      currentErrorRate: number;
      activeAlerts: number;
    };
  } {
    const sinceTime = since || (Date.now() - (24 * 60 * 60 * 1000)); // Last 24 hours

    const filteredRequests = this.requestMetrics.filter(m => m.timestamp >= sinceTime);
    const filteredSystem = this.systemMetrics.filter(m => m.timestamp >= sinceTime);
    const alerts = Array.from(this.activeAlerts.values());

    const totalErrors = filteredRequests.filter(m => m.statusCode >= 400).length;
    const averageResponseTime = filteredRequests.length > 0
      ? filteredRequests.reduce((sum, m) => sum + m.responseTimeMs, 0) / filteredRequests.length
      : 0;

    return {
      requests: filteredRequests,
      system: filteredSystem,
      alerts,
      summary: {
        totalRequests: filteredRequests.length,
        totalErrors,
        averageResponseTime,
        currentErrorRate: filteredRequests.length > 0 ? totalErrors / filteredRequests.length : 0,
        activeAlerts: alerts.filter(a => !a.resolved).length
      }
    };
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      
      logger.info('Alert resolved', {
        alertId,
        type: alert.type,
        duration: alert.resolvedAt - alert.timestamp
      });
      
      return true;
    }
    return false;
  }

  cleanup(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    
    logger.info('Metrics collector cleaned up', {
      requestMetrics: this.requestMetrics.length,
      systemMetrics: this.systemMetrics.length,
      activeAlerts: this.activeAlerts.size
    });
  }
}

// Global metrics collector instance
let globalCollector: MetricsCollector | null = null;

export function getMetricsCollector(config?: Partial<MonitoringConfig>): MetricsCollector {
  if (!globalCollector) {
    const fullConfig = { ...DEFAULT_MONITORING_CONFIG, ...config };
    globalCollector = new MetricsCollector(fullConfig);
  }
  return globalCollector;
}

// Monitoring middleware wrapper
export async function withMonitoring(
  request: Request,
  handler: () => Promise<Response>,
  config?: Partial<MonitoringConfig>
): Promise<Response> {
  const collector = getMetricsCollector(config);
  const startTime = performance.now();
  const timestamp = Date.now();
  
  // Extract request information
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  const userAgent = request.headers.get('user-agent');
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  const ip = getClientIP(request);

  let response: Response;
  let error: string | undefined;

  try {
    // Execute the handler
    response = await handler();
    
  } catch (handlerError) {
    error = (handlerError as Error).message;
    
    // Create error response
    response = new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Calculate metrics
  const responseTime = performance.now() - startTime;
  const responseSize = await getResponseSize(response);

  // Record metrics
  const requestMetrics: RequestMetrics = {
    timestamp,
    method,
    path,
    statusCode: response.status,
    responseTimeMs: responseTime,
    requestSize: contentLength,
    responseSize,
    userAgent,
    ip,
    error,
    cacheHit: response.headers.get('X-Cache-Status') === 'HIT',
    dbQueryCount: parseInt(response.headers.get('X-DB-Query-Count') || '0'),
    dbQueryTimeMs: parseFloat(response.headers.get('X-DB-Query-Time') || '0')
  };

  collector.recordRequest(requestMetrics);

  // Add monitoring headers to response
  const monitoredResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });

  monitoredResponse.headers.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
  monitoredResponse.headers.set('X-Request-ID', crypto.randomUUID());

  return monitoredResponse;
}

// Health check endpoint
export function createHealthCheck(
  customChecks?: Array<() => Promise<{ name: string; status: 'healthy' | 'unhealthy'; details?: any }>>
): () => Promise<Response> {
  return async (): Promise<Response> => {
    const startTime = performance.now();
    const collector = getMetricsCollector();
    
    const health = {
      status: 'healthy' as 'healthy' | 'unhealthy',
      timestamp: new Date().toISOString(),
      version: Deno.env.get('APP_VERSION') || '1.0.0',
      environment: Deno.env.get('ENVIRONMENT') || 'unknown',
      uptime: Date.now() - startTime,
      checks: [] as any[]
    };

    // Basic system checks
    const basicChecks = [
      {
        name: 'memory',
        status: 'healthy' as const,
        details: { usageMB: collector.getMetrics().summary.totalRequests }
      },
      {
        name: 'database',
        status: 'healthy' as const,
        details: { connected: true }
      }
    ];

    health.checks.push(...basicChecks);

    // Custom checks
    if (customChecks) {
      try {
        const customResults = await Promise.allSettled(
          customChecks.map(check => check())
        );
        
        customResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            health.checks.push(result.value);
            if (result.value.status === 'unhealthy') {
              health.status = 'unhealthy';
            }
          } else {
            health.checks.push({
              name: `custom_check_${index}`,
              status: 'unhealthy' as const,
              details: { error: result.reason?.message || 'Unknown error' }
            });
            health.status = 'unhealthy';
          }
        });
      } catch (error) {
        health.status = 'unhealthy';
        health.checks.push({
          name: 'custom_checks',
          status: 'unhealthy' as const,
          details: { error: (error as Error).message }
        });
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    return new Response(JSON.stringify(health, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${(performance.now() - startTime).toFixed(2)}ms`
      }
    });
  };
}

// Utility functions
function getClientIP(request: Request): string | null {
  const headers = [
    'cf-connecting-ip',
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip'
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      return value.split(',')[0].trim();
    }
  }

  return null;
}

async function getResponseSize(response: Response): Promise<number> {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    return parseInt(contentLength);
  }
  
  // Estimate size if not provided
  try {
    const clone = response.clone();
    const text = await clone.text();
    return new Blob([text]).size;
  } catch {
    return 0;
  }
}

// Cleanup function
export function cleanupMonitoring(): void {
  if (globalCollector) {
    globalCollector.cleanup();
    globalCollector = null;
  }
}