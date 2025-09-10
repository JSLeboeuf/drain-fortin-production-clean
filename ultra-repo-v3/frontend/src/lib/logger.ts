/**
 * Secure logger utility that only logs in development mode
 * Prevents information leakage in production
 * Integrates with Sentry for production error monitoring
 */

import * as Sentry from '@sentry/react';

// Initialize Sentry for production error monitoring
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENVIRONMENT || 'production',
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.1, // 10% sampling for performance
    // To enable Replay, install @sentry/replay and add replayIntegration()
    beforeSend(event) {
      // Filter out sensitive data from error reports
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      
      // Remove sensitive request data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.data && typeof event.request.data === 'object') {
          const data = event.request.data as any;
          delete data.password;
          delete data.token;
          delete data.apiKey;
        }
      }
      
      return event;
    },
  });
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private addLog(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data
    };

    // Store logs in memory for debugging
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Only output to console in development
    if (this.isDev) {
      const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[method](`[${level.toUpperCase()}]`, message, data || '');
    }
  }

  debug(message: string, data?: any) {
    this.addLog('debug', message, data);
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }

  error(message: string, error?: any) {
    this.addLog('error', message, error);
    
    // In production, send errors to monitoring service
    if (!this.isDev && error) {
      this.sendToMonitoring(message, error);
    }
  }

  private sendToMonitoring(message: string, error: any) {
    try {
      if (import.meta.env.PROD) {
        // Set additional context
        Sentry.addBreadcrumb({
          message,
          level: 'error',
          timestamp: Date.now() / 1000,
        });

        // Determine error severity based on error type
        let level: Sentry.SeverityLevel = 'error';
        if (error?.name === 'TypeError' || error?.name === 'ReferenceError') {
          level = 'fatal';
        } else if (error?.name === 'ValidationError' || error?.status >= 400 && error?.status < 500) {
          level = 'warning';
        }

        // Send error to Sentry with context
        if (error instanceof Error) {
          Sentry.captureException(error, {
            level,
            tags: {
              component: 'logger',
              environment: import.meta.env.VITE_ENVIRONMENT || 'production',
            },
            extra: {
              message,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              url: window.location.href,
            },
          });
        } else {
          // Handle non-Error objects
          Sentry.captureMessage(`${message}: ${JSON.stringify(error)}`, {
            level,
            tags: {
              component: 'logger',
              errorType: 'non_error_object',
            },
            extra: {
              originalError: error,
              timestamp: new Date().toISOString(),
            },
          });
        }
      }
    } catch (sentryError) {
      // Fallback logging if Sentry fails
      if (this.isDev) {
        console.error('Failed to send error to Sentry:', sentryError);
        console.error('Original error:', error);
      }
    }
  }

  // Get recent logs for debugging (dev only)
  getRecentLogs(): LogEntry[] {
    return this.isDev ? [...this.logs] : [];
  }

  // Clear stored logs
  clearLogs() {
    this.logs = [];
  }

  // Manually capture message to Sentry (production only)
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', extra?: any) {
    if (import.meta.env.PROD) {
      Sentry.captureMessage(message, {
        level,
        tags: {
          component: 'logger',
          manual_capture: true,
        },
        extra,
      });
    }
  }

  // Set user context for Sentry (production only)
  setUser(user: { id?: string; username?: string; segment?: string }) {
    if (import.meta.env.PROD) {
      Sentry.setUser({
        id: user.id,
        username: user.username,
        // Note: We specifically avoid setting email or IP for privacy
        segment: user.segment,
      });
    }
  }

  // Add breadcrumb for debugging context
  addBreadcrumb(message: string, category: string = 'default', data?: any) {
    if (import.meta.env.PROD) {
      Sentry.addBreadcrumb({
        message,
        category,
        level: 'info',
        data,
        timestamp: Date.now() / 1000,
      });
    }
  }
}

export const logger = new Logger();
