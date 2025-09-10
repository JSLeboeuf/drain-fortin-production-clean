import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('⚠️ Sentry DSN not configured - monitoring disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      
      // Don't send events in development unless explicitly enabled
      if (import.meta.env.DEV && !import.meta.env.VITE_SENTRY_DEBUG) {
        return null;
      }
      
      return event;
    },
  });

  // Log initialization
  console.log('✅ Monitoring initialized with Sentry');
}

// Error boundary wrapper
export const ErrorBoundary = Sentry.ErrorBoundary;

// Performance monitoring
export function trackPerformance(name: string, fn: () => void) {
  const transaction = Sentry.startTransaction({ name });
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));
  
  try {
    fn();
  } finally {
    transaction.finish();
  }
}

// Custom error tracking
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: {
      custom: context
    }
  });
}

// User tracking (anonymized)
export function setUserContext(userId: string) {
  Sentry.setUser({
    id: userId,
    // Don't send PII
  });
}

// Feature tracking
export function trackFeature(feature: string, properties?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message: `Feature: ${feature}`,
    category: 'feature',
    level: 'info',
    data: properties,
  });
}