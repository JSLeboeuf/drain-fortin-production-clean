// Structured logging utility for Supabase Edge Functions
export interface LogContext {
  [key: string]: any;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  requestId?: string;
  userId?: string;
  callId?: string;
}

class Logger {
  private requestId?: string;
  private userId?: string;
  private defaultContext: LogContext = {};

  constructor() {
    // Try to get request ID from headers if available
    try {
      const requestId = crypto.randomUUID();
      this.requestId = requestId;
    } catch {
      // Fallback for environments without crypto.randomUUID
      this.requestId = Math.random().toString(36).substring(2, 15);
    }
  }

  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  clearDefaultContext(): void {
    this.defaultContext = {};
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, errorOrContext?: Error | LogContext, context?: LogContext): void {
    if (errorOrContext instanceof Error) {
      this.logError('error', message, errorOrContext, context);
    } else {
      this.log('error', message, errorOrContext);
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      userId: this.userId,
      context: { ...this.defaultContext, ...context }
    };

    // Remove empty context if no data
    if (!entry.context || Object.keys(entry.context).length === 0) {
      delete entry.context;
    }

    this.output(entry);
  }

  private logError(level: LogLevel, message: string, error: Error, context?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      userId: this.userId,
      context: { ...this.defaultContext, ...context },
      error: {
        name: error.name,
        message: error.message,
        stack: this.shouldIncludeStack() ? error.stack : undefined,
        code: (error as any).code || undefined
      }
    };

    // Remove empty context if no data
    if (!entry.context || Object.keys(entry.context).length === 0) {
      delete entry.context;
    }

    this.output(entry);
  }

  private output(entry: LogEntry): void {
    const shouldLog = this.shouldLog(entry.level);
    
    if (!shouldLog) {
      return;
    }

    // Format for Supabase Edge Functions (appears in Supabase logs)
    const formatted = JSON.stringify(entry);
    
    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const currentLevel = this.getCurrentLogLevel();
    const levelPriority: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levelPriority[level] >= levelPriority[currentLevel];
  }

  private getCurrentLogLevel(): LogLevel {
    const envLevel = Deno.env.get('LOG_LEVEL')?.toLowerCase();
    
    switch (envLevel) {
      case 'debug':
        return 'debug';
      case 'info':
        return 'info';
      case 'warn':
        return 'warn';
      case 'error':
        return 'error';
      default:
        // Default to info in production, debug in development
        return Deno.env.get('ENVIRONMENT') === 'production' ? 'info' : 'debug';
    }
  }

  private shouldIncludeStack(): boolean {
    // Include stack traces in development or when explicitly enabled
    return Deno.env.get('ENVIRONMENT') !== 'production' || 
           Deno.env.get('INCLUDE_STACK_TRACE') === 'true';
  }

  // Helper methods for common logging patterns
  startOperation(operation: string, context?: LogContext): string {
    const operationId = crypto.randomUUID();
    this.info(`Starting ${operation}`, { 
      operation, 
      operationId, 
      ...context 
    });
    return operationId;
  }

  endOperation(operation: string, operationId: string, context?: LogContext): void {
    this.info(`Completed ${operation}`, { 
      operation, 
      operationId, 
      ...context 
    });
  }

  failOperation(operation: string, operationId: string, error: Error, context?: LogContext): void {
    this.error(`Failed ${operation}`, error, { 
      operation, 
      operationId, 
      ...context 
    });
  }

  // Performance timing
  time(label: string): () => void {
    const start = performance.now();
    this.debug(`Timer started: ${label}`);
    
    return () => {
      const duration = performance.now() - start;
      this.info(`Timer ended: ${label}`, { 
        duration: `${duration.toFixed(2)}ms`,
        label 
      });
    };
  }

  // Database operation logging
  dbQuery(query: string, params?: any[], context?: LogContext): void {
    this.debug('Database query', {
      query: query.replace(/\s+/g, ' ').trim(),
      paramCount: params?.length || 0,
      ...context
    });
  }

  dbResult(rowCount: number, duration?: number, context?: LogContext): void {
    this.debug('Database result', {
      rowCount,
      duration: duration ? `${duration}ms` : undefined,
      ...context
    });
  }

  // HTTP request/response logging
  httpRequest(method: string, path: string, context?: LogContext): void {
    this.info('HTTP request', {
      method: method.toUpperCase(),
      path,
      ...context
    });
  }

  httpResponse(status: number, duration?: number, context?: LogContext): void {
    const level = status >= 400 ? 'warn' : 'info';
    this.log(level, 'HTTP response', {
      status,
      duration: duration ? `${duration}ms` : undefined,
      ...context
    });
  }

  // External service logging
  externalRequest(service: string, operation: string, context?: LogContext): void {
    this.info('External service request', {
      service,
      operation,
      ...context
    });
  }

  externalResponse(service: string, success: boolean, duration?: number, context?: LogContext): void {
    const level = success ? 'info' : 'warn';
    this.log(level, 'External service response', {
      service,
      success,
      duration: duration ? `${duration}ms` : undefined,
      ...context
    });
  }

  // Business logic logging
  businessEvent(event: string, context?: LogContext): void {
    this.info('Business event', {
      event,
      ...context
    });
  }

  // Security logging
  securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.log(level, 'Security event', {
      securityEvent: event,
      severity,
      ...context
    });
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Helper function to create a child logger with additional context
export function createChildLogger(context: LogContext): Logger {
  const childLogger = new Logger();
  childLogger.setDefaultContext(context);
  return childLogger;
}

// Middleware helper for request logging
export function withRequestLogging<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: LogContext
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const operationId = logger.startOperation(operationName, context);
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      logger.endOperation(operationName, operationId, { 
        duration: `${duration.toFixed(2)}ms`,
        ...context 
      });
      
      resolve(result);
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.failOperation(operationName, operationId, error as Error, {
        duration: `${duration.toFixed(2)}ms`,
        ...context
      });
      
      reject(error);
    }
  });
}

// Export types for use in other modules
export type { LogContext, LogLevel, LogEntry };