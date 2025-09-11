/**
 * index.ts - Point d'entrée principal pour l'intégration Outlook
 * Export de tous les services, types, et utilitaires Outlook
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

// ===== IMPORTS INTERNES =====
import { CacheManager } from './utils/CacheManager';
import { AuditLogger } from './security/AuditLogger';
import { EncryptionService } from './security/EncryptionService';
import { OutlookService } from './OutlookService';
import { OutlookCalendarSync } from './OutlookCalendarSync';
import { OutlookContactSync } from './OutlookContactSync';
import { OutlookEmailManager } from './OutlookEmailManager';
import { OutlookRoutingEngine } from './OutlookRoutingEngine';
import { GraphAPIClient } from './utils/GraphAPIClient';
import { OAuth2Manager } from './security/OAuth2Manager';
import { OutlookErrorHandler } from './utils/OutlookErrorHandler';
import { RetryMechanism } from './utils/RetryMechanism';
import { RateLimiter } from './security/RateLimiter';
import { BatchProcessor } from './utils/BatchProcessor';
import { HealthChecker } from './utils/HealthChecker';
import { MetricsCollector } from './utils/MetricsCollector';

// ===== SERVICES PRINCIPAUX =====

// Service principal et orchestrateur
export { OutlookService } from './OutlookService';
export { default as OutlookServiceDefault } from './OutlookService';

// Services de synchronisation
export { OutlookCalendarSync } from './OutlookCalendarSync';
export { default as OutlookCalendarSyncDefault } from './OutlookCalendarSync';

export { OutlookContactSync } from './OutlookContactSync';
export { default as OutlookContactSyncDefault } from './OutlookContactSync';

// Gestionnaire d'emails
export { OutlookEmailManager } from './OutlookEmailManager';
export { default as OutlookEmailManagerDefault } from './OutlookEmailManager';

// Moteur de routage téléphonique
export { OutlookRoutingEngine } from './OutlookRoutingEngine';
export { default as OutlookRoutingEngineDefault } from './OutlookRoutingEngine';

// ===== SÉCURITÉ =====
export { OAuth2Manager } from './security/OAuth2Manager';
export { default as OAuth2ManagerDefault } from './security/OAuth2Manager';

export { EncryptionService } from './security/EncryptionService';
export { default as EncryptionServiceDefault } from './security/EncryptionService';

export { AuditLogger } from './security/AuditLogger';
export { default as AuditLoggerDefault } from './security/AuditLogger';

export { RateLimiter } from './security/RateLimiter';
export { default as RateLimiterDefault } from './security/RateLimiter';

// ===== UTILITAIRES =====
export { GraphAPIClient } from './utils/GraphAPIClient';
export { default as GraphAPIClientDefault } from './utils/GraphAPIClient';

export { CacheManager } from './utils/CacheManager';
export { default as CacheManagerDefault } from './utils/CacheManager';

export { OutlookErrorHandler } from './utils/OutlookErrorHandler';
export { default as OutlookErrorHandlerDefault } from './utils/OutlookErrorHandler';

export { RetryMechanism } from './utils/RetryMechanism';
export { default as RetryMechanismDefault } from './utils/RetryMechanism';

export { BatchProcessor } from './utils/BatchProcessor';
export { default as BatchProcessorDefault } from './utils/BatchProcessor';

export { HealthChecker } from './utils/HealthChecker';
export { default as HealthCheckerDefault } from './utils/HealthChecker';

export { MetricsCollector } from './utils/MetricsCollector';
export { default as MetricsCollectorDefault } from './utils/MetricsCollector';

// ===== CONFIGURATION ET TYPES =====
export * from './config/outlook.types';
export { OUTLOOK_CONSTANTS } from './config/outlook.constants';

// ===== FACTORY ET BUILDER =====

/**
 * Factory pour créer une instance complète du service Outlook
 * Avec toutes les dépendances configurées automatiquement
 */
