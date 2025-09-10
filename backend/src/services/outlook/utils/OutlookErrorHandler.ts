/**
 * OutlookErrorHandler.ts - Gestionnaire d'erreurs centralisé
 * Traitement unifié des erreurs, mapping, retry logic, et reporting
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { OutlookError, OutlookConfig } from '../config/outlook.types';
import { OUTLOOK_CONSTANTS } from '../config/outlook.constants';

/**
 * Interface pour le contexte d'erreur enrichi
 */
export interface ErrorContext {
  operation: string;
  module: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  retryAttempt?: number;
  additionalData?: Record<string, any>;
}

/**
 * Interface pour les stratégies de gestion d'erreur
 */
export interface ErrorHandlingStrategy {
  shouldRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
  escalate: boolean;
  notify: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  userMessage?: string;
  technicalMessage?: string;
}

/**
 * Gestionnaire centralisé des erreurs pour l'intégration Outlook
 * Fournit un traitement unifié, intelligent et configurable des erreurs
 */
export class OutlookErrorHandler {
  private readonly config: OutlookConfig;
  private errorStrategies: Map<string, ErrorHandlingStrategy> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private lastErrorTimes: Map<string, Date> = new Map();
  
  private readonly defaultStrategy: ErrorHandlingStrategy = {
    shouldRetry: false,
    escalate: true,
    notify: true,
    logLevel: 'error',
    userMessage: 'An unexpected error occurred. Please try again later.',
    technicalMessage: 'System error - check logs for details'
  };
  
  constructor(config: OutlookConfig) {
    this.config = config;
    this.initializeErrorStrategies();
  }
  
  /**
   * Point d'entrée principal pour gérer les erreurs
   * @param error Erreur à traiter
   * @param context Contexte de l'erreur
   */
  public handleError(
    error: Error | OutlookError | any, 
    operation: string,
    additionalContext?: Record<string, any>
  ): OutlookError {
    const context: ErrorContext = {
      operation,
      module: this.extractModuleFromOperation(operation),
      timestamp: new Date(),
      correlationId: this.generateCorrelationId(),
      additionalData: additionalContext
    };
    
    // Conversion vers OutlookError si nécessaire
    const outlookError = this.normalizeError(error, context);
    
    // Application de la stratégie de gestion
    const strategy = this.getErrorStrategy(outlookError.code, context);
    
    // Enrichissement de l'erreur
    this.enrichError(outlookError, context, strategy);
    
    // Mise à jour des métriques
    this.updateErrorMetrics(outlookError.code, context);
    
    // Application des actions de la stratégie
    this.applyErrorStrategy(outlookError, context, strategy);
    
    return outlookError;
  }
  
  /**
   * Vérifie si une erreur est récupérable
   * @param error Erreur à vérifier
   */
  public isRecoverable(error: OutlookError | string): boolean {
    const errorCode = typeof error === 'string' ? error : error.code;
    const strategy = this.errorStrategies.get(errorCode);
    
    return strategy?.shouldRetry ?? false;
  }
  
  /**
   * Obtient le délai de retry pour une erreur
   * @param error Erreur
   * @param attemptNumber Numéro de tentative
   */
  public getRetryDelay(error: OutlookError | string, attemptNumber: number = 1): number {
    const errorCode = typeof error === 'string' ? error : error.code;
    const strategy = this.errorStrategies.get(errorCode);
    
    if (!strategy?.shouldRetry) {
      return 0;
    }
    
    const baseDelay = strategy.retryDelay || OUTLOOK_CONSTANTS.TIMEOUTS.RETRY_BASE_DELAY;
    
    // Backoff exponentiel avec jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 1000; // 0-1000ms de jitter
    
    return Math.min(
      exponentialDelay + jitter,
      OUTLOOK_CONSTANTS.TIMEOUTS.RETRY_MAX_DELAY
    );
  }
  
  /**
   * Obtient le message utilisateur approprié pour une erreur
   * @param error Erreur
   */
  public getUserMessage(error: OutlookError | string): string {
    const errorCode = typeof error === 'string' ? error : error.code;
    const strategy = this.errorStrategies.get(errorCode);
    
    return strategy?.userMessage || this.defaultStrategy.userMessage!;
  }
  
