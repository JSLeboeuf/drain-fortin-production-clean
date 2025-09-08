// Structured error handling for Drain Fortin backend system
export class DrainFortinError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'DrainFortinError';
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DrainFortinError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      context: this.context,
      stack: this.stack
    };
  }
}

export class ValidationError extends DrainFortinError {
  constructor(message: string, field?: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details, { field });
  }
}

export class AuthenticationError extends DrainFortinError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super('AUTHENTICATION_ERROR', message, 401, details);
  }
}

export class AuthorizationError extends DrainFortinError {
  constructor(message: string = 'Access denied', details?: any) {
    super('AUTHORIZATION_ERROR', message, 403, details);
  }
}

export class NotFoundError extends DrainFortinError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super('NOT_FOUND_ERROR', message, 404, { resource, id });
  }
}

export class ConflictError extends DrainFortinError {
  constructor(message: string, conflictField?: string, details?: any) {
    super('CONFLICT_ERROR', message, 409, details, { conflictField });
  }
}

export class ExternalServiceError extends DrainFortinError {
  constructor(service: string, message: string, details?: any) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 502, details, { service });
  }
}

export class DatabaseError extends DrainFortinError {
  constructor(message: string, operation?: string, details?: any) {
    super('DATABASE_ERROR', message, 500, details, { operation });
  }
}

export class RateLimitError extends DrainFortinError {
  constructor(limit: number, window: string, retryAfter?: number) {
    super(
      'RATE_LIMIT_ERROR', 
      `Rate limit exceeded: ${limit} requests per ${window}`, 
      429, 
      { retryAfter },
      { limit, window }
    );
  }
}

export class BusinessLogicError extends DrainFortinError {
  constructor(rule: string, message: string, details?: any) {
    super('BUSINESS_LOGIC_ERROR', message, 422, details, { rule });
  }
}

// Error type guards
export function isDrainFortinError(error: any): error is DrainFortinError {
  return error instanceof DrainFortinError;
}

export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}

export function isExternalServiceError(error: any): error is ExternalServiceError {
  return error instanceof ExternalServiceError;
}

export function isDatabaseError(error: any): error is DatabaseError {
  return error instanceof DatabaseError;
}

// Error factory functions
export const ErrorFactory = {
  validation: (message: string, field?: string, details?: any) => 
    new ValidationError(message, field, details),
    
  authentication: (message?: string, details?: any) => 
    new AuthenticationError(message, details),
    
  authorization: (message?: string, details?: any) => 
    new AuthorizationError(message, details),
    
  notFound: (resource: string, id?: string) => 
    new NotFoundError(resource, id),
    
  conflict: (message: string, field?: string, details?: any) => 
    new ConflictError(message, field, details),
    
  externalService: (service: string, message: string, details?: any) => 
    new ExternalServiceError(service, message, details),
    
  database: (message: string, operation?: string, details?: any) => 
    new DatabaseError(message, operation, details),
    
  rateLimit: (limit: number, window: string, retryAfter?: number) => 
    new RateLimitError(limit, window, retryAfter),
    
  businessLogic: (rule: string, message: string, details?: any) => 
    new BusinessLogicError(rule, message, details)
};

// Error response formatter for API responses
export function formatErrorResponse(error: Error, includeStack = false): Record<string, any> {
  if (isDrainFortinError(error)) {
    return {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
        context: error.context,
        ...(includeStack && { stack: error.stack })
      }
    };
  }

  // Handle unknown errors
  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
      ...(includeStack && { stack: error.stack })
    }
  };
}

// Error aggregator for batch operations
export class ErrorAggregator {
  private errors: Array<{ operation: string; error: Error }> = [];

  add(operation: string, error: Error): void {
    this.errors.push({ operation, error });
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): Array<{ operation: string; error: Error }> {
    return [...this.errors];
  }

  getSummary(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    for (const { error } of this.errors) {
      const type = isDrainFortinError(error) ? error.code : 'UNKNOWN_ERROR';
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      total: this.errors.length,
      byType
    };
  }

  createSummaryError(): DrainFortinError {
    const summary = this.getSummary();
    return new DrainFortinError(
      'BATCH_OPERATION_ERRORS',
      `Batch operation completed with ${summary.total} errors`,
      500,
      { 
        errors: this.errors.map(({ operation, error }) => ({
          operation,
          error: formatErrorResponse(error)
        }))
      },
      { summary }
    );
  }

  clear(): void {
    this.errors = [];
  }
}

// Utility to safely extract error information
export function extractErrorInfo(error: unknown): {
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
} {
  if (isDrainFortinError(error)) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500
    };
  }

  return {
    message: String(error) || 'Unknown error occurred',
    statusCode: 500
  };
}