export class OutlookServiceFactory {
  /**
   * Crée une instance complète du service Outlook
   * @param config Configuration Outlook
   * @param options Options personnalisées
   */
  public static async createOutlookService(
    config: import('./config/outlook.types').OutlookConfig,
    options: {
      enableVapi?: boolean;
      enableTwilio?: boolean;
      vapiConfig?: import('./config/outlook.types').VapiIntegrationConfig;
      twilioConfig?: import('./config/outlook.types').TwilioIntegrationConfig;
      customProviders?: {
        cache?: CacheManager;
        audit?: AuditLogger;
        encryption?: EncryptionService;
      };
    } = {}
  ): Promise<{
    outlookService: OutlookService;
    calendarSync: OutlookCalendarSync;
    contactSync: OutlookContactSync;
    emailManager: OutlookEmailManager;
    routingEngine: OutlookRoutingEngine;
    utilities: {
      graphClient: GraphAPIClient;
      cache: CacheManager;
      audit: AuditLogger;
      oauth2: OAuth2Manager;
      encryption: EncryptionService;
      errorHandler: OutlookErrorHandler;
      retryMechanism: RetryMechanism;
      rateLimiter: RateLimiter;
      batchProcessor: BatchProcessor<any, any>;
      healthChecker: HealthChecker;
      metricsCollector: MetricsCollector;
    };
  }> {
    // Initialisation des services utilitaires
    const encryption = options.customProviders?.encryption || new EncryptionService(config);
    const audit = options.customProviders?.audit || new AuditLogger(config.audit, encryption);
    const cache = options.customProviders?.cache || new CacheManager(config.cache);
    const errorHandler = new OutlookErrorHandler(config);
    
    // Initialisation des composants de base
    const retryMechanism = new (await import('./utils/RetryMechanism')).RetryMechanism({
      maxRetries: config.retry.maxRetries,
      baseDelay: config.retry.baseDelay,
      maxDelay: config.retry.maxDelay,
      exponentialBase: config.retry.exponentialBase,
      jitter: config.retry.jitter
    }, {
      auditLogger: audit,
      errorHandler
    });
    
    const rateLimiter = new (await import('./security/RateLimiter')).RateLimiter(config.rateLimit, {
      auditLogger: audit,
      cacheManager: cache
    });
    
    // Initialisation des utilitaires avancés
    const batchProcessor = new (await import('./utils/BatchProcessor')).BatchProcessor({
      batchSize: config.sync.batchSize,
      maxConcurrency: 5,
      processingMode: 'parallel',
      errorStrategy: 'continue',
      retryFailedItems: true,
      maxRetries: config.sync.maxRetries
    }, {
      auditLogger: audit,
      retryMechanism,
      errorHandler
    });
    
    const healthChecker = new (await import('./utils/HealthChecker')).HealthChecker(config.health, {
      auditLogger: audit,
      errorHandler
    });
    
    const metricsCollector = new (await import('./utils/MetricsCollector')).MetricsCollector(config.metrics, {
      auditLogger: audit,
      cacheManager: cache,
      errorHandler
    });
    
    // Initialisation du client Graph API
    const graphClient = new GraphAPIClient(config, {
      retryMechanism,
      rateLimiter,
      cacheManager: cache,
      auditLogger: audit
    });
    
    // Initialisation de l'OAuth2 Manager
    const oauth2Manager = new OAuth2Manager(config.oauth2, {
      auditLogger: audit,
      cacheManager: cache,
      errorHandler,
      encryptionService: encryption
    });
    
    // Service principal Outlook
    const outlookService = new OutlookService(config, {
      enableMetrics: true,
      enableAudit: true,
      enableCache: true,
      enableRetry: true,
      enableRateLimit: true,
      customProviders: {
        cache,
        audit
      }
    });
    
    // Services de synchronisation
    const calendarSync = new OutlookCalendarSync(graphClient, {
      auditLogger: audit,
      cacheManager: cache,
      retryMechanism,
      errorHandler
    });
    
    const contactSync = new OutlookContactSync(graphClient, {
      auditLogger: audit,
      cacheManager: cache,
      retryMechanism,
      errorHandler
    });
    
    // Gestionnaire d'emails
    const emailManager = new OutlookEmailManager(graphClient, {
      auditLogger: audit,
      cacheManager: cache,
      retryMechanism,
      encryptionService: encryption,
      errorHandler
    });
    
    // Moteur de routage téléphonique
    const routingEngine = new OutlookRoutingEngine(outlookService, {
      calendarSync,
      contactSync,
      emailManager,
      auditLogger: audit,
      cacheManager: cache,
      errorHandler,
      vapiConfig: options.enableVapi ? options.vapiConfig : undefined,
      twilioConfig: options.enableTwilio ? options.twilioConfig : undefined
    });
    
    return {
      outlookService,
      calendarSync,
      contactSync,
      emailManager,
      routingEngine,
      utilities: {
        graphClient,
        cache,
        audit,
        oauth2: oauth2Manager,
        encryption,
        errorHandler,
        retryMechanism,
        rateLimiter,
        batchProcessor,
        healthChecker,
        metricsCollector
      }
    };
  }
  
