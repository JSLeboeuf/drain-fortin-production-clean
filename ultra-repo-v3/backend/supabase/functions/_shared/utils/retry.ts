// Retry mechanisms with exponential backoff and jitter
import { ExternalServiceError, DrainFortinError } from './errors.ts';
import { logger } from './logging.ts';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  exponentialBase: 2,
  jitter: true,
  retryCondition: (error) => {
    // Retry on temporary failures, not on client errors
    if (error instanceof DrainFortinError) {
      return error.statusCode >= 500 || error.statusCode === 429; // Server errors or rate limits
    }
    return true; // Default to retry for unknown errors
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = DEFAULT_RETRY_CONFIG.maxAttempts,
  baseDelayMs: number = DEFAULT_RETRY_CONFIG.baseDelayMs,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, maxAttempts, baseDelayMs, ...config };
  
  let lastError: Error;
  let attempt = 1;
  
  while (attempt <= fullConfig.maxAttempts) {
    try {
      const result = await operation();
      
      if (attempt > 1) {
        logger.info('Operation succeeded after retry', { 
          attempt, 
          totalAttempts: fullConfig.maxAttempts 
        });
      }
      
      return result;
      
    } catch (error) {
      lastError = error as Error;
      
      const shouldRetry = attempt < fullConfig.maxAttempts && 
                         (fullConfig.retryCondition ? fullConfig.retryCondition(lastError) : true);
      
      logger.warn('Operation failed, attempt ' + attempt, {
        attempt,
        maxAttempts: fullConfig.maxAttempts,
        error: lastError.message,
        willRetry: shouldRetry
      });
      
      if (!shouldRetry) {
        break;
      }
      
      // Calculate delay with exponential backoff and optional jitter
      const baseDelay = Math.min(
        fullConfig.baseDelayMs * Math.pow(fullConfig.exponentialBase, attempt - 1),
        fullConfig.maxDelayMs
      );
      
      const delay = fullConfig.jitter 
        ? baseDelay * (0.5 + Math.random() * 0.5) // Add 0-50% jitter
        : baseDelay;
      
      logger.debug('Retrying operation after delay', { 
        attempt, 
        delayMs: Math.round(delay) 
      });
      
      await sleep(delay);
      attempt++;
    }
  }
  
  logger.error('Operation failed after all retry attempts', {
    attempts: attempt - 1,
    maxAttempts: fullConfig.maxAttempts,
    finalError: lastError.message
  });
  
  throw lastError;
}

export async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const operationWithTimeout = async (): Promise<T> => {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new DrainFortinError(
            'OPERATION_TIMEOUT',
            `Operation timed out after ${timeoutMs}ms`,
            408,
            { timeoutMs }
          ));
        }, timeoutMs);
      })
    ]);
  };
  
  return withRetry(operationWithTimeout, undefined, undefined, retryConfig);
}

// Specialized retry for database operations
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  return withRetry(
    operation,
    maxAttempts,
    500, // Shorter delay for DB operations
    {
      exponentialBase: 1.5, // Gentler backoff
      maxDelayMs: 5000, // Max 5 seconds for DB
      retryCondition: (error) => {
        // Retry on connection errors, timeouts, but not on constraint violations
        if (error instanceof DrainFortinError && error.code === 'DATABASE_ERROR') {
          return !error.message.includes('constraint') && 
                 !error.message.includes('duplicate') &&
                 !error.message.includes('foreign key');
        }
        return false;
      }
    }
  );
}

// Specialized retry for external service calls
export async function withExternalServiceRetry<T>(
  operation: () => Promise<T>,
  serviceName: string,
  maxAttempts: number = 3
): Promise<T> {
  return withRetry(
    operation,
    maxAttempts,
    2000, // Longer delay for external services
    {
      maxDelayMs: 60000, // Up to 1 minute for external services
      retryCondition: (error) => {
        if (error instanceof ExternalServiceError) {
          // Don't retry on authentication errors (401) or not found (404)
          const statusCode = error.details?.status || error.statusCode;
          return ![400, 401, 403, 404, 422].includes(statusCode);
        }
        return true;
      }
    }
  );
}

// Batch retry with partial failure handling
export async function withBatchRetry<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  config: {
    maxConcurrent?: number;
    maxAttempts?: number;
    continueOnFailure?: boolean;
  } = {}
): Promise<Array<{ success: boolean; item: T; result?: R; error?: Error }>> {
  const {
    maxConcurrent = 5,
    maxAttempts = 3,
    continueOnFailure = true
  } = config;

  const results: Array<{ success: boolean; item: T; result?: R; error?: Error }> = [];
  
  // Process items in batches to control concurrency
  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);
    
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await withRetry(
          () => operation(item),
          maxAttempts
        );
        
        return { success: true, item, result };
        
      } catch (error) {
        const result = { success: false, item, error: error as Error };
        
        if (!continueOnFailure) {
          throw error;
        }
        
        return result;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    logger.info('Batch completed', {
      batchIndex: Math.floor(i / maxConcurrent) + 1,
      batchSize: batch.length,
      successful: batchResults.filter(r => r.success).length,
      failed: batchResults.filter(r => !r.success).length
    });
  }

  const summary = {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };

  logger.info('Batch retry completed', summary);

  return results;
}

// Circuit breaker state for retry operations
export class RetryCircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold = 5,
    private timeoutMs = 30000,
    private name = 'unknown'
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime >= this.timeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker moving to HALF_OPEN', { name: this.name });
      } else {
        throw new DrainFortinError(
          'CIRCUIT_BREAKER_OPEN',
          `Circuit breaker '${this.name}' is OPEN`,
          503,
          { 
            name: this.name,
            failures: this.failures,
            timeoutMs: this.timeoutMs
          }
        );
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
    logger.debug('Circuit breaker reset to CLOSED', { name: this.name });
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn('Circuit breaker OPEN', { 
        name: this.name,
        failures: this.failures,
        threshold: this.failureThreshold
      });
    }
  }

  getState(): { state: string; failures: number } {
    return {
      state: this.state,
      failures: this.failures
    };
  }
}

// Utility function for sleep/delay
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}