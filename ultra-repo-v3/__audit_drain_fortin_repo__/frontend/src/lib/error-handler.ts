/**
 * Advanced Error Handling System
 * Provides comprehensive error management with recovery strategies
 */

import { logger } from './logger';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  BUSINESS = 'business',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

// Custom error class with additional metadata
export class AppError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly code?: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    options?: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      code?: string;
      context?: Record<string, unknown>;
      recoverable?: boolean;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.severity = options?.severity || ErrorSeverity.MEDIUM;
    this.category = options?.category || ErrorCategory.UNKNOWN;
    this.code = options?.code;
    this.context = options?.context;
    this.timestamp = new Date();
    this.recoverable = options?.recoverable ?? true;
    
    if (options?.cause) {
      this.cause = options.cause;
    }

    // Maintain proper stack trace
    Error.captureStackTrace(this, AppError);
  }
}

// Network error with retry logic
export class NetworkError extends AppError {
  public readonly statusCode?: number;
  public readonly endpoint?: string;
  public retryCount: number = 0;
  public maxRetries: number = 3;

  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    options?: {
      maxRetries?: number;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.NETWORK,
      code: `NETWORK_${statusCode || 'UNKNOWN'}`,
      context: { ...options?.context, statusCode, endpoint },
      recoverable: statusCode !== 401 && statusCode !== 403
    });
    
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.maxRetries = options?.maxRetries || 3;
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries && this.recoverable;
  }

  incrementRetry(): void {
    this.retryCount++;
  }
}

// Validation error with field details
export class ValidationError extends AppError {
  public readonly fields: Record<string, string[]>;

  constructor(
    message: string,
    fields: Record<string, string[]>,
    options?: {
      context?: Record<string, unknown>;
    }
  ) {
    super(message, {
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.VALIDATION,
      code: 'VALIDATION_ERROR',
      context: options?.context,
      recoverable: true
    });
    
    this.name = 'ValidationError';
    this.fields = fields;
  }

  getFieldErrors(field: string): string[] {
    return this.fields[field] || [];
  }

  hasFieldError(field: string): boolean {
    return field in this.fields;
  }
}

// Permission error
export class PermissionError extends AppError {
  public readonly requiredPermission?: string;
  public readonly userPermissions?: string[];

  constructor(
    message: string,
    requiredPermission?: string,
    userPermissions?: string[]
  ) {
    super(message, {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.PERMISSION,
      code: 'PERMISSION_DENIED',
      context: { requiredPermission, userPermissions },
      recoverable: false
    });
    
    this.name = 'PermissionError';
    this.requiredPermission = requiredPermission;
    this.userPermissions = userPermissions;
  }
}

// Error handler with recovery strategies
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: AppError[] = [];
  private maxQueueSize = 100;
  private errorCallbacks: Map<ErrorCategory, Array<(error: AppError) => void>> = new Map();

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle error with automatic recovery attempts
  async handle(error: Error | AppError): Promise<void> {
    const appError = this.normalizeError(error);
    
    // Log error
    this.logError(appError);
    
    // Add to queue
    this.queueError(appError);
    
    // Notify listeners
    this.notifyListeners(appError);
    
    // Attempt recovery if possible
    if (appError.recoverable) {
      await this.attemptRecovery(appError);
    }
  }

  // Normalize any error to AppError
  private normalizeError(error: Error | AppError): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Check for common error patterns
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return new NetworkError(error.message);
    }

    if (error.name === 'ValidationError') {
      return new ValidationError(error.message, {});
    }

    // Default to system error
    return new AppError(error.message, {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.SYSTEM,
      cause: error
    });
  }

  // Log error based on severity
  private logError(error: AppError): void {
    const logData = {
      message: error.message,
      severity: error.severity,
      category: error.category,
      code: error.code,
      context: error.context,
      stack: error.stack
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        logger.debug('Low severity error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error', logData);
        break;
      case ErrorSeverity.CRITICAL:
        logger.error('CRITICAL ERROR', logData);
        // In production, this would trigger alerts
        this.sendAlert(error);
        break;
    }
  }

  // Queue error for analysis
  private queueError(error: AppError): void {
    this.errorQueue.push(error);
    
    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  // Notify registered listeners
  private notifyListeners(error: AppError): void {
    const listeners = this.errorCallbacks.get(error.category) || [];
    listeners.forEach(callback => {
      try {
        callback(error);
      } catch (e) {
        logger.error('Error in error callback', e);
      }
    });
  }

  // Attempt automatic recovery
  private async attemptRecovery(error: AppError): Promise<void> {
    if (error instanceof NetworkError && error.canRetry()) {
      error.incrementRetry();
      logger.info(`Attempting retry ${error.retryCount}/${error.maxRetries} for network error`);
      // Recovery logic would go here
    }
  }

  // Send critical error alerts
  private sendAlert(error: AppError): void {
    // In production, this would send to monitoring service
    logger.error('ALERT: Critical error occurred', {
      error: error.message,
      severity: error.severity,
      timestamp: error.timestamp
    });
  }

  // Register error listener
  onError(category: ErrorCategory, callback: (error: AppError) => void): () => void {
    if (!this.errorCallbacks.has(category)) {
      this.errorCallbacks.set(category, []);
    }
    
    this.errorCallbacks.get(category)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.errorCallbacks.get(category);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Get error statistics
  getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: AppError[];
  } {
    const stats = {
      total: this.errorQueue.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: this.errorQueue.slice(-10)
    };

    this.errorQueue.forEach(error => {
      // Count by category
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  // Clear error queue
  clearErrors(): void {
    this.errorQueue = [];
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// Error boundary helper
export function createErrorBoundary(
  fallback: (error: AppError) => React.ReactNode
): React.ComponentType<{ children: React.ReactNode }> {
  return class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: AppError }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): { hasError: boolean; error: AppError } {
      const appError = error instanceof AppError 
        ? error 
        : new AppError(error.message, { cause: error });
      
      return { hasError: true, error: appError };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      errorHandler.handle(error);
    }

    render() {
      if (this.state.hasError && this.state.error) {
        return fallback(this.state.error);
      }

      return this.props.children;
    }
  };
}

// Async error wrapper
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: {
    fallback?: T;
    retry?: number;
    category?: ErrorCategory;
  }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const appError = error instanceof AppError
      ? error
      : new AppError((error as Error).message, {
          category: options?.category || ErrorCategory.UNKNOWN,
          cause: error as Error
        });

    await errorHandler.handle(appError);

    // Retry logic
    if (options?.retry && options.retry > 0) {
      logger.info(`Retrying operation, attempts remaining: ${options.retry}`);
      return withErrorHandling(fn, { ...options, retry: options.retry - 1 });
    }

    // Return fallback if provided
    if (options?.fallback !== undefined) {
      return options.fallback;
    }

    throw appError;
  }
}