  /**
   * Crée une configuration par défaut pour le développement
   */
  public static createDevelopmentConfig(): import('./config/outlook.types').OutlookConfig {
    return {
      oauth2: {
        clientId: process.env.OUTLOOK_CLIENT_ID || 'your-client-id',
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET || 'your-client-secret',
        tenantId: process.env.OUTLOOK_TENANT_ID || 'common',
        redirectUri: process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3000/auth/callback',
        scopes: [
          'openid',
          'profile',
          'email',
          'offline_access',
          'Calendars.ReadWrite',
          'Mail.ReadWrite',
          'Mail.Send',
          'Contacts.ReadWrite',
          'User.Read'
        ]
      },
      cache: {
        provider: 'memory',
        ttl: 3600,
        maxSize: 1000,
        userProfileTTL: 86400,
        tokenTTL: 3300,
        eventTTL: 1800,
        emailTTL: 3600,
        contactTTL: 86400
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        exponentialBase: 2,
        jitter: true
      },
      rateLimit: {
        maxRequestsPerMinute: 100,
        maxRequestsPerHour: 5000,
        maxConcurrentRequests: 10,
        backoffMultiplier: 2
      },
      audit: {
        enabled: true,
        level: 'info',
        destination: 'console',
        retentionDays: 7,
        encryptPII: false
      },
      metrics: {
        enabled: true,
        provider: 'memory',
        interval: 30000
      },
      health: {
        checkInterval: 60000,
        timeout: 30000,
        retryAttempts: 3
      },
      sync: {
        enableRealtime: true,
        batchSize: 20,
        maxRetries: 3,
        conflictResolutionStrategy: 'timestamp',
        deltaTokenTTL: 86400
      },
      security: {
        encryptionKey: process.env.OUTLOOK_ENCRYPTION_KEY || 'dev-key-change-in-production',
        tokenEncryption: false,
        auditEncryption: false,
        dataRetentionDays: 30
      },
      phone: {
        defaultCountryCode: '+1',
        formatInternational: true,
        validateNumbers: true
      },
      routing: {
        defaultStrategy: 'round_robin',
        maxQueueTime: 300,
        overflowStrategy: 'voicemail',
        workingHours: {
          start: '08:00',
          end: '18:00',
          timezone: 'America/Toronto',
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        }
      }
    };
  }
  
  /**
   * Crée une configuration pour la production
   */
  public static createProductionConfig(): import('./config/outlook.types').OutlookConfig {
    const devConfig = this.createDevelopmentConfig();
    
    return {
      ...devConfig,
      cache: {
        ...devConfig.cache,
        provider: 'redis',
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        ttl: 7200,
        maxSize: 10000
      },
      audit: {
        ...devConfig.audit,
        level: 'warn',
        destination: 'file',
        retentionDays: 90,
        encryptPII: true
      },
      security: {
        ...devConfig.security,
        encryptionKey: process.env.OUTLOOK_ENCRYPTION_KEY || (() => {
          throw new Error('OUTLOOK_ENCRYPTION_KEY environment variable is required in production');
        })(),
        tokenEncryption: true,
        auditEncryption: true,
        dataRetentionDays: 90
      },
      rateLimit: {
        ...devConfig.rateLimit,
        maxRequestsPerMinute: 1000,
        maxRequestsPerHour: 50000,
        maxConcurrentRequests: 50
      }
    };
  }
}

