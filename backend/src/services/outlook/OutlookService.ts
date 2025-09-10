/**
 * OutlookService.ts - Service principal d'intégration Microsoft Outlook
 * Gestion OAuth2, authentification, et orchestration des services Outlook
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider, AuthenticationResult } from '@azure/msal-node';
import { GraphAPIClient } from './utils/GraphAPIClient';
import { OAuth2Manager } from './security/OAuth2Manager';
import { AuditLogger } from './security/AuditLogger';
import { RateLimiter } from './security/RateLimiter';
import { CacheManager } from './utils/CacheManager';
import { RetryMechanism } from './utils/RetryMechanism';
import { HealthChecker } from './utils/HealthChecker';
import { MetricsCollector } from './utils/MetricsCollector';
import { 
  OutlookConfig,
  OutlookServiceOptions,
  OutlookConnectionStatus,
  OutlookUser,
  OutlookServiceHealth,
  OutlookError,
  OutlookAuthTokens,
  OutlookServiceMetrics
} from './config/outlook.types';
import { OUTLOOK_CONSTANTS } from './config/outlook.constants';
import { OutlookErrorHandler } from './utils/OutlookErrorHandler';

/**
 * Service principal pour l'intégration Microsoft Outlook
 * Gère l'authentification, les tokens, et coordonne tous les autres services
 */
export class OutlookService {
  private graphClient: GraphAPIClient;
  private oauthManager: OAuth2Manager;
  private auditLogger: AuditLogger;
  private rateLimiter: RateLimiter;
  private cacheManager: CacheManager;
  private retryMechanism: RetryMechanism;
  private healthChecker: HealthChecker;
  private metricsCollector: MetricsCollector;
  private errorHandler: OutlookErrorHandler;
  
  private isInitialized: boolean = false;
  private connectionStatus: OutlookConnectionStatus = 'disconnected';
  private currentUser: OutlookUser | null = null;
  private authTokens: OutlookAuthTokens | null = null;
  
  private readonly config: OutlookConfig;
  
  constructor(config: OutlookConfig, options: OutlookServiceOptions = {}) {
    this.config = {
      ...OUTLOOK_CONSTANTS.DEFAULT_CONFIG,
      ...config
    };
    
    // Validation de configuration
    this.validateConfig();
    
    // Initialisation des composants de base
    this.errorHandler = new OutlookErrorHandler(this.config);
    this.auditLogger = new AuditLogger(this.config.audit);
    this.metricsCollector = new MetricsCollector(this.config.metrics);
    this.cacheManager = new CacheManager(this.config.cache);
    this.retryMechanism = new RetryMechanism(this.config.retry);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    
    // Initialisation du client Graph API
    this.graphClient = new GraphAPIClient(this.config, {
      retryMechanism: this.retryMechanism,
      rateLimiter: this.rateLimiter,
      cacheManager: this.cacheManager,
      auditLogger: this.auditLogger
    });
    
    // Initialisation OAuth2
    this.oauthManager = new OAuth2Manager(this.config.oauth2, {
      auditLogger: this.auditLogger,
      cacheManager: this.cacheManager,
      errorHandler: this.errorHandler
    });
    
    // Health checker
    this.healthChecker = new HealthChecker(this.config.health, {
      graphClient: this.graphClient,
      oauthManager: this.oauthManager,
      metricsCollector: this.metricsCollector
    });
  }
  