  /**
   * Obtient les statistiques d'erreurs
   */
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: Array<{ code: string; count: number; lastOccurrence: Date }>;
    topErrors: Array<{ code: string; count: number; percentage: number }>;
  } {
    const totalErrors = Array.from(this.errorCounts.values())
      .reduce((sum, count) => sum + count, 0);
    
    const errorsByType: Record<string, number> = {};
    const recentErrors: Array<{ code: string; count: number; lastOccurrence: Date }> = [];
    
    for (const [code, count] of this.errorCounts.entries()) {
      errorsByType[code] = count;
      
      const lastTime = this.lastErrorTimes.get(code);
      if (lastTime) {
        recentErrors.push({ code, count, lastOccurrence: lastTime });
      }
    }
    
    // Tri des erreurs récentes par date
    recentErrors.sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime());
    
    // Top erreurs par fréquence
    const topErrors = Object.entries(errorsByType)
      .map(([code, count]) => ({
        code,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalErrors,
      errorsByType,
      recentErrors: recentErrors.slice(0, 20),
      topErrors
    };
  }
  
  /**
   * Reset des statistiques d'erreur
   */
  public resetErrorStatistics(): void {
    this.errorCounts.clear();
    this.lastErrorTimes.clear();
  }
  
  /**
   * Ajoute ou met à jour une stratégie d'erreur
   * @param errorCode Code d'erreur
   * @param strategy Stratégie de gestion
   */
  public setErrorStrategy(errorCode: string, strategy: ErrorHandlingStrategy): void {
    this.errorStrategies.set(errorCode, strategy);
  }
  
  /**
   * Supprime une stratégie d'erreur personnalisée
   * @param errorCode Code d'erreur
   */
  public removeErrorStrategy(errorCode: string): void {
    this.errorStrategies.delete(errorCode);
  }
  
  /**
   * Vérifie si un type d'erreur est en cours d'escalade
   * @param errorCode Code d'erreur
   */
  public isEscalating(errorCode: string): boolean {
    const count = this.errorCounts.get(errorCode) || 0;
    const threshold = 5; // Seuil d'escalade
    
    return count >= threshold;
  }
  
  /**
   * Méthodes privées
   */
  
  private initializeErrorStrategies(): void {
    // Stratégies pour les erreurs d'authentification
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.TOKEN_EXPIRED, {
      shouldRetry: true,
      retryDelay: 1000,
      maxRetries: 2,
      escalate: false,
      notify: false,
      logLevel: 'warn',
      userMessage: 'Session expired. Please log in again.',
      technicalMessage: 'Access token expired - attempting refresh'
    });
    
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.TOKEN_INVALID, {
      shouldRetry: false,
      escalate: true,
      notify: true,
      logLevel: 'error',
      userMessage: 'Authentication failed. Please log in again.',
      technicalMessage: 'Invalid or corrupted authentication token'
    });
    
    // Stratégies pour les erreurs de rate limiting
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.RATE_LIMIT_EXCEEDED, {
      shouldRetry: true,
      retryDelay: 30000, // 30 secondes
      maxRetries: 3,
      escalate: false,
      notify: false,
      logLevel: 'warn',
      userMessage: 'Service temporarily busy. Please wait a moment and try again.',
      technicalMessage: 'Microsoft Graph rate limit exceeded'
    });
    
    // Stratégies pour les erreurs réseau
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.NETWORK_ERROR, {
      shouldRetry: true,
      retryDelay: 5000,
      maxRetries: 3,
      escalate: false,
      notify: false,
      logLevel: 'warn',
      userMessage: 'Connection issue. Retrying automatically.',
      technicalMessage: 'Network connectivity problem'
    });
    
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.REQUEST_TIMEOUT, {
      shouldRetry: true,
      retryDelay: 2000,
      maxRetries: 2,
      escalate: false,
      notify: false,
      logLevel: 'warn',
      userMessage: 'Request timed out. Retrying...',
      technicalMessage: 'API request timeout'
    });
    
    // Stratégies pour les erreurs de service
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.SERVICE_UNAVAILABLE, {
      shouldRetry: true,
      retryDelay: 10000,
      maxRetries: 2,
      escalate: true,
      notify: true,
      logLevel: 'error',
      userMessage: 'Service temporarily unavailable. Please try again later.',
      technicalMessage: 'Microsoft Graph service unavailable'
    });
    
    // Stratégies pour les erreurs de validation
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.VALIDATION_ERROR, {
      shouldRetry: false,
      escalate: false,
      notify: false,
      logLevel: 'warn',
      userMessage: 'Please check your input and try again.',
      technicalMessage: 'Data validation failed'
    });
    
    // Stratégies pour les erreurs de permissions
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.PERMISSION_DENIED, {
      shouldRetry: false,
      escalate: true,
      notify: true,
      logLevel: 'error',
      userMessage: 'You do not have permission to perform this action.',
      technicalMessage: 'Insufficient permissions for operation'
    });
    
    // Stratégies pour les erreurs de ressources non trouvées
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.RESOURCE_NOT_FOUND, {
      shouldRetry: false,
      escalate: false,
      notify: false,
      logLevel: 'warn',
      userMessage: 'The requested item could not be found.',
      technicalMessage: 'Resource not found in Microsoft Graph'
    });
    
    // Stratégies pour les erreurs de configuration
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.CONFIGURATION_INVALID, {
      shouldRetry: false,
      escalate: true,
      notify: true,
      logLevel: 'error',
      userMessage: 'System configuration error. Please contact support.',
      technicalMessage: 'Invalid or missing configuration'
    });
    
    // Stratégies pour les erreurs de synchronisation
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.SYNC_FAILED, {
      shouldRetry: true,
      retryDelay: 5000,
      maxRetries: 2,
      escalate: false,
      notify: false,
      logLevel: 'warn',
      userMessage: 'Synchronization issue. Retrying...',
      technicalMessage: 'Data synchronization failed'
    });
    
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.CONFLICT_RESOLUTION_FAILED, {
      shouldRetry: false,
      escalate: true,
      notify: true,
      logLevel: 'error',
      userMessage: 'Data conflict detected. Manual resolution required.',
      technicalMessage: 'Unable to resolve data conflicts automatically'
    });
    
    // Stratégies pour les erreurs de téléphonie
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.CALL_ROUTING_FAILED, {
      shouldRetry: true,
      retryDelay: 2000,
      maxRetries: 2,
      escalate: false,
      notify: false,
      logLevel: 'warn',
      userMessage: 'Call routing issue. Please try again.',
      technicalMessage: 'Phone call routing failed'
    });
    
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.PHONE_NUMBER_INVALID, {
      shouldRetry: false,
      escalate: false,
      notify: false,
      logLevel: 'warn',
      userMessage: 'Invalid phone number format.',
      technicalMessage: 'Phone number validation failed'
    });
    
    // Stratégies pour les erreurs de cache
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.CACHE_ERROR, {
      shouldRetry: true,
      retryDelay: 1000,
      maxRetries: 1,
      escalate: false,
      notify: false,
      logLevel: 'warn',
      userMessage: null, // Erreur transparente pour l'utilisateur
      technicalMessage: 'Cache operation failed'
    });
    
    // Stratégies pour les erreurs génériques
    this.errorStrategies.set(OUTLOOK_CONSTANTS.ERROR_CODES.INTERNAL_ERROR, {
      shouldRetry: false,
      escalate: true,
      notify: true,
      logLevel: 'error',
      userMessage: 'An unexpected error occurred. Please contact support if the problem persists.',
      technicalMessage: 'Internal system error'
    });
  }
  
  private normalizeError(error: any, context: ErrorContext): OutlookError {
    // Si c'est déjà une OutlookError, on la retourne
    if (error instanceof OutlookError) {
      return error;
    }
    
    // Si c'est une Error standard, on la convertit
    if (error instanceof Error) {
      return new OutlookError(
        this.mapErrorToCode(error),
        error.message,
        {
          originalError: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          context
        },
        undefined,
        context.correlationId
      );
    }
    
    // Si c'est un objet avec propriétés d'erreur
    if (typeof error === 'object' && error !== null) {
      const code = error.code || error.errorCode || 'UNKNOWN_ERROR';
      const message = error.message || error.errorMessage || 'Unknown error occurred';
      
      return new OutlookError(
        code,
        message,
        { originalError: error, context },
        error.statusCode || error.status,
        context.correlationId
      );
    }
    
    // Fallback pour les erreurs primitives
    return new OutlookError(
      'UNKNOWN_ERROR',
      typeof error === 'string' ? error : 'An unknown error occurred',
      { originalError: error, context },
      undefined,
      context.correlationId
    );
  }
  
  private mapErrorToCode(error: Error): string {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    // Mapping basé sur le nom de l'erreur
    if (name === 'syntaxerror') return OUTLOOK_CONSTANTS.ERROR_CODES.VALIDATION_ERROR;
    if (name === 'typeerror') return OUTLOOK_CONSTANTS.ERROR_CODES.VALIDATION_ERROR;
    if (name === 'rangeerror') return OUTLOOK_CONSTANTS.ERROR_CODES.VALIDATION_ERROR;
    if (name === 'referenceerror') return OUTLOOK_CONSTANTS.ERROR_CODES.INTERNAL_ERROR;
    
    // Mapping basé sur le message d'erreur
    if (message.includes('timeout')) return OUTLOOK_CONSTANTS.ERROR_CODES.REQUEST_TIMEOUT;
    if (message.includes('network') || message.includes('connection')) {
      return OUTLOOK_CONSTANTS.ERROR_CODES.NETWORK_ERROR;
    }
    if (message.includes('auth') || message.includes('token')) {
      return OUTLOOK_CONSTANTS.ERROR_CODES.TOKEN_INVALID;
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return OUTLOOK_CONSTANTS.ERROR_CODES.PERMISSION_DENIED;
    }
    if (message.includes('not found') || message.includes('404')) {
      return OUTLOOK_CONSTANTS.ERROR_CODES.RESOURCE_NOT_FOUND;
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return OUTLOOK_CONSTANTS.ERROR_CODES.RATE_LIMIT_EXCEEDED;
    }
    if (message.includes('service unavailable') || message.includes('503')) {
      return OUTLOOK_CONSTANTS.ERROR_CODES.SERVICE_UNAVAILABLE;
    }
    
    // Code par défaut
    return OUTLOOK_CONSTANTS.ERROR_CODES.INTERNAL_ERROR;
  }
  
  private getErrorStrategy(errorCode: string, context: ErrorContext): ErrorHandlingStrategy {
    // Vérifier d'abord les stratégies spécifiques
    const specific = this.errorStrategies.get(errorCode);
    if (specific) {
      return specific;
    }
    
    // Vérifier les stratégies par catégorie (préfixe du code)
    const category = errorCode.substring(0, 4); // Prendre les 4 premiers caractères
    const categoryStrategy = this.errorStrategies.get(category + '*');
    if (categoryStrategy) {
      return categoryStrategy;
    }
    
    // Stratégie par défaut
    return this.defaultStrategy;
  }
  
  private enrichError(
    error: OutlookError, 
    context: ErrorContext, 
    strategy: ErrorHandlingStrategy
  ): void {
    // Enrichissement du contexte de l'erreur
    if (!error.context) {
      error.context = {};
    }
    
    error.context = {
      ...error.context,
      operation: context.operation,
      module: context.module,
      timestamp: context.timestamp,
      correlationId: context.correlationId,
      strategy: {
        shouldRetry: strategy.shouldRetry,
        escalate: strategy.escalate,
        logLevel: strategy.logLevel
      },
      ...context.additionalData
    };
  }
  
  private updateErrorMetrics(errorCode: string, context: ErrorContext): void {
    // Mise à jour du compteur
    const currentCount = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, currentCount + 1);
    
    // Mise à jour du timestamp
    this.lastErrorTimes.set(errorCode, context.timestamp);
  }
  
  private applyErrorStrategy(
    error: OutlookError,
    context: ErrorContext,
    strategy: ErrorHandlingStrategy
  ): void {
    // Note: Dans une implémentation complète, cette méthode pourrait :
    // - Envoyer des notifications
    // - Déclencher des alertes
    // - Logger selon le niveau approprié
    // - Escalader vers des systèmes de monitoring
    
    // Pour cette implémentation, nous nous contentons de marquer les actions
    if (strategy.escalate && this.isEscalating(error.code)) {
      error.context = {
        ...error.context,
        escalated: true,
        escalationReason: 'High error frequency detected'
      };
    }
    
    if (strategy.notify) {
      error.context = {
        ...error.context,
        notificationRequired: true,
        notificationLevel: strategy.logLevel
      };
    }
  }
  
  private extractModuleFromOperation(operation: string): string {
    const parts = operation.split(':');
    return parts.length > 1 ? parts[0] : 'unknown';
  }
  
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Utilitaires pour les patterns d'erreur courants
   */
  
  /**
   * Crée une erreur de validation avec détails
   */
  public createValidationError(
    field: string, 
    value: any, 
    requirement: string,
    operation: string
  ): OutlookError {
    return this.handleError(
      new Error(`Validation failed for field '${field}': ${requirement}`),
      operation,
      { field, value, requirement, validationType: 'field' }
    );
  }
  
  /**
   * Crée une erreur de ressource non trouvée
   */
  public createNotFoundError(
    resourceType: string,
    resourceId: string,
    operation: string
  ): OutlookError {
    return this.handleError(
      new Error(`${resourceType} with ID '${resourceId}' not found`),
      operation,
      { resourceType, resourceId, errorType: 'not_found' }
    );
  }
  
  /**
   * Crée une erreur de conflit de ressource
   */
  public createConflictError(
    resourceType: string,
    conflictReason: string,
    operation: string
  ): OutlookError {
    return this.handleError(
      new Error(`${resourceType} conflict: ${conflictReason}`),
      operation,
      { resourceType, conflictReason, errorType: 'conflict' }
    );
  }
  
  /**
   * Crée une erreur de configuration
   */
  public createConfigurationError(
    configKey: string,
    expectedValue: string,
    operation: string
  ): OutlookError {
    return this.handleError(
      new Error(`Configuration error: '${configKey}' ${expectedValue}`),
      operation,
      { configKey, expectedValue, errorType: 'configuration' }
    );
  }
}

export default OutlookErrorHandler;