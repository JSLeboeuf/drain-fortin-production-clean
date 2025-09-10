/**
 * GraphAPIClient.ts - Client Microsoft Graph optimisé avec retry et cache
 * Gestion avancée des requêtes, rate limiting, batch operations
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { Client, GraphRequest, ResponseType } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { RetryMechanism } from './RetryMechanism';
import { RateLimiter } from '../security/RateLimiter';
import { CacheManager } from './CacheManager';
import { AuditLogger } from '../security/AuditLogger';
import { 
  OutlookAuthTokens,
  OutlookConfig,
  OutlookError
} from '../config/outlook.types';
import { OUTLOOK_CONSTANTS } from '../config/outlook.constants';

/**
 * Provider d'authentification personnalisé pour Microsoft Graph
 */
class OutlookAuthProvider implements AuthenticationProvider {
  constructor(private tokens: OutlookAuthTokens) {}
  
  async getAccessToken(): Promise<string> {
    if (!this.tokens || !this.tokens.accessToken) {
      throw new OutlookError('TOKEN_MISSING', 'Access token is missing');
    }
    
    // Vérifier l'expiration
    if (new Date() >= this.tokens.expiresOn) {
      throw new OutlookError('TOKEN_EXPIRED', 'Access token has expired');
    }
    
    return this.tokens.accessToken;
  }
  
  updateTokens(tokens: OutlookAuthTokens): void {
    this.tokens = tokens;
  }
}

/**
 * Interface pour les options de requête
 */
export interface GraphRequestOptions {
  skipCache?: boolean;
  cacheTTL?: number;
  timeout?: number;
  retryAttempts?: number;
  rateLimit?: boolean;
  batchable?: boolean;
  correlationId?: string;
}

/**
 * Interface pour les requêtes batch
 */
export interface BatchRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: any;
  headers?: Record<string, string>;
  options?: GraphRequestOptions;
}

/**
 * Interface pour les réponses batch
 */
export interface BatchResponse {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body: any;
}

/**
 * Client Microsoft Graph optimisé avec fonctionnalités avancées
 */
export class GraphAPIClient {
  private graphClient: Client;
  private authProvider: OutlookAuthProvider;
  private retryMechanism: RetryMechanism;
  private rateLimiter: RateLimiter;
  private cacheManager: CacheManager;
  private auditLogger: AuditLogger;
  
  private readonly config: OutlookConfig;
  private isInitialized = false;
  private requestCount = 0;
  private lastResetTime = Date.now();
  
  constructor(
    config: OutlookConfig,
    options: {
      retryMechanism: RetryMechanism;
      rateLimiter: RateLimiter;
      cacheManager: CacheManager;
      auditLogger: AuditLogger;
    }
  ) {
    this.config = config;
    this.retryMechanism = options.retryMechanism;
    this.rateLimiter = options.rateLimiter;
    this.cacheManager = options.cacheManager;
    this.auditLogger = options.auditLogger;
    
    // Initialisation avec des tokens vides (sera mis à jour lors de initialize)
    this.authProvider = new OutlookAuthProvider({
      accessToken: '',
      refreshToken: '',
      expiresOn: new Date(),
      scopes: [],
      tokenType: 'Bearer'
    });
  }
  
  /**
   * Initialise le client Graph avec les tokens d'authentification
   * @param tokens Tokens OAuth2
   */
  public async initialize(tokens: OutlookAuthTokens): Promise<void> {
    try {
      this.auditLogger.info('GraphAPIClient:Initialize', {
        tokenExpiry: tokens.expiresOn.toISOString(),
        scopes: tokens.scopes
      });
      
      // Mise à jour du provider d'authentification
      this.authProvider.updateTokens(tokens);
      
      // Configuration du client Graph
      this.graphClient = Client.initWithMiddleware({
        authProvider: this.authProvider,
        baseUrl: OUTLOOK_CONSTANTS.ENDPOINTS.GRAPH_API_BASE,
        defaultVersion: 'v1.0',
        debugLogging: process.env.NODE_ENV === 'development',
        middleware: {
          // Configuration des middlewares personnalisés si nécessaire
        }
      });
      
      this.isInitialized = true;
      
      this.auditLogger.info('GraphAPIClient:InitializeSuccess', {
        baseUrl: OUTLOOK_CONSTANTS.ENDPOINTS.GRAPH_API_BASE
      });
      
    } catch (error) {
      this.auditLogger.error('GraphAPIClient:InitializeError', error);
      throw new OutlookError(
        'GRAPH_CLIENT_INIT_ERROR',
        `Failed to initialize Graph API client: ${error.message}`,
        { error: error.message }
      );
    }
  }
  
