/**
 * Monitoring Configuration
 * Central configuration for all monitoring services
 */

export const monitoringConfig = {
  // Sentry Configuration
  sentry: {
    dsn: import.meta.env['VITE_SENTRY_DSN'],
    environment: import.meta.env['VITE_ENVIRONMENT'] || 'development',
    enabled: import.meta.env['PROD'] && !!import.meta.env['VITE_SENTRY_DSN'],
    tracesSampleRate: import.meta.env['PROD'] ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  },

  // Health Check Configuration
  healthCheck: {
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    endpoints: {
      api: '/api/health',
      full: '/api/health?full=true',
    },
  },

  // Performance Thresholds (Core Web Vitals)
  performance: {
    LCP: { good: 2500, needs: 4000 }, // Largest Contentful Paint (ms)
    FID: { good: 100, needs: 300 },   // First Input Delay (ms)
    CLS: { good: 0.1, needs: 0.25 },  // Cumulative Layout Shift
    TTFB: { good: 800, needs: 1800 }, // Time to First Byte (ms)
    FCP: { good: 1800, needs: 3000 }, // First Contentful Paint (ms)
  },

  // Alert Thresholds
  alerts: {
    errorRate: {
      threshold: 5, // errors per minute
      window: 60000, // 1 minute
      severity: 'critical' as const,
    },
    memoryUsage: {
      threshold: 90, // percentage
      severity: 'warning' as const,
    },
    apiLatency: {
      threshold: 1000, // ms
      severity: 'warning' as const,
    },
    webhookResponseTime: {
      threshold: 3000, // ms
      severity: 'critical' as const,
    },
  },

  // Monitoring Dashboard Configuration
  dashboard: {
    refreshInterval: 10000, // 10 seconds
    maxMetrics: 100, // Maximum metrics to display
    maxErrors: 50, // Maximum errors to display
    maxAlerts: 20, // Maximum alerts to display
  },

  // Feature Flags
  features: {
    enableSentry: import.meta.env['VITE_ENABLE_SENTRY'] === 'true',
    enableWebVitals: true,
    enableMemoryMonitoring: true,
    enableNetworkMonitoring: true,
    enableFrameMonitoring: true,
    enableHealthChecks: true,
    enableAlerts: true,
    enableDashboard: true,
  },

  // Data Retention
  retention: {
    metrics: 1000, // Keep last 1000 metrics
    errors: 100, // Keep last 100 errors
    alerts: 50, // Keep last 50 alerts
  },

  // Custom Tags for Monitoring
  tags: {
    version: import.meta.env['VITE_APP_VERSION'] || '1.0.0',
    environment: import.meta.env['VITE_ENVIRONMENT'] || 'development',
    region: import.meta.env['VITE_REGION'] || 'us-east',
  },
};

// Export type for TypeScript
export type MonitoringConfig = typeof monitoringConfig;