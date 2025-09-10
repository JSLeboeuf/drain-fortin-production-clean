/**
 * RetryMechanism.ts - Mécanisme de retry sophistiqué avec backoff exponentiel
 * Gère les tentatives automatiques avec jitter, circuit breaker et métriques
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { EventEmitter } from 'events';
import { AuditLogger } from '../security/AuditLogger';
import { OutlookErrorHandler } from './OutlookErrorHandler';
import {
  RetryConfig,
  RetryAttempt,
  RetryResult,
  RetryStatistics,
  CircuitBreakerState,
  RetryableError,
  BackoffStrategy
} from '../config/outlook.types';

/**
 * Configuration par défaut pour le mécanisme de retry
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBase: 2,
  jitter: true,
  jitterRange: 0.1,
  timeoutMs: 60000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'],
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    monitoringPeriodMs: 300000
  },
  backoffStrategy: 'exponential'
};

/**
 * Classe principale du mécanisme de retry
 * Implémente un système de retry robuste avec circuit breaker
 */
export class RetryMechanism extends EventEmitter {
  private readonly config: RetryConfig;
  private readonly auditLogger?: AuditLogger;
  private readonly errorHandler: OutlookErrorHandler;
  
  private circuitState: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private statistics: RetryStatistics = {
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    averageRetryCount: 0,
    circuitBreakerTrips: 0,
    totalDelayTime: 0
  };

  constructor(
    config: Partial<RetryConfig> = {},
    dependencies: {
      auditLogger?: AuditLogger;
      errorHandler: OutlookErrorHandler;
    }
  ) {
    super();
    
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.auditLogger = dependencies.auditLogger;
    this.errorHandler = dependencies.errorHandler;
    
    // Démarrer le monitoring du circuit breaker
    if (this.config.circuitBreaker.enabled) {
      this.startCircuitBreakerMonitoring();
    }
    
    this.auditLogger?.log('info', 'RetryMechanism initialized', {
      component: 'RetryMechanism',
      config: this.config
    });
  }

