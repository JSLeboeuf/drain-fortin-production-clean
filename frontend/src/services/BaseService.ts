/**
 * BASE SERVICE LAYER - SYSTEM ARCHITECT V2
 * Hexagonal Architecture Implementation with Repository Pattern
 * Provides abstraction layer between UI and data access
 */

import { logger } from '@/lib/logger';
import { OptimizedSupabaseClient } from '@/lib/supabaseOptimized';

/**
 * BASE REPOSITORY INTERFACE
 * Defines contract for all data repositories
 */
export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<PaginatedResult<T>>;
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  update(id: ID, updates: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
  count(filters?: Record<string, any>): Promise<number>;
}

/**
 * QUERY OPTIONS FOR FLEXIBLE QUERYING
 */
export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  includes?: string[];
}

/**
 * PAGINATED RESULT STRUCTURE
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * SERVICE RESULT WITH ERROR HANDLING
 */
export interface ServiceResult<T> {
  data: T | null;
  success: boolean;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * DOMAIN EVENT SYSTEM
 * Enables loose coupling through events
 */
export interface DomainEvent {
  type: string;
  entityId: string;
  entityType: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

class EventBus {
  private listeners = new Map<string, Array<(event: DomainEvent) => void>>();

  subscribe(eventType: string, handler: (event: DomainEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  publish(event: DomainEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          logger.error(`Event handler failed for ${event.type}`, error);
        }
      });
    }
  }

  publishAsync(event: DomainEvent): Promise<void> {
    const handlers = this.listeners.get(event.type);
    if (!handlers) return Promise.resolve();

    const promises = handlers.map(handler => 
      Promise.resolve().then(() => handler(event)).catch(error => 
        logger.error(`Async event handler failed for ${event.type}`, error)
      )
    );

    return Promise.all(promises).then(() => undefined);
  }
}

// Global event bus instance
export const eventBus = new EventBus();

/**
 * BASE SERVICE ABSTRACT CLASS
 * Implements common service patterns and error handling
 */
export abstract class BaseService {
  protected readonly eventBus = eventBus;

  /**
   * Wraps service operations with consistent error handling
   */
  protected async executeOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    entityType?: string
  ): Promise<ServiceResult<T>> {
    const startTime = Date.now();
    
    try {
      logger.debug(`Starting operation: ${operationName}`);
      
      const result = await operation();
      const duration = Date.now() - startTime;
      
      logger.debug(`Operation completed: ${operationName} (${duration}ms)`);
      
      // Log slow operations
      if (duration > 1000) {
        logger.warn(`Slow operation detected: ${operationName} (${duration}ms)`);
      }

      return {
        data: result,
        success: true,
        metadata: {
          operationName,
          duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(`Operation failed: ${operationName} (${duration}ms)`, {
        error: errorMessage,
        entityType,
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        data: null,
        success: false,
        error: errorMessage,
        message: `Failed to ${operationName.toLowerCase()}`,
        metadata: {
          operationName,
          duration,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Publishes domain events for service operations
   */
  protected async publishEvent(
    type: string,
    entityId: string,
    entityType: string,
    data: any,
    userId?: string
  ): Promise<void> {
    const event: DomainEvent = {
      type,
      entityId,
      entityType,
      data,
      timestamp: new Date(),
      userId
    };

    await this.eventBus.publishAsync(event);
  }

  /**
   * Validates entity data before operations
   */
  protected validateEntity<T>(entity: T, rules: ValidationRule<T>[]): ValidationResult {
    const errors: string[] = [];

    for (const rule of rules) {
      const result = rule.validate(entity);
      if (!result.valid) {
        errors.push(result.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Transforms paginated results with metadata
   */
  protected transformPaginatedResult<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }

  /**
   * Generic cache invalidation helper
   */
  protected invalidateCache(pattern: string): void {
    OptimizedSupabaseClient.invalidateCache(pattern);
  }
}

/**
 * VALIDATION SYSTEM
 */
export interface ValidationRule<T> {
  validate(entity: T): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
}

export class RequiredFieldRule<T> implements ValidationRule<T> {
  constructor(
    private fieldName: keyof T,
    private displayName?: string
  ) {}

  validate(entity: T): ValidationResult {
    const value = entity[this.fieldName];
    const isEmpty = value === null || value === undefined || value === '';
    
    return {
      valid: !isEmpty,
      message: isEmpty ? `${this.displayName || String(this.fieldName)} is required` : undefined
    };
  }
}

export class EmailRule<T> implements ValidationRule<T> {
  constructor(private fieldName: keyof T) {}

  validate(entity: T): ValidationResult {
    const value = entity[this.fieldName] as unknown as string;
    if (!value) return { valid: true }; // Optional field
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(value);
    
    return {
      valid: isValid,
      message: isValid ? undefined : 'Invalid email format'
    };
  }
}

export class PhoneRule<T> implements ValidationRule<T> {
  constructor(private fieldName: keyof T) {}

  validate(entity: T): ValidationResult {
    const value = entity[this.fieldName] as unknown as string;
    if (!value) return { valid: true }; // Optional field
    
    // Quebec phone number format validation
    const phoneRegex = /^(\+1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})$/;
    const isValid = phoneRegex.test(value);
    
    return {
      valid: isValid,
      message: isValid ? undefined : 'Invalid phone number format'
    };
  }
}

/**
 * BASE REPOSITORY IMPLEMENTATION
 * Provides common repository patterns
 */
export abstract class BaseRepository<T, ID = string> implements IRepository<T, ID> {
  constructor(
    protected tableName: string,
    protected selectFields: string = '*'
  ) {}

  abstract findById(id: ID): Promise<T | null>;
  abstract findAll(options?: QueryOptions): Promise<PaginatedResult<T>>;
  abstract create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  abstract update(id: ID, updates: Partial<T>): Promise<T>;
  abstract delete(id: ID): Promise<boolean>;
  abstract count(filters?: Record<string, any>): Promise<number>;

  /**
   * Helper to build query filters
   */
  protected buildFilters(query: any, filters?: Record<string, any>) {
    if (!filters) return query;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'string' && value.includes('%')) {
          query = query.like(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    return query;
  }

  /**
   * Helper to apply sorting
   */
  protected applySorting(query: any, sortBy?: string, sortOrder?: 'asc' | 'desc') {
    if (sortBy) {
      query = query.order(sortBy, { ascending: sortOrder !== 'desc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    return query;
  }

  /**
   * Helper to apply pagination
   */
  protected applyPagination(query: any, page = 1, pageSize = 25) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    return query.range(start, end);
  }
}

/**
 * SERVICE REGISTRY
 * Manages service instances and dependencies
 */
class ServiceRegistry {
  private services = new Map<string, any>();

  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }
    return service;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }
}

// Global service registry
export const serviceRegistry = new ServiceRegistry();

/**
 * DEPENDENCY INJECTION DECORATOR
 * Simplifies service dependency management
 */
export function Injectable(name?: string) {
  return function <T extends new (...args: any[]) => {}>(constructor: T) {
    const serviceName = name || constructor.name;
    const instance = new constructor();
    serviceRegistry.register(serviceName, instance);
    return constructor;
  };
}

export function Inject(serviceName: string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: () => serviceRegistry.get(serviceName),
      enumerable: true,
      configurable: true
    });
  };
}

// Export performance monitoring from optimized client
export const { getCacheStats, clearCache } = OptimizedSupabaseClient;