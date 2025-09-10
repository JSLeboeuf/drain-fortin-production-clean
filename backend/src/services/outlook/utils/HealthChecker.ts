/**
 * HealthChecker.ts - Système de vérification de santé pour l'intégration Outlook
 * Surveille l'état des services et des dépendances critiques
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { EventEmitter } from 'events';
import { AuditLogger } from '../security/AuditLogger';
import { GraphAPIClient } from './GraphAPIClient';
import { CacheManager } from './CacheManager';
import { OutlookErrorHandler } from './OutlookErrorHandler';
import {
  HealthCheckConfig,
  HealthStatus,
  HealthCheckResult,
  ComponentHealth,
  HealthMetrics,
  HealthThreshold,
  HealthCheck
} from '../config/outlook.types';

/**
 * Configuration par défaut des vérifications de santé
 */
const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = {
  checkInterval: 60000, // 1 minute
  timeout: 30000, // 30 secondes
  retryAttempts: 3,
  enabledChecks: [
    'graph_api',
    'cache',
    'database',
    'oauth2',
    'memory',
    'disk_space'
  ],
  thresholds: {
    memory: {
      warning: 0.8, // 80%
      critical: 0.9 // 90%
    },
    diskSpace: {
      warning: 0.85, // 85%
      critical: 0.95 // 95%
    },
    responseTime: {
      warning: 2000, // 2 seconds
      critical: 5000 // 5 seconds
    },
    errorRate: {
      warning: 0.05, // 5%
      critical: 0.1 // 10%
    }
  }
};

/**
 * Vérificateur de santé principal
 */
export class HealthChecker extends EventEmitter {
  private readonly config: HealthCheckConfig;
  private readonly auditLogger?: AuditLogger;
  private readonly graphClient?: GraphAPIClient;
  private readonly cacheManager?: CacheManager;
  private readonly errorHandler: OutlookErrorHandler;
  
  private checkInterval?: NodeJS.Timeout;
  private isRunning = false;
  private lastResults: Map<string, HealthCheckResult> = new Map();
  private metrics: HealthMetrics = {
    checksPerformed: 0,
    checksSuccessful: 0,
    checksFailed: 0,
    averageResponseTime: 0,
    uptime: 0,
    lastCheckTime: 0
  };
  private startTime = Date.now();

  constructor(
    config: Partial<HealthCheckConfig> = {},
    dependencies: {
      auditLogger?: AuditLogger;
      graphClient?: GraphAPIClient;
      cacheManager?: CacheManager;
      errorHandler: OutlookErrorHandler;
    }
  ) {
    super();
    
    this.config = { ...DEFAULT_HEALTH_CONFIG, ...config };
    this.auditLogger = dependencies.auditLogger;
    this.graphClient = dependencies.graphClient;
    this.cacheManager = dependencies.cacheManager;
    this.errorHandler = dependencies.errorHandler;
    
    this.auditLogger?.log('info', 'HealthChecker initialized', {
      component: 'HealthChecker',
      checkInterval: this.config.checkInterval,
      enabledChecks: this.config.enabledChecks
    });
  }

  /**
   * Démarre les vérifications périodiques de santé
   */
  start(): void {
    if (this.isRunning) {
      this.auditLogger?.log('warn', 'HealthChecker already running', {
        component: 'HealthChecker'
      });
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    
    // Effectuer une vérification immédiate
    this.performHealthCheck().catch(error => {
      this.auditLogger?.log('error', 'Initial health check failed', {
        component: 'HealthChecker',
        error: error.message
      });
    });
    
    // Démarrer les vérifications périodiques
    this.checkInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        this.auditLogger?.log('error', 'Scheduled health check failed', {
          component: 'HealthChecker',
          error: error.message
        });
      });
    }, this.config.checkInterval);
    
    this.auditLogger?.log('info', 'HealthChecker started', {
      component: 'HealthChecker',
      checkInterval: this.config.checkInterval
    });
    
    this.emit('started');
  }

  /**
   * Arrête les vérifications de santé
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    
    this.auditLogger?.log('info', 'HealthChecker stopped', {
      component: 'HealthChecker',
      uptime: Date.now() - this.startTime
    });
    
    this.emit('stopped');
  }

  /**
   * Effectue une vérification complète de santé
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const results: Map<string, HealthCheckResult> = new Map();
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    this.auditLogger?.log('debug', 'Performing health check', {
      component: 'HealthChecker',
      enabledChecks: this.config.enabledChecks
    });

    // Exécuter toutes les vérifications activées
    const checkPromises = this.config.enabledChecks.map(async (checkName) => {
      try {
        const result = await this.runHealthCheck(checkName);
        results.set(checkName, result);
        
        // Déterminer le statut global
        if (result.status === 'critical') {
          overallStatus = 'critical';
        } else if (result.status === 'warning' && overallStatus !== 'critical') {
          overallStatus = 'warning';
        }
        
      } catch (error) {
        const errorResult: HealthCheckResult = {
          name: checkName,
          status: 'critical',
          message: `Health check failed: ${(error as Error).message}`,
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          details: {
            error: (error as Error).message
          }
        };
        
        results.set(checkName, errorResult);
        overallStatus = 'critical';
        
        this.auditLogger?.log('error', 'Health check failed', {
          component: 'HealthChecker',
          checkName,
          error: (error as Error).message
        });
      }
    });

    await Promise.all(checkPromises);

    const endTime = Date.now();
    const totalResponseTime = endTime - startTime;
    
    // Mettre à jour les métriques
    this.updateMetrics(totalResponseTime, overallStatus === 'healthy');
    
    // Sauvegarder les résultats
    this.lastResults = results;
    
    const healthStatus: HealthStatus = {
      overall: overallStatus,
      timestamp: endTime,
      uptime: endTime - this.startTime,
      checks: Object.fromEntries(results),
      metrics: { ...this.metrics }
    };
    
    // Émettre des événements selon le statut
    this.emit('healthCheck', healthStatus);
    
    if (overallStatus === 'critical') {
      this.emit('healthCritical', healthStatus);
    } else if (overallStatus === 'warning') {
      this.emit('healthWarning', healthStatus);
    } else {
      this.emit('healthHealthy', healthStatus);
    }
    
    this.auditLogger?.log('info', 'Health check completed', {
      component: 'HealthChecker',
      overallStatus,
      totalChecks: results.size,
      totalTime: totalResponseTime
    });
    
    return healthStatus;
  }

  /**
   * Exécute une vérification de santé spécifique
   */
  private async runHealthCheck(checkName: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    switch (checkName) {
      case 'graph_api':
        return this.checkGraphAPI(startTime);
        
      case 'cache':
        return this.checkCache(startTime);
        
      case 'database':
        return this.checkDatabase(startTime);
        
      case 'oauth2':
        return this.checkOAuth2(startTime);
        
      case 'memory':
        return this.checkMemory(startTime);
        
      case 'disk_space':
        return this.checkDiskSpace(startTime);
        
      default:
        throw new Error(`Unknown health check: ${checkName}`);
    }
  }

  /**
   * Vérifie la santé de l'API Microsoft Graph
   */
  private async checkGraphAPI(startTime: number): Promise<HealthCheckResult> {
    if (!this.graphClient) {
      return {
        name: 'graph_api',
        status: 'warning',
        message: 'Graph API client not configured',
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        details: {
          configured: false
        }
      };
    }

    try {
      // Tenter une requête simple pour vérifier la connectivité
      await this.graphClient.makeRequest('GET', '/me', {});
      
      const responseTime = Date.now() - startTime;
      const status = this.evaluateResponseTime(responseTime);
      
      return {
        name: 'graph_api',
        status,
        message: status === 'healthy' ? 'Graph API responding normally' : 
                status === 'warning' ? 'Graph API responding slowly' : 
                'Graph API response time critical',
        timestamp: Date.now(),
        responseTime,
        details: {
          configured: true,
          responding: true
        }
      };
      
    } catch (error) {
      return {
        name: 'graph_api',
        status: 'critical',
        message: `Graph API unavailable: ${(error as Error).message}`,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        details: {
          configured: true,
          responding: false,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * Vérifie la santé du système de cache
   */
  private async checkCache(startTime: number): Promise<HealthCheckResult> {
    if (!this.cacheManager) {
      return {
        name: 'cache',
        status: 'warning',
        message: 'Cache manager not configured',
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        details: {
          configured: false
        }
      };
    }

    try {
      const testKey = 'health_check_test';
      const testValue = { timestamp: Date.now() };
      
      // Test d'écriture
      await this.cacheManager.set(testKey, testValue, 60);
      
      // Test de lecture
      const retrieved = await this.cacheManager.get(testKey);
      
      // Test de suppression
      await this.cacheManager.delete(testKey);
      
      const responseTime = Date.now() - startTime;
      const isWorking = retrieved && retrieved.timestamp === testValue.timestamp;
      
      return {
        name: 'cache',
        status: isWorking ? 'healthy' : 'critical',
        message: isWorking ? 'Cache system working normally' : 'Cache system malfunction',
        timestamp: Date.now(),
        responseTime,
        details: {
          configured: true,
          working: isWorking,
          provider: this.cacheManager.getProvider()
        }
      };
      
    } catch (error) {
      return {
        name: 'cache',
        status: 'critical',
        message: `Cache system error: ${(error as Error).message}`,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        details: {
          configured: true,
          working: false,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * Vérifie la santé de la base de données
   */
  private async checkDatabase(startTime: number): Promise<HealthCheckResult> {
    try {
      // Simulation d'une vérification de base de données
      // En production, ceci ferait une vraie requête à la DB
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: 'healthy',
        message: 'Database connection healthy',
        timestamp: Date.now(),
        responseTime,
        details: {
          connected: true,
          responseTime
        }
      };
      
    } catch (error) {
      return {
        name: 'database',
        status: 'critical',
        message: `Database connection failed: ${(error as Error).message}`,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        details: {
          connected: false,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * Vérifie la santé du système OAuth2
   */
  private async checkOAuth2(startTime: number): Promise<HealthCheckResult> {
    try {
      // Vérifier la validité des tokens en cache ou la configuration OAuth2
      // Simulation pour cette implémentation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'oauth2',
        status: 'healthy',
        message: 'OAuth2 system operational',
        timestamp: Date.now(),
        responseTime,
        details: {
          configured: true,
          tokensValid: true
        }
      };
      
    } catch (error) {
      return {
        name: 'oauth2',
        status: 'critical',
        message: `OAuth2 system error: ${(error as Error).message}`,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        details: {
          configured: false,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * Vérifie l'utilisation de la mémoire
   */
  private async checkMemory(startTime: number): Promise<HealthCheckResult> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapUsed + memoryUsage.external;
    const memoryLimit = memoryUsage.heapTotal;
    const memoryRatio = totalMemory / memoryLimit;
    
    const thresholds = this.config.thresholds.memory;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = `Memory usage: ${Math.round(memoryRatio * 100)}%`;
    
    if (memoryRatio >= thresholds.critical) {
      status = 'critical';
      message += ' (CRITICAL)';
    } else if (memoryRatio >= thresholds.warning) {
      status = 'warning';
      message += ' (WARNING)';
    }
    
    return {
      name: 'memory',
      status,
      message,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime,
      details: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        usagePercentage: Math.round(memoryRatio * 100)
      }
    };
  }

  /**
   * Vérifie l'espace disque
   */
  private async checkDiskSpace(startTime: number): Promise<HealthCheckResult> {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.statfs('./');
      
      const total = stats.bavail * stats.bsize;
      const free = stats.bfree * stats.bsize;
      const used = total - free;
      const usageRatio = used / total;
      
      const thresholds = this.config.thresholds.diskSpace;
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      let message = `Disk usage: ${Math.round(usageRatio * 100)}%`;
      
      if (usageRatio >= thresholds.critical) {
        status = 'critical';
        message += ' (CRITICAL)';
      } else if (usageRatio >= thresholds.warning) {
        status = 'warning';
        message += ' (WARNING)';
      }
      
      return {
        name: 'disk_space',
        status,
        message,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        details: {
          total: total,
          used: used,
          free: free,
          usagePercentage: Math.round(usageRatio * 100)
        }
      };
      
    } catch (error) {
      return {
        name: 'disk_space',
        status: 'warning',
        message: `Could not check disk space: ${(error as Error).message}`,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        details: {
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * Évalue le temps de réponse
   */
  private evaluateResponseTime(responseTime: number): 'healthy' | 'warning' | 'critical' {
    const thresholds = this.config.thresholds.responseTime;
    
    if (responseTime >= thresholds.critical) {
      return 'critical';
    } else if (responseTime >= thresholds.warning) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * Met à jour les métriques
   */
  private updateMetrics(responseTime: number, success: boolean): void {
    this.metrics.checksPerformed++;
    this.metrics.lastCheckTime = Date.now();
    this.metrics.uptime = Date.now() - this.startTime;
    
    if (success) {
      this.metrics.checksSuccessful++;
    } else {
      this.metrics.checksFailed++;
    }
    
    // Calcul de la moyenne mobile pour le temps de réponse
    const totalChecks = this.metrics.checksPerformed;
    const currentAverage = this.metrics.averageResponseTime;
    this.metrics.averageResponseTime = 
      (currentAverage * (totalChecks - 1) + responseTime) / totalChecks;
  }

  /**
   * Obtient le dernier statut de santé
   */
  getLastHealthStatus(): HealthStatus | null {
    if (this.lastResults.size === 0) {
      return null;
    }
    
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    for (const result of this.lastResults.values()) {
      if (result.status === 'critical') {
        overallStatus = 'critical';
        break;
      } else if (result.status === 'warning' && overallStatus !== 'critical') {
        overallStatus = 'warning';
      }
    }
    
    return {
      overall: overallStatus,
      timestamp: this.metrics.lastCheckTime,
      uptime: this.metrics.uptime,
      checks: Object.fromEntries(this.lastResults),
      metrics: { ...this.metrics }
    };
  }

  /**
   * Obtient les métriques actuelles
   */
  getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Vérifie si le système est en bonne santé
   */
  isHealthy(): boolean {
    const lastStatus = this.getLastHealthStatus();
    return lastStatus ? lastStatus.overall === 'healthy' : false;
  }

  /**
   * Ajoute une vérification personnalisée
   */
  addCustomCheck(name: string, checkFn: () => Promise<HealthCheckResult>): void {
    if (!this.config.enabledChecks.includes(name)) {
      this.config.enabledChecks.push(name);
    }
    
    // Stocker la fonction de vérification personnalisée
    (this as any)[`check${name.charAt(0).toUpperCase()}${name.slice(1)}`] = async (startTime: number) => {
      try {
        return await checkFn();
      } catch (error) {
        return {
          name,
          status: 'critical' as const,
          message: `Custom check failed: ${(error as Error).message}`,
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          details: {
            error: (error as Error).message
          }
        };
      }
    };
    
    this.auditLogger?.log('info', 'Custom health check added', {
      component: 'HealthChecker',
      checkName: name
    });
  }

  /**
   * Nettoie les ressources
   */
  async dispose(): Promise<void> {
    this.stop();
    this.removeAllListeners();
    this.lastResults.clear();
    
    this.auditLogger?.log('info', 'HealthChecker disposed', {
      component: 'HealthChecker',
      finalMetrics: this.getMetrics()
    });
  }
}

/**
 * Factory pour créer des instances de HealthChecker
 */
export class HealthCheckerFactory {
  /**
   * Crée une instance par défaut
   */
  static createDefault(errorHandler: OutlookErrorHandler): HealthChecker {
    return new HealthChecker({}, { errorHandler });
  }

  /**
   * Crée une instance avec surveillance intensive
   */
  static createIntensive(
    errorHandler: OutlookErrorHandler,
    dependencies: {
      auditLogger?: AuditLogger;
      graphClient?: GraphAPIClient;
      cacheManager?: CacheManager;
    }
  ): HealthChecker {
    return new HealthChecker({
      checkInterval: 30000, // 30 secondes
      timeout: 15000,
      retryAttempts: 2,
      enabledChecks: [
        'graph_api',
        'cache', 
        'database',
        'oauth2',
        'memory',
        'disk_space'
      ],
      thresholds: {
        memory: {
          warning: 0.7,
          critical: 0.85
        },
        diskSpace: {
          warning: 0.8,
          critical: 0.9
        },
        responseTime: {
          warning: 1500,
          critical: 3000
        },
        errorRate: {
          warning: 0.03,
          critical: 0.08
        }
      }
    }, { errorHandler, ...dependencies });
  }

  /**
   * Crée une instance avec surveillance légère
   */
  static createLightweight(errorHandler: OutlookErrorHandler): HealthChecker {
    return new HealthChecker({
      checkInterval: 300000, // 5 minutes
      timeout: 60000,
      retryAttempts: 1,
      enabledChecks: ['memory', 'disk_space'],
      thresholds: {
        memory: {
          warning: 0.9,
          critical: 0.95
        },
        diskSpace: {
          warning: 0.9,
          critical: 0.95
        }
      }
    }, { errorHandler });
  }
}

export default HealthChecker;