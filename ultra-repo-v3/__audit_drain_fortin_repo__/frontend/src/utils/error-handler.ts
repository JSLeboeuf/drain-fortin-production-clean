/**
 * Standardized Error Handling System
 * Provides consistent error management across the application
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export class ApplicationError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.severity = severity;
    this.category = category;
    this.context = {
      ...context,
      timestamp: new Date()
    };
    this.originalError = originalError;
    this.isOperational = severity !== ErrorSeverity.CRITICAL;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError);
    }
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      severity: this.severity,
      category: this.category,
      context: this.context,
      stack: this.stack,
      isOperational: this.isOperational
    };
  }
}

export class NetworkError extends ApplicationError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context, originalError);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCategory.VALIDATION, ErrorSeverity.LOW, context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCategory.AUTHORIZATION, ErrorSeverity.HIGH, context);
    this.name = 'AuthorizationError';
  }
}

export class BusinessLogicError extends ApplicationError {
  constructor(message: string, severity: ErrorSeverity = ErrorSeverity.MEDIUM, context?: ErrorContext) {
    super(message, ErrorCategory.BUSINESS_LOGIC, severity, context);
    this.name = 'BusinessLogicError';
  }
}

export class SystemError extends ApplicationError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL, context, originalError);
    this.name = 'SystemError';
    this.isOperational = false;
  }
}

/**
 * Global Error Handler
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: ((error: ApplicationError) => void)[] = [];

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handle(error: Error | ApplicationError, context?: ErrorContext): void {
    let appError: ApplicationError;

    if (error instanceof ApplicationError) {
      appError = error;
    } else {
      // Convert unknown errors to ApplicationError
      appError = new ApplicationError(
        error.message || 'An unexpected error occurred',
        ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM,
        context,
        error
      );
    }

    // Log error based on severity
    this.logError(appError);

    // Notify listeners
    this.notifyListeners(appError);

    // Send to monitoring service if critical
    if (appError.severity === ErrorSeverity.CRITICAL) {
      this.sendToMonitoring(appError);
    }

    // Rethrow if not operational
    if (!appError.isOperational) {
      throw appError;
    }
  }

  private logError(error: ApplicationError): void {
    const logData = {
      timestamp: new Date().toISOString(),
      ...error.toJSON()
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        console.warn('[ERROR]', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.error('[ERROR]', logData);
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        console.error('[CRITICAL ERROR]', logData);
        break;
    }
  }

  private sendToMonitoring(error: ApplicationError): void {
    // Integration with Sentry or other monitoring service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        level: error.severity,
        tags: {
          category: error.category,
          isOperational: error.isOperational
        },
        extra: error.context
      });
    }
  }

  public addErrorListener(listener: (error: ApplicationError) => void): void {
    this.errorListeners.push(listener);
  }

  private notifyListeners(error: ApplicationError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Async error wrapper for consistent error handling
   */
  public async wrapAsync<T>(
    fn: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error as Error, context);
      throw error;
    }
  }

  /**
   * Sync error wrapper for consistent error handling
   */
  public wrap<T>(
    fn: () => T,
    context?: ErrorContext
  ): T {
    try {
      return fn();
    } catch (error) {
      this.handle(error as Error, context);
      throw error;
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility function for easy error handling in components
export function handleError(error: Error | ApplicationError, context?: ErrorContext): void {
  errorHandler.handle(error, context);
}

// Type guard for ApplicationError
export function isApplicationError(error: any): error is ApplicationError {
  return error instanceof ApplicationError;
}