  /**
   * Met à jour les tokens d'authentification
   * @param tokens Nouveaux tokens
   */
  public async updateTokens(tokens: OutlookAuthTokens): Promise<void> {
    this.authProvider.updateTokens(tokens);
    this.auditLogger.info('GraphAPIClient:TokensUpdated', {
      newExpiry: tokens.expiresOn.toISOString()
    });
  }
  
  /**
   * Crée une requête Graph API avec options avancées
   * @param endpoint Endpoint à appeler
   * @param options Options de requête
   */
  public api(endpoint: string, options: GraphRequestOptions = {}): EnhancedGraphRequest {
    this.ensureInitialized();
    
    const graphRequest = this.graphClient.api(endpoint);
    
    return new EnhancedGraphRequest(
      graphRequest,
      this,
      endpoint,
      options
    );
  }
  
  /**
   * Exécute une requête avec retry et rate limiting
   * @param request Requête à exécuter
   * @param options Options d'exécution
   */
  public async executeRequest<T>(
    request: () => Promise<T>,
    endpoint: string,
    options: GraphRequestOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    const correlationId = options.correlationId || this.generateCorrelationId();
    
    try {
      // Vérification du cache
      if (!options.skipCache) {
        const cached = await this.getCachedResponse<T>(endpoint, options);
        if (cached) {
          this.auditLogger.debug('GraphAPIClient:CacheHit', {
            endpoint,
            correlationId,
            duration: Date.now() - startTime
          });
          return cached;
        }
      }
      
      // Rate limiting
      if (options.rateLimit !== false) {
        await this.rateLimiter.waitIfNecessary();
      }
      
      // Exécution avec retry
      const response = await this.retryMechanism.executeWithRetry(
        request,
        `GraphAPI:${endpoint}`,
        options.retryAttempts
      );
      
      // Mise en cache
      if (!options.skipCache) {
        await this.cacheResponse(endpoint, response, options);
      }
      
      // Audit
      const duration = Date.now() - startTime;
      this.auditLogger.info('GraphAPIClient:RequestSuccess', {
        endpoint,
        correlationId,
        duration,
        cached: false
      });
      
      // Mise à jour des métriques
      this.updateRequestMetrics();
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Gestion spécifique des erreurs Graph
      const graphError = this.handleGraphError(error, endpoint);
      
      this.auditLogger.error('GraphAPIClient:RequestError', graphError, {
        endpoint,
        correlationId,
        duration
      });
      
      throw graphError;
    }
  }
  
  /**
   * Exécute plusieurs requêtes en batch
   * @param requests Requêtes à exécuter
   */
  public async batch(requests: BatchRequest[]): Promise<BatchResponse[]> {
    this.ensureInitialized();
    
    if (requests.length === 0) {
      return [];
    }
    
    if (requests.length > OUTLOOK_CONSTANTS.API_LIMITS.BATCH.MAX_REQUESTS) {
      throw new OutlookError(
        'BATCH_TOO_LARGE',
        `Batch size exceeds maximum of ${OUTLOOK_CONSTANTS.API_LIMITS.BATCH.MAX_REQUESTS} requests`
      );
    }
    
    const startTime = Date.now();
    
    try {
      this.auditLogger.info('GraphAPIClient:BatchStart', {
        requestCount: requests.length,
        requests: requests.map(r => ({ id: r.id, method: r.method, url: r.url }))
      });
      
      // Construction du batch
      const batchRequest = {
        requests: requests.map(req => ({
          id: req.id,
          method: req.method,
          url: req.url,
          body: req.body,
          headers: {
            'Content-Type': 'application/json',
            ...req.headers
          }
        }))
      };
      
      // Rate limiting pour batch
      await this.rateLimiter.waitIfNecessary();
      
      // Exécution du batch
      const response = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api('/$batch').post(batchRequest);
      }, 'GraphAPI:Batch');
      
      const batchResponses: BatchResponse[] = response.responses.map((res: any) => ({
        id: res.id,
        status: res.status,
        headers: res.headers,
        body: res.body
      }));
      
      const duration = Date.now() - startTime;
      const successCount = batchResponses.filter(r => r.status >= 200 && r.status < 300).length;
      
      this.auditLogger.info('GraphAPIClient:BatchSuccess', {
        requestCount: requests.length,
        successCount,
        duration
      });
      
      return batchResponses;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.auditLogger.error('GraphAPIClient:BatchError', error, {
        requestCount: requests.length,
        duration
      });
      