  /**
   * Execute une fonction avec mécanisme de retry
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const effectiveConfig = { ...this.config, ...customConfig };
    const startTime = Date.now();
    const attempts: RetryAttempt[] = [];
    
    // Vérifier le circuit breaker
    if (this.circuitState === 'open') {
      const error = new Error(`Circuit breaker is OPEN for operation: ${operationName}`);
      await this.auditLogger?.log('warn', 'Circuit breaker blocked operation', {
        component: 'RetryMechanism',
        operation: operationName,
        circuitState: this.circuitState
      });
      
      return {
        success: false,
        result: undefined,
        error,
        attempts,
        totalDuration: Date.now() - startTime,
        circuitBreakerTripped: true
      };
    }

    for (let attemptNumber = 0; attemptNumber <= effectiveConfig.maxRetries; attemptNumber++) {
      const attemptStart = Date.now();
      
      try {
        this.statistics.totalAttempts++;
        
        // Exécuter l'opération
        const result = await this.executeWithTimeout(operation, effectiveConfig.timeoutMs);
        
        // Succès
        const attemptDuration = Date.now() - attemptStart;
        attempts.push({
          number: attemptNumber + 1,
          startTime: attemptStart,
          duration: attemptDuration,
          success: true
        });

        this.onSuccess(operationName);
        this.statistics.successfulAttempts++;
        
        await this.auditLogger?.log('info', 'Operation succeeded', {
          component: 'RetryMechanism',
          operation: operationName,
          attemptNumber: attemptNumber + 1,
          duration: attemptDuration,
          totalDuration: Date.now() - startTime
        });

        return {
          success: true,
          result,
          error: undefined,
          attempts,
          totalDuration: Date.now() - startTime,
          circuitBreakerTripped: false
        };

      } catch (error) {
        const attemptDuration = Date.now() - attemptStart;
        const isRetryable = this.isErrorRetryable(error as Error, effectiveConfig);
        const isLastAttempt = attemptNumber === effectiveConfig.maxRetries;
        
        attempts.push({
          number: attemptNumber + 1,
          startTime: attemptStart,
          duration: attemptDuration,
          success: false,
          error: error as Error,
          retryable: isRetryable
        });

        await this.auditLogger?.log('warn', 'Operation attempt failed', {
          component: 'RetryMechanism',
          operation: operationName,
          attemptNumber: attemptNumber + 1,
          error: (error as Error).message,
          retryable: isRetryable,
          isLastAttempt
        });

        // Si l'erreur n'est pas retryable ou si c'est la dernière tentative
        if (!isRetryable || isLastAttempt) {
          this.onFailure(operationName, error as Error);
          this.statistics.failedAttempts++;
          
          return {
            success: false,
            result: undefined,
            error: error as Error,
            attempts,
            totalDuration: Date.now() - startTime,
            circuitBreakerTripped: false
          };
        }

        // Calculer le délai avant la prochaine tentative
        const delay = this.calculateDelay(attemptNumber, effectiveConfig);
        this.statistics.totalDelayTime += delay;
        
        await this.auditLogger?.log('info', 'Waiting before retry', {
          component: 'RetryMechanism',
          operation: operationName,
          delay,
          nextAttempt: attemptNumber + 2
        });

        // Attendre avant la prochaine tentative
        await this.delay(delay);
      }
    }

    // Code jamais atteint, mais TypeScript l'exige
    throw new Error('Unreachable code in RetryMechanism.execute');
  }

  /**
   * Exécute une opération avec timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Détermine si une erreur est retryable
   */
  private isErrorRetryable(error: Error, config: RetryConfig): boolean {
    // Vérifier les codes d'erreur retryable
    const errorMessage = error.message.toLowerCase();
    const isRetryableError = config.retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase())
    );

    // Vérifier les codes de statut HTTP retryable
    if ((error as any).status) {
      const status = (error as any).status;
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(status);
    }

    // Vérifier si c'est une erreur de type RetryableError
    if ((error as RetryableError).retryable !== undefined) {
      return (error as RetryableError).retryable;
    }

    return isRetryableError;
  }

  /**
   * Calcule le délai avant la prochaine tentative
   */
  private calculateDelay(attemptNumber: number, config: RetryConfig): number {
    let delay: number;

    switch (config.backoffStrategy) {
      case 'linear':
        delay = config.baseDelay * (attemptNumber + 1);
        break;
      
      case 'exponential':
        delay = config.baseDelay * Math.pow(config.exponentialBase, attemptNumber);
        break;
      
      case 'fixed':
        delay = config.baseDelay;
        break;
      
      default:
        delay = config.baseDelay * Math.pow(config.exponentialBase, attemptNumber);
    }

    // Appliquer la limite maximale
    delay = Math.min(delay, config.maxDelay);

    // Appliquer le jitter si activé
    if (config.jitter) {
      const jitterAmount = delay * config.jitterRange;
      const jitterOffset = (Math.random() - 0.5) * 2 * jitterAmount;
      delay = Math.max(0, delay + jitterOffset);
    }

    return Math.floor(delay);
  }

  /**
   * Fonction utilitaire pour attendre
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gère le succès d'une opération
   */
  private onSuccess(operationName: string): void {
    this.successCount++;
    
    // Réinitialiser le circuit breaker en cas de demi-ouverture
    if (this.circuitState === 'half-open') {
      this.circuitState = 'closed';
      this.failureCount = 0;
      
      this.emit('circuitBreakerClosed', { operationName });
      
      this.auditLogger?.log('info', 'Circuit breaker closed after successful operation', {
        component: 'RetryMechanism',
        operation: operationName,
        circuitState: this.circuitState
      });
    }
  }

  /**
   * Gère l'échec d'une opération
   */
  private onFailure(operationName: string, error: Error): void {
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    // Déclencher le circuit breaker si le seuil est atteint
    if (this.failureCount >= this.config.circuitBreaker.failureThreshold && 
        this.circuitState === 'closed') {
      this.circuitState = 'open';
      this.statistics.circuitBreakerTrips++;
      
      this.emit('circuitBreakerOpened', { operationName, error });
      
      this.auditLogger?.log('error', 'Circuit breaker opened due to repeated failures', {
        component: 'RetryMechanism',
        operation: operationName,
        failureCount: this.failureCount,
        threshold: this.config.circuitBreaker.failureThreshold,
        error: error.message
      });
    }
  }

  /**
   * Démarre le monitoring du circuit breaker
   */
  private startCircuitBreakerMonitoring(): void {
    setInterval(() => {
      if (this.circuitState === 'open') {
        const timeSinceLastFailure = Date.now() - this.lastFailureTime;
        
        if (timeSinceLastFailure >= this.config.circuitBreaker.resetTimeoutMs) {
          this.circuitState = 'half-open';
          
          this.emit('circuitBreakerHalfOpen');
          
          this.auditLogger?.log('info', 'Circuit breaker moved to half-open state', {
            component: 'RetryMechanism',
            circuitState: this.circuitState,
            timeSinceLastFailure
          });
        }
      }
    }, this.config.circuitBreaker.monitoringPeriodMs / 10); // Vérifier 10 fois par période
  }

  /**
   * Obtient les statistiques du mécanisme de retry
   */
  getStatistics(): RetryStatistics {
    const totalAttempts = this.statistics.totalAttempts;
    const successfulAttempts = this.statistics.successfulAttempts;
    const failedOperations = totalAttempts - successfulAttempts;
    
    return {
      ...this.statistics,
      averageRetryCount: failedOperations > 0 ? 
        (totalAttempts - successfulAttempts) / failedOperations : 0,
      successRate: totalAttempts > 0 ? successfulAttempts / totalAttempts : 0,
      averageDelayTime: failedOperations > 0 ? 
        this.statistics.totalDelayTime / failedOperations : 0,
      circuitBreakerState: this.circuitState
    };
  }

  /**
   * Réinitialise les statistiques
   */
  resetStatistics(): void {
    this.statistics = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      averageRetryCount: 0,
      circuitBreakerTrips: 0,
      totalDelayTime: 0
    };
    
    this.auditLogger?.log('info', 'Retry statistics reset', {
      component: 'RetryMechanism'
    });
  }

  /**
   * Force la fermeture du circuit breaker
   */
  forceCloseCircuitBreaker(): void {
    this.circuitState = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    
    this.emit('circuitBreakerForceClosed');
    
    this.auditLogger?.log('info', 'Circuit breaker force closed', {
      component: 'RetryMechanism',
      circuitState: this.circuitState
    });
  }

  /**
   * Obtient l'état actuel du circuit breaker
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitState;
  }

  /**
   * Teste si le circuit breaker est ouvert
   */
  isCircuitBreakerOpen(): boolean {
    return this.circuitState === 'open';
  }

  /**
   * Crée un wrapper de fonction avec retry automatique
   */
  wrap<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const result = await this.execute(
        () => fn(...args),
        operationName,
        customConfig
      );
      
      if (result.success) {
        return result.result as R;
      } else {
        throw result.error;
      }
    };
  }

  /**
   * Nettoie les ressources
   */
  async dispose(): Promise<void> {
    this.removeAllListeners();
    
    this.auditLogger?.log('info', 'RetryMechanism disposed', {
      component: 'RetryMechanism',
      finalStatistics: this.getStatistics()
    });
  }
}

/**
 * Factory pour créer des instances de RetryMechanism
 */
export class RetryMechanismFactory {
  /**
   * Crée une instance avec configuration par défaut
   */
  static createDefault(errorHandler: OutlookErrorHandler): RetryMechanism {
    return new RetryMechanism({}, { errorHandler });
  }

  /**
   * Crée une instance pour les opérations API
   */
  static createForAPI(errorHandler: OutlookErrorHandler): RetryMechanism {
    return new RetryMechanism({
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 60000,
      exponentialBase: 1.5,
      jitter: true,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'],
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 30000,
        monitoringPeriodMs: 60000
      }
    }, { errorHandler });
  }

  /**
   * Crée une instance pour les opérations de base de données
   */
  static createForDatabase(errorHandler: OutlookErrorHandler): RetryMechanism {
    return new RetryMechanism({
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 10000,
      exponentialBase: 2,
      backoffStrategy: 'exponential',
      retryableErrors: ['ECONNRESET', 'ECONNREFUSED', 'CONNECTION_LOST'],
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        monitoringPeriodMs: 300000
      }
    }, { errorHandler });
  }
}

export default RetryMechanism;