// ===== HELPERS ET UTILITAIRES =====

/**
 * Helper pour valider une configuration Outlook
 */
export function validateOutlookConfig(
  config: import('./config/outlook.types').OutlookConfig
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validation OAuth2
  if (!config.oauth2.clientId) {
    errors.push('OAuth2 clientId is required');
  }
  if (!config.oauth2.clientSecret) {
    errors.push('OAuth2 clientSecret is required');
  }
  if (!config.oauth2.redirectUri) {
    errors.push('OAuth2 redirectUri is required');
  }
  if (!Array.isArray(config.oauth2.scopes) || config.oauth2.scopes.length === 0) {
    errors.push('OAuth2 scopes must be a non-empty array');
  }
  
  // Validation du cache
  if (!['memory', 'redis', 'file'].includes(config.cache.provider)) {
    errors.push('Cache provider must be one of: memory, redis, file');
  }
  if (config.cache.provider === 'redis' && !config.cache.redisUrl) {
    errors.push('Redis URL is required when using redis cache provider');
  }
  if (config.cache.provider === 'file' && !config.cache.filePath) {
    errors.push('File path is required when using file cache provider');
  }
  
  // Validation de la sécurité
  if (!config.security.encryptionKey) {
    errors.push('Security encryptionKey is required');
  }
  if (config.security.encryptionKey === 'dev-key-change-in-production' && 
      process.env.NODE_ENV === 'production') {
    errors.push('Default encryption key detected in production environment');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper pour créer une configuration minimale
 */
export function createMinimalConfig(overrides: Partial<import('./config/outlook.types').OutlookConfig> = {}) {
  const base = OutlookServiceFactory.createDevelopmentConfig();
  
  return {
    ...base,
    ...overrides,
    oauth2: {
      ...base.oauth2,
      ...overrides.oauth2
    },
    cache: {
      ...base.cache,
      ...overrides.cache
    }
  };
}

/**
 * Helper pour créer des clients de test
 */
export async function createTestingClients(config?: Partial<import('./config/outlook.types').OutlookConfig>) {
  const testConfig = createMinimalConfig({
    ...config,
    audit: {
      enabled: false,
      level: 'error',
      destination: 'console',
      retentionDays: 1,
      encryptPII: false
    },
    cache: {
      provider: 'memory',
      ttl: 60,
      maxSize: 100,
      userProfileTTL: 60,
      tokenTTL: 60,
      eventTTL: 60,
      emailTTL: 60,
      contactTTL: 60
    }
  });
  
  const validation = validateOutlookConfig(testConfig);
  if (!validation.isValid) {
    console.warn('Test configuration validation warnings:', validation.errors);
  }
  
  return await OutlookServiceFactory.createOutlookService(testConfig);
}

// ===== VERSION ET INFORMATIONS =====

export const OUTLOOK_INTEGRATION_VERSION = '2.0.0';
export const OUTLOOK_INTEGRATION_BUILD_DATE = new Date('2025-01-15');

export const OUTLOOK_INTEGRATION_INFO = {
  version: OUTLOOK_INTEGRATION_VERSION,
  buildDate: OUTLOOK_INTEGRATION_BUILD_DATE,
  features: [
    'OAuth2 Authentication',
    'Calendar Synchronization',
    'Contact Management',
    'Email Management',
    'Phone Routing',
    'VAPI Integration',
    'Twilio Integration',
    'Real-time Sync',
    'Conflict Resolution',
    'Caching Layer',
    'Audit Logging',
    'Error Handling',
    'Rate Limiting',
    'Health Monitoring',
    'Metrics Collection',
    'Data Encryption',
    'Batch Operations',
    'Webhook Support'
  ],
  requirements: {
    node: '>=18.0.0',
    typescript: '>=5.0.0'
  },
  dependencies: {
    '@azure/msal-node': '^2.6.4',
    '@microsoft/microsoft-graph-client': '^3.0.7',
    '@microsoft/microsoft-graph-types': '^2.40.0'
  }
};

// Export par défaut
export default OutlookServiceFactory;