      throw this.handleGraphError(error, '/$batch');
    }
  }
  
  /**
   * Récupère les informations utilisateur
   */
  public async getUser(): Promise<any> {
    return await this.api('/me').get();
  }
  
  /**
   * Récupère un utilisateur spécifique
   * @param userId ID de l'utilisateur
   */
  public async getUserById(userId: string): Promise<any> {
    return await this.api(`/users/${userId}`).get();
  }
  
  /**
   * Teste la connectivité avec Microsoft Graph
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.api('/me', { skipCache: true, retryAttempts: 1 }).get();
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Obtient les statistiques d'utilisation du client
   */
  public getClientStatistics(): {
    requestCount: number;
    requestsPerMinute: number;
    isInitialized: boolean;
    lastResetTime: Date;
  } {
    const now = Date.now();
    const timeDiff = (now - this.lastResetTime) / (1000 * 60); // en minutes
    
    return {
      requestCount: this.requestCount,
      requestsPerMinute: timeDiff > 0 ? this.requestCount / timeDiff : 0,
      isInitialized: this.isInitialized,
      lastResetTime: new Date(this.lastResetTime)
    };
  }
  
  /**
   * Reset des statistiques
   */
  public resetStatistics(): void {
    this.requestCount = 0;
    this.lastResetTime = Date.now();
  }
  
  /**
   * Méthodes privées
   */
  
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new OutlookError(
        'GRAPH_CLIENT_NOT_INITIALIZED',
        'Graph API client must be initialized with tokens before use'
      );
    }
  }
  
  private async getCachedResponse<T>(endpoint: string, options: GraphRequestOptions): Promise<T | null> {
    try {
      const cacheKey = this.generateCacheKey(endpoint);
      return await this.cacheManager.get<T>(cacheKey);
    } catch {
      return null;
    }
  }
  
  private async cacheResponse(endpoint: string, response: any, options: GraphRequestOptions): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(endpoint);
      const ttl = options.cacheTTL || OUTLOOK_CONSTANTS.TIMEOUTS.CACHE.DEFAULT_TTL;
      await this.cacheManager.set(cacheKey, response, ttl);
    } catch (error) {
      // Ignorer les erreurs de cache pour ne pas impacter les requêtes
      this.auditLogger.warn('GraphAPIClient:CacheError', error);
    }
  }
  
  private generateCacheKey(endpoint: string): string {
    // Nettoyer l'endpoint pour créer une clé de cache stable
    const cleanEndpoint = endpoint.replace(/^\/+/, '').replace(/\/+$/, '');
    return `graph_api:${cleanEndpoint}`;
  }
  
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  private updateRequestMetrics(): void {
    this.requestCount++;
    
    // Reset des compteurs chaque heure
    const now = Date.now();
    if (now - this.lastResetTime > 3600000) { // 1 heure
      this.requestCount = 1;
      this.lastResetTime = now;
    }
  }
  
  private handleGraphError(error: any, endpoint: string): OutlookError {
    // Gestion spécifique des erreurs Microsoft Graph
    if (error.code) {
      switch (error.code) {
        case 'InvalidAuthenticationToken':
        case 'CompactToken_InvalidSignature':
        case 'ExpiredAuthenticationToken':
          return new OutlookError(
            'TOKEN_INVALID',
            'Authentication token is invalid or expired',
            { endpoint, originalError: error }
          );
          
        case 'Forbidden':
        case 'InsufficientPrivileges':
          return new OutlookError(
            'PERMISSION_DENIED',
            'Insufficient permissions for this operation',
            { endpoint, originalError: error }
          );
          
        case 'ThrottledRequest':
        case 'TooManyRequests':
          return new OutlookError(
            'RATE_LIMIT_EXCEEDED',
            'Rate limit exceeded',
            { endpoint, originalError: error, retryAfter: error.retryAfter }
          );
          
        case 'ServiceUnavailable':
        case 'InternalServerError':
          return new OutlookError(
            'SERVICE_UNAVAILABLE',
            'Microsoft Graph service is temporarily unavailable',
            { endpoint, originalError: error }
          );
          
        case 'NotFound':
        case 'ResourceNotFound':
          return new OutlookError(
            'RESOURCE_NOT_FOUND',
            'Requested resource not found',
            { endpoint, originalError: error }
          );
          
        case 'BadRequest':
        case 'InvalidRequest':
          return new OutlookError(
            'INVALID_REQUEST',
            'Invalid request parameters',
            { endpoint, originalError: error }
          );
          
        default:
          return new OutlookError(
            'GRAPH_API_ERROR',
            error.message || 'Microsoft Graph API error',
            { endpoint, originalError: error }
          );
      }
    }
    
    // Erreurs de réseau
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new OutlookError(
        'NETWORK_ERROR',
        'Network connection failed',
        { endpoint, originalError: error }
      );
    }
    
    // Timeout
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return new OutlookError(
        'REQUEST_TIMEOUT',
        'Request timeout',
        { endpoint, originalError: error }
      );
    }
    
    // Erreur générique
    return new OutlookError(
      'GRAPH_API_ERROR',
      error.message || 'Unknown Microsoft Graph API error',
      { endpoint, originalError: error }
    );
  }
}