  /**
   * Initialise le service Outlook avec authentification
   * @param userId ID de l'utilisateur pour l'authentification
   * @param options Options d'initialisation
   */
  public async initialize(userId?: string, options: {
    skipHealthCheck?: boolean;
    forceReauth?: boolean;
  } = {}): Promise<OutlookConnectionStatus> {
    const startTime = Date.now();
    
    try {
      this.auditLogger.info('OutlookService:Initialize', {
        userId,
        options,
        timestamp: new Date().toISOString()
      });
      
      // Vérifier si déjà initialisé
      if (this.isInitialized && !options.forceReauth) {
        this.metricsCollector.incrementCounter('outlook.service.init.already_initialized');
        return this.connectionStatus;
      }
      
      // Étape 1: Authentification OAuth2
      await this.authenticateUser(userId, options.forceReauth);
      
      // Étape 2: Initialisation du client Graph
      await this.graphClient.initialize(this.authTokens!);
      
      // Étape 3: Récupération des informations utilisateur
      await this.loadUserProfile();
      
      // Étape 4: Vérification de santé (optionnelle)
      if (!options.skipHealthCheck) {
        const health = await this.healthChecker.performHealthCheck();
        if (health.status !== 'healthy') {
          throw new OutlookError('HEALTH_CHECK_FAILED', 'Service health check failed', health);
        }
      }
      
      // Étape 5: Finalisation
      this.isInitialized = true;
      this.connectionStatus = 'connected';
      
      const duration = Date.now() - startTime;
      this.metricsCollector.recordDuration('outlook.service.init.duration', duration);
      this.metricsCollector.incrementCounter('outlook.service.init.success');
      
      this.auditLogger.info('OutlookService:InitializeSuccess', {
        userId: this.currentUser?.id,
        duration,
        connectionStatus: this.connectionStatus
      });
      
      return this.connectionStatus;
      
    } catch (error) {
      this.connectionStatus = 'error';
      this.metricsCollector.incrementCounter('outlook.service.init.error');
      
      const outlookError = this.errorHandler.handleError(error, 'OutlookService:Initialize');
      this.auditLogger.error('OutlookService:InitializeError', outlookError);
      
      throw outlookError;
    }
  }
  
  /**
   * Authentification utilisateur via OAuth2
   * @param userId ID de l'utilisateur (optionnel)
   * @param forceReauth Forcer une nouvelle authentification
   */
  private async authenticateUser(userId?: string, forceReauth: boolean = false): Promise<void> {
    try {
      // Vérifier les tokens existants
      if (!forceReauth && this.authTokens) {
        const isValid = await this.oauthManager.validateTokens(this.authTokens);
        if (isValid) {
          this.auditLogger.debug('OutlookService:AuthenticateUser', 'Using existing valid tokens');
          return;
        }
      }
      
      // Obtenir de nouveaux tokens
      if (userId && !forceReauth) {
        // Tentative de récupération depuis le cache
        this.authTokens = await this.oauthManager.getTokensFromCache(userId);
      }
      
      if (!this.authTokens) {
        // Authentification interactive nécessaire
        this.authTokens = await this.oauthManager.acquireTokenInteractive();
      } else {
        // Refresh des tokens existants
        this.authTokens = await this.oauthManager.refreshTokens(this.authTokens);
      }
      
      // Stocker les tokens en cache sécurisé
      if (userId) {
        await this.oauthManager.storeTokensInCache(userId, this.authTokens);
      }
      
      this.auditLogger.info('OutlookService:AuthenticateUser', {
        userId,
        tokenExpiry: this.authTokens.expiresOn,
        method: forceReauth ? 'interactive' : 'cache_or_refresh'
      });
      
    } catch (error) {
      this.auditLogger.error('OutlookService:AuthenticateUserError', error);
      throw this.errorHandler.handleError(error, 'OutlookService:AuthenticateUser');
    }
  }
  
  /**
   * Charge le profil utilisateur depuis Microsoft Graph
   */
  private async loadUserProfile(): Promise<void> {
    try {
      const userProfile = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.getUser();
      }, 'loadUserProfile');
      
      this.currentUser = {
        id: userProfile.id!,
        email: userProfile.mail || userProfile.userPrincipalName!,
        displayName: userProfile.displayName || 'Unknown User',
        givenName: userProfile.givenName,
        surname: userProfile.surname,
        jobTitle: userProfile.jobTitle,
        department: userProfile.department,
        companyName: userProfile.companyName,
        mobilePhone: userProfile.mobilePhone,
        businessPhones: userProfile.businessPhones || [],
        officeLocation: userProfile.officeLocation,
        preferredLanguage: userProfile.preferredLanguage,
        lastSignIn: new Date()
      };
      
      // Mettre en cache le profil utilisateur
      await this.cacheManager.set(
        `user_profile:${this.currentUser.id}`, 
        this.currentUser, 
        this.config.cache.userProfileTTL
      );
      
      this.auditLogger.info('OutlookService:LoadUserProfile', {
        userId: this.currentUser.id,
        userEmail: this.currentUser.email,
        userDisplayName: this.currentUser.displayName
      });
      
    } catch (error) {
      this.auditLogger.error('OutlookService:LoadUserProfileError', error);
      throw this.errorHandler.handleError(error, 'OutlookService:LoadUserProfile');
    }
  }
  
  /**
   * Vérifie l'état de santé du service
   */
  public async getHealthStatus(): Promise<OutlookServiceHealth> {
    try {
      return await this.healthChecker.performHealthCheck();
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        checks: {
          authentication: { status: 'fail', message: 'Health check failed' },
          graphApi: { status: 'fail', message: 'Health check failed' },
          rateLimits: { status: 'unknown', message: 'Unable to check' },
          cache: { status: 'unknown', message: 'Unable to check' }
        },
        error: this.errorHandler.handleError(error, 'OutlookService:GetHealthStatus')
      };
    }
  }
  
  /**
   * Récupère les métriques de performance du service
   */
  public async getServiceMetrics(): Promise<OutlookServiceMetrics> {
    return this.metricsCollector.getMetrics();
  }
  
  /**
   * Déconnexion et nettoyage des ressources
   */
  public async disconnect(): Promise<void> {
    try {
      this.auditLogger.info('OutlookService:Disconnect', {
        userId: this.currentUser?.id,
        timestamp: new Date().toISOString()
      });
      
      // Révoquer les tokens OAuth2
      if (this.authTokens) {
        await this.oauthManager.revokeTokens(this.authTokens);
      }
      
      // Nettoyer le cache
      if (this.currentUser) {
        await this.cacheManager.delete(`user_profile:${this.currentUser.id}`);
        await this.oauthManager.removeTokensFromCache(this.currentUser.id);
      }
      
      // Reset de l'état
      this.isInitialized = false;
      this.connectionStatus = 'disconnected';
      this.currentUser = null;
      this.authTokens = null;
      
      this.metricsCollector.incrementCounter('outlook.service.disconnect');
      
    } catch (error) {
      this.auditLogger.error('OutlookService:DisconnectError', error);
      throw this.errorHandler.handleError(error, 'OutlookService:Disconnect');
    }
  }
  
  /**
   * Validation de la configuration
   */
  private validateConfig(): void {
    const required = ['clientId', 'clientSecret', 'tenantId', 'redirectUri'];
    const missing = required.filter(key => !this.config.oauth2[key as keyof typeof this.config.oauth2]);
    
    if (missing.length > 0) {
      throw new OutlookError(
        'CONFIGURATION_INVALID',
        `Missing required configuration: ${missing.join(', ')}`,
        { missing }
      );
    }
    
    // Validation des URLs
    try {
      new URL(this.config.oauth2.redirectUri);
    } catch {
      throw new OutlookError(
        'CONFIGURATION_INVALID',
        'Invalid redirectUri URL format',
        { redirectUri: this.config.oauth2.redirectUri }
      );
    }
  }
  
  /**
   * Getters pour accès aux propriétés
   */
  public get isConnected(): boolean {
    return this.connectionStatus === 'connected' && this.isInitialized;
  }
  
  public get user(): OutlookUser | null {
    return this.currentUser;
  }
  
  public get status(): OutlookConnectionStatus {
    return this.connectionStatus;
  }
  
  /**
   * Accès aux services spécialisés
   */
  public get graphApiClient(): GraphAPIClient {
    this.ensureInitialized();
    return this.graphClient;
  }
  
  public get oauth2Manager(): OAuth2Manager {
    return this.oauthManager;
  }
  
  public get cache(): CacheManager {
    return this.cacheManager;
  }
  
  public get metrics(): MetricsCollector {
    return this.metricsCollector;
  }
  
  public get audit(): AuditLogger {
    return this.auditLogger;
  }
  
  /**
   * Vérification que le service est initialisé
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || this.connectionStatus !== 'connected') {
      throw new OutlookError(
        'SERVICE_NOT_INITIALIZED',
        'OutlookService must be initialized before use',
        { connectionStatus: this.connectionStatus, isInitialized: this.isInitialized }
      );
    }
  }
  
  /**
   * Refresh automatique des tokens avant expiration
   */
  public async refreshTokensIfNeeded(): Promise<boolean> {
    try {
      if (!this.authTokens) return false;
      
      const needsRefresh = await this.oauthManager.tokensNeedRefresh(this.authTokens);
      if (needsRefresh) {
        this.authTokens = await this.oauthManager.refreshTokens(this.authTokens);
        await this.graphClient.updateTokens(this.authTokens);
        
        this.auditLogger.info('OutlookService:TokensRefreshed', {
          userId: this.currentUser?.id,
          newExpiry: this.authTokens.expiresOn
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      this.auditLogger.error('OutlookService:RefreshTokensError', error);
      throw this.errorHandler.handleError(error, 'OutlookService:RefreshTokens');
    }
  }
}

export default OutlookService;