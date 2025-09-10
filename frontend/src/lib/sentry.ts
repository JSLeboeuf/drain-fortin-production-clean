/**
 * Sentry Configuration for Production Monitoring
 * 
 * Setup Instructions:
 * 1. Install Sentry: npm install @sentry/react
 * 2. Get DSN from https://sentry.io
 * 3. Add VITE_SENTRY_DSN to .env
 * 4. Import and initialize in main.tsx
 */

import * as Sentry from '@sentry/react';

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn || import.meta.env.DEV) {
    // Skip Sentry in development or if DSN not configured
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      // Browser tracing
      Sentry.browserTracingIntegration(),
      // Session replay
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    
    // Session replay sampling
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% when errors occur
    
    // Release tracking
    release: `drain-fortin@${import.meta.env.VITE_APP_VERSION || '1.0.1'}`,
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out non-critical errors
      const error = hint.originalException;
      
      // Skip network errors in development
      if (error && error.message && error.message.includes('NetworkError')) {
        return null;
      }
      
      // Skip cancelled requests
      if (error && error.name === 'AbortError') {
        return null;
      }
      
      // Add user context if available
      const user = localStorage.getItem('user');
      if (user) {
        event.user = JSON.parse(user);
      }
      
      return event;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
    ],
  });
};

// Error boundary component
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Performance monitoring
export const sentryCreateTransaction = (name: string) => {
  return Sentry.startTransaction({ name });
};

// Custom error logging
export const logError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

// User identification
export const identifyUser = (userId: string, email?: string, username?: string) => {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
};

// Breadcrumb tracking
export const addBreadcrumb = (message: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    level: 'info',
    data,
  });
};

// Feature flag tracking
export const trackFeatureFlag = (flag: string, value: boolean) => {
  Sentry.setTag(`feature.${flag}`, value);
};

// Performance metrics
export const measurePerformance = async <T,>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const transaction = sentryCreateTransaction(operation);
  
  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
};