/**
 * Classe pour les requêtes Graph étendues avec fonctionnalités avancées
 */
class EnhancedGraphRequest {
  constructor(
    private graphRequest: GraphRequest,
    private client: GraphAPIClient,
    private endpoint: string,
    private options: GraphRequestOptions
  ) {}
  
  // Méthodes GET
  async get<T>(): Promise<T> {
    return await this.client.executeRequest(
      () => this.graphRequest.get(),
      this.endpoint,
      this.options
    );
  }
  
  // Méthodes POST
  async post<T>(content?: any): Promise<T> {
    return await this.client.executeRequest(
      () => this.graphRequest.post(content),
      this.endpoint,
      { ...this.options, skipCache: true }
    );
  }
  
  // Méthodes PUT
  async put<T>(content: any): Promise<T> {
    return await this.client.executeRequest(
      () => this.graphRequest.put(content),
      this.endpoint,
      { ...this.options, skipCache: true }
    );
  }
  
  // Méthodes PATCH
  async patch<T>(content: any): Promise<T> {
    return await this.client.executeRequest(
      () => this.graphRequest.patch(content),
      this.endpoint,
      { ...this.options, skipCache: true }
    );
  }
  
  // Méthodes DELETE
  async delete<T>(): Promise<T> {
    return await this.client.executeRequest(
      () => this.graphRequest.delete(),
      this.endpoint,
      { ...this.options, skipCache: true }
    );
  }
  
  // Configuration de requête
  select(properties: string | string[]): EnhancedGraphRequest {
    const selectString = Array.isArray(properties) ? properties.join(',') : properties;
    this.graphRequest = this.graphRequest.select(selectString);
    return this;
  }
  
  expand(properties: string | string[]): EnhancedGraphRequest {
    const expandString = Array.isArray(properties) ? properties.join(',') : properties;
    this.graphRequest = this.graphRequest.expand(expandString);
    return this;
  }
  
  filter(filterString: string): EnhancedGraphRequest {
    this.graphRequest = this.graphRequest.filter(filterString);
    return this;
  }
  
  orderby(properties: string): EnhancedGraphRequest {
    this.graphRequest = this.graphRequest.orderby(properties);
    return this;
  }
  
  top(count: number): EnhancedGraphRequest {
    this.graphRequest = this.graphRequest.top(count);
    return this;
  }
  
  skip(count: number): EnhancedGraphRequest {
    this.graphRequest = this.graphRequest.skip(count);
    return this;
  }
  
  skipToken(token: string): EnhancedGraphRequest {
    this.graphRequest = this.graphRequest.skipToken(token);
    return this;
  }
  
  count(isCount?: boolean): EnhancedGraphRequest {
    this.graphRequest = this.graphRequest.count(isCount);
    return this;
  }
  
  search(searchString: string): EnhancedGraphRequest {
    this.graphRequest = this.graphRequest.search(searchString);
    return this;
  }
  
  header(headerKey: string, headerValue: string): EnhancedGraphRequest {
    this.graphRequest = this.graphRequest.header(headerKey, headerValue);
    return this;
  }
  
  headers(headers: Record<string, string>): EnhancedGraphRequest {
    this.graphRequest = this.graphRequest.headers(headers);
    return this;
  }
  
  responseType(responseType: ResponseType): EnhancedGraphRequest {
    this.graphRequest = this.graphRequest.responseType(responseType);
    return this;
  }
  
  middlewareOptions(options: any[]): EnhancedGraphRequest {
    this.graphRequest = this.graphRequest.middlewareOptions(options);
    return this;
  }
  
  // Configuration des options personnalisées
  skipCache(skip = true): EnhancedGraphRequest {
    this.options.skipCache = skip;
    return this;
  }
  
  cacheTTL(ttl: number): EnhancedGraphRequest {
    this.options.cacheTTL = ttl;
    return this;
  }
  
  timeout(ms: number): EnhancedGraphRequest {
    this.options.timeout = ms;
    return this;
  }
  
  retryAttempts(attempts: number): EnhancedGraphRequest {
    this.options.retryAttempts = attempts;
    return this;
  }
  
  correlationId(id: string): EnhancedGraphRequest {
    this.options.correlationId = id;
    return this;
  }
}

export default GraphAPIClient;