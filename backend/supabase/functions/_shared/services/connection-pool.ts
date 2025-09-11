// Enterprise-grade database connection pooling for Supabase Edge Functions
// Optimized for high-performance, production-grade applications

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { logger } from '../utils/logging.ts';

interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeoutMs: number;
  acquireTimeoutMs: number;
  healthCheckIntervalMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

interface PoolConnection {
  client: SupabaseClient;
  id: string;
  createdAt: number;
  lastUsed: number;
  inUse: boolean;
  healthStatus: 'healthy' | 'unhealthy' | 'checking';
  queryCount: number;
  errorCount: number;
}

interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  totalQueries: number;
  totalErrors: number;
  averageQueryTime: number;
  poolUtilization: number;
}

export class SupabaseConnectionPool {
  private connections: Map<string, PoolConnection> = new Map();
  private config: ConnectionPoolConfig;
  private supabaseUrl: string;
  private supabaseKey: string;
  private healthCheckTimer?: number;
  private stats: PoolStats;
  private queryTimes: number[] = [];
  private maxQueryTimeHistory = 100;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config?: Partial<ConnectionPoolConfig>
  ) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.config = {
      maxConnections: parseInt(Deno.env.get('DB_MAX_CONNECTIONS') || '20'),
      minConnections: parseInt(Deno.env.get('DB_MIN_CONNECTIONS') || '5'),
      idleTimeoutMs: parseInt(Deno.env.get('DB_IDLE_TIMEOUT_MS') || '300000'), // 5 minutes
      acquireTimeoutMs: parseInt(Deno.env.get('DB_ACQUIRE_TIMEOUT_MS') || '30000'), // 30 seconds
      healthCheckIntervalMs: parseInt(Deno.env.get('DB_HEALTH_CHECK_INTERVAL_MS') || '60000'), // 1 minute
      retryAttempts: parseInt(Deno.env.get('DB_RETRY_ATTEMPTS') || '3'),
      retryDelayMs: parseInt(Deno.env.get('DB_RETRY_DELAY_MS') || '1000'),
      ...config
    };

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      totalQueries: 0,
      totalErrors: 0,
      averageQueryTime: 0,
      poolUtilization: 0
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    logger.info('Initializing Supabase connection pool', {
      config: this.config,
      environment: Deno.env.get('ENVIRONMENT')
    });

    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      await this.createConnection();
    }

    // Start health check timer
    this.startHealthChecks();

    logger.info('Connection pool initialized', {
      initialConnections: this.connections.size,
      minConnections: this.config.minConnections
    });
  }

  private async createConnection(): Promise<PoolConnection> {
    const id = crypto.randomUUID();
    const client = createClient(this.supabaseUrl, this.supabaseKey, {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          'X-Connection-Pool-ID': id,
          'X-Client-Version': 'edge-function-pool-v1.0'
        }
      }
    });

    const connection: PoolConnection = {
      client,
      id,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      inUse: false,
      healthStatus: 'healthy',
      queryCount: 0,
      errorCount: 0
    };

    // Test connection
    try {
      await this.testConnection(connection);
      this.connections.set(id, connection);
      this.updateStats();
      
      logger.debug('Connection created successfully', { connectionId: id });
      return connection;
    } catch (error) {
      logger.error('Failed to create connection', error as Error, { connectionId: id });
      throw error;
    }
  }

  private async testConnection(connection: PoolConnection): Promise<boolean> {
    try {
      const { data, error } = await connection.client
        .from('health_check')
        .select('1')
        .limit(1);
      
      if (error && !error.message.includes('relation "health_check" does not exist')) {
        throw error;
      }
      
      return true;
    } catch (error) {
      logger.warn('Connection health check failed', { 
        connectionId: connection.id, 
        error: (error as Error).message 
      });
      return false;
    }
  }

  async acquireConnection(): Promise<PoolConnection> {
    const startTime = performance.now();
    const timeoutMs = this.config.acquireTimeoutMs;
    
    while (performance.now() - startTime < timeoutMs) {
      // Try to find an idle connection
      const idleConnection = this.findIdleConnection();
      if (idleConnection) {
        idleConnection.inUse = true;
        idleConnection.lastUsed = Date.now();
        this.updateStats();
        
        logger.debug('Connection acquired from pool', { 
          connectionId: idleConnection.id,
          acquireTime: `${(performance.now() - startTime).toFixed(2)}ms`
        });
        
        return idleConnection;
      }

      // Try to create a new connection if under limit
      if (this.connections.size < this.config.maxConnections) {
        try {
          const newConnection = await this.createConnection();
          newConnection.inUse = true;
          this.updateStats();
          
          logger.debug('New connection created and acquired', { 
            connectionId: newConnection.id,
            totalConnections: this.connections.size 
          });
          
          return newConnection;
        } catch (error) {
          logger.error('Failed to create new connection', error as Error);
        }
      }

      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Timeout exceeded
    const error = new Error(`Connection acquisition timeout after ${timeoutMs}ms`);
    logger.error('Connection pool timeout', error, {
      totalConnections: this.connections.size,
      activeConnections: this.getActiveConnections().length,
      timeoutMs
    });
    throw error;
  }

  releaseConnection(connection: PoolConnection): void {
    if (this.connections.has(connection.id)) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
      this.updateStats();
      
      logger.debug('Connection released to pool', { 
        connectionId: connection.id,
        queryCount: connection.queryCount 
      });
    }
  }

  async executeQuery<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
    options?: { retries?: number; timeout?: number }
  ): Promise<T> {
    const { retries = this.config.retryAttempts, timeout = 30000 } = options || {};
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      let connection: PoolConnection | null = null;
      
      try {
        // Acquire connection
        connection = await this.acquireConnection();
        
        // Execute query with timeout
        const queryPromise = queryFn(connection.client);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), timeout);
        });
        
        const startTime = performance.now();
        const result = await Promise.race([queryPromise, timeoutPromise]);
        const duration = performance.now() - startTime;
        
        // Update statistics
        connection.queryCount++;
        this.stats.totalQueries++;
        this.updateQueryTime(duration);
        
        logger.debug('Query executed successfully', {
          connectionId: connection.id,
          duration: `${duration.toFixed(2)}ms`,
          attempt: attempt + 1
        });
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        if (connection) {
          connection.errorCount++;
          this.stats.totalErrors++;
          
          // Mark connection as unhealthy if error suggests connection issues
          if (this.isConnectionError(error as Error)) {
            connection.healthStatus = 'unhealthy';
            logger.warn('Connection marked as unhealthy', {
              connectionId: connection.id,
              error: lastError.message
            });
          }
        }
        
        logger.warn('Query execution failed', {
          attempt: attempt + 1,
          maxRetries: retries,
          error: lastError.message,
          connectionId: connection?.id
        });
        
        // Don't retry on certain types of errors
        if (this.isNonRetryableError(lastError)) {
          break;
        }
        
        // Wait before retry
        if (attempt < retries) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelayMs * Math.pow(2, attempt))
          );
        }
        
      } finally {
        if (connection) {
          this.releaseConnection(connection);
        }
      }
    }
    
    throw lastError || new Error('Query execution failed');
  }

  private findIdleConnection(): PoolConnection | null {
    for (const connection of this.connections.values()) {
      if (!connection.inUse && connection.healthStatus === 'healthy') {
        return connection;
      }
    }
    return null;
  }

  private getActiveConnections(): PoolConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.inUse);
  }

  private isConnectionError(error: Error): boolean {
    const connectionErrorMessages = [
      'connection closed',
      'connection terminated',
      'network error',
      'timeout',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT'
    ];
    
    return connectionErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }

  private isNonRetryableError(error: Error): boolean {
    const nonRetryableMessages = [
      'syntax error',
      'permission denied',
      'relation does not exist',
      'column does not exist',
      'duplicate key value',
      'check constraint'
    ];
    
    return nonRetryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
      await this.cleanupIdleConnections();
    }, this.config.healthCheckIntervalMs);
  }

  private async performHealthChecks(): Promise<void> {
    const connections = Array.from(this.connections.values());
    const healthCheckPromises = connections.map(async (connection) => {
      if (connection.inUse || connection.healthStatus === 'checking') {
        return;
      }
      
      connection.healthStatus = 'checking';
      
      try {
        const isHealthy = await this.testConnection(connection);
        connection.healthStatus = isHealthy ? 'healthy' : 'unhealthy';
        
        if (!isHealthy) {
          logger.warn('Unhealthy connection detected', { 
            connectionId: connection.id,
            age: Date.now() - connection.createdAt
          });
        }
      } catch (error) {
        connection.healthStatus = 'unhealthy';
        logger.error('Health check failed', error as Error, { 
          connectionId: connection.id 
        });
      }
    });
    
    await Promise.allSettled(healthCheckPromises);
  }

  private async cleanupIdleConnections(): Promise<void> {
    const now = Date.now();
    const connectionsToRemove: string[] = [];
    
    for (const [id, connection] of this.connections) {
      const isIdle = !connection.inUse;
      const isExpired = now - connection.lastUsed > this.config.idleTimeoutMs;
      const isUnhealthy = connection.healthStatus === 'unhealthy';
      const isAboveMinimum = this.connections.size > this.config.minConnections;
      
      if (isIdle && (isExpired || isUnhealthy) && isAboveMinimum) {
        connectionsToRemove.push(id);
      }
    }
    
    for (const id of connectionsToRemove) {
      this.connections.delete(id);
      logger.debug('Connection removed from pool', { 
        connectionId: id,
        reason: 'cleanup',
        remainingConnections: this.connections.size
      });
    }
    
    this.updateStats();
  }

  private updateStats(): void {
    const connections = Array.from(this.connections.values());
    this.stats.totalConnections = connections.length;
    this.stats.activeConnections = connections.filter(c => c.inUse).length;
    this.stats.idleConnections = connections.filter(c => !c.inUse).length;
    this.stats.poolUtilization = this.stats.totalConnections > 0 
      ? (this.stats.activeConnections / this.stats.totalConnections) * 100 
      : 0;
  }

  private updateQueryTime(duration: number): void {
    this.queryTimes.push(duration);
    
    if (this.queryTimes.length > this.maxQueryTimeHistory) {
      this.queryTimes.shift();
    }
    
    this.stats.averageQueryTime = this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
  }

  getStats(): PoolStats & { connectionDetails: any[] } {
    const connectionDetails = Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      inUse: conn.inUse,
      healthStatus: conn.healthStatus,
      queryCount: conn.queryCount,
      errorCount: conn.errorCount,
      age: Date.now() - conn.createdAt,
      idleTime: Date.now() - conn.lastUsed
    }));
    
    return {
      ...this.stats,
      connectionDetails
    };
  }

  async close(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.connections.clear();
    
    logger.info('Connection pool closed', {
      finalStats: this.stats
    });
  }
}

// Singleton instance for edge functions
let globalPool: SupabaseConnectionPool | null = null;

export function getConnectionPool(): SupabaseConnectionPool {
  if (!globalPool) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PUBLIC_SUPABASE_URL');
    const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase configuration for connection pool');
    }
    
    globalPool = new SupabaseConnectionPool(supabaseUrl, supabaseKey);
  }
  
  return globalPool;
}

// Helper function for executing queries with the pool
export async function executePooledQuery<T>(
  queryFn: (client: SupabaseClient) => Promise<T>,
  options?: { retries?: number; timeout?: number }
): Promise<T> {
  const pool = getConnectionPool();
  return pool.executeQuery(queryFn, options);
}

// Cleanup function for graceful shutdown
export async function closeConnectionPool(): Promise<void> {
  if (globalPool) {
    await globalPool.close();
    globalPool = null;
  }
}