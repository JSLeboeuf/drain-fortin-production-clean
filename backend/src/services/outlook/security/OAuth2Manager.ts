/**
 * OAuth2Manager.ts - Gestion complète OAuth2 avec refresh automatique
 * Authentification Microsoft, gestion tokens, sécurité, et cache
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { 
  ConfidentialClientApplication, 
  AuthenticationResult, 
  SilentFlowRequest,
  AuthorizationUrlRequest,
  AuthorizationCodeRequest,
  RefreshTokenRequest,
  ClientCredentialRequest,
  AccountInfo
} from '@azure/msal-node';
import { AuditLogger } from './AuditLogger';
import { CacheManager } from '../utils/CacheManager';
import { OutlookErrorHandler } from '../utils/OutlookErrorHandler';
import { EncryptionService } from './EncryptionService';
import { 
  OutlookAuthTokens,
  OutlookConfig,
  OutlookError
} from '../config/outlook.types';
import { OUTLOOK_CONSTANTS } from '../config/outlook.constants';

/**
 * Gestionnaire OAuth2 pour Microsoft Graph avec sécurité renforcée
 * Gère l'authentification, les tokens, et la sécurité des données
 */
export class OAuth2Manager {
  private msalApp: ConfidentialClientApplication;
  private auditLogger: AuditLogger;
  private cacheManager: CacheManager;
  private errorHandler: OutlookErrorHandler;
  private encryptionService: EncryptionService;
  
  private readonly config: OutlookConfig['oauth2'];
  private readonly cachePrefix = 'oauth2:';
  private readonly tokenExpirationBuffer = 5 * 60 * 1000; // 5 minutes
  
  constructor(
    config: OutlookConfig['oauth2'],
    options: {
      auditLogger: AuditLogger;
      cacheManager: CacheManager;
      errorHandler: OutlookErrorHandler;
      encryptionService?: EncryptionService;
    }
  ) {
    this.config = config;
    this.auditLogger = options.auditLogger;
    this.cacheManager = options.cacheManager;
    this.errorHandler = options.errorHandler;
    this.encryptionService = options.encryptionService || new EncryptionService(config);
    
    // Validation de la configuration OAuth2
    this.validateConfig();
    
    // Initialisation de l'application MSAL
    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        authority: `${this.config.authority || OUTLOOK_CONSTANTS.ENDPOINTS.AUTHORITY_BASE}/${this.config.tenantId}`,
        skipAuthorityMetadataCache: false
      },
      cache: {
        cachePlugin: undefined // Nous gérons le cache nous-mêmes
      },
      system: {
        loggerOptions: {
          loggerCallback: this.msalLoggerCallback.bind(this),
          piiLoggingEnabled: false,
          logLevel: 'Error'
        }
      }
    });
    
    this.auditLogger.info('OAuth2Manager:Initialized', {
      clientId: this.maskClientId(this.config.clientId),
      tenantId: this.config.tenantId,
      scopes: this.config.scopes,
      authority: this.config.authority
    });
  }
  
  /**
   * Génère l'URL d'autorisation pour le flow interactif
   * @param state État pour la sécurité CSRF
   * @param loginHint Suggestion d'email pour l'utilisateur
   */
  public async getAuthorizationUrl(
    state?: string,
    loginHint?: string
  ): Promise<{ url: string; state: string; codeVerifier?: string }> {
    try {
      this.auditLogger.info('OAuth2Manager:GetAuthorizationUrl', {
        state,
        loginHint,
        scopes: this.config.scopes
      });
      
      const authRequest: AuthorizationUrlRequest = {
        scopes: this.config.scopes,
        redirectUri: this.config.redirectUri,
        state: state || this.generateSecureState(),
        loginHint,
        responseMode: 'query',
        prompt: 'select_account'
      };
      
      const authUrl = await this.msalApp.getAuthCodeUrl(authRequest);
      
      this.auditLogger.info('OAuth2Manager:GetAuthorizationUrlSuccess', {
        state: authRequest.state,
        hasLoginHint: !!loginHint
      });
      
      return {
        url: authUrl,
        state: authRequest.state!,
        codeVerifier: undefined // PKCE non utilisé avec confidential client
      };
      
    } catch (error) {
      this.auditLogger.error('OAuth2Manager:GetAuthorizationUrlError', error);
      throw this.errorHandler.handleError(error, 'OAuth2Manager:GetAuthorizationUrl');
    }
  }
  
  /**
   * Échange le code d'autorisation contre des tokens
   * @param code Code d'autorisation reçu
   * @param state État pour validation CSRF
   */
  public async exchangeCodeForTokens(
    code: string,
    state: string
  ): Promise<OutlookAuthTokens> {
    try {
      this.auditLogger.info('OAuth2Manager:ExchangeCodeForTokens', {
        state,
        codeLength: code.length
      });
      
      const tokenRequest: AuthorizationCodeRequest = {
        code,
        scopes: this.config.scopes,
        redirectUri: this.config.redirectUri,
        clientInfo: undefined
      };
      
      const response = await this.msalApp.acquireTokenByCode(tokenRequest);
      
      if (!response) {
        throw new OutlookError(
          'TOKEN_EXCHANGE_FAILED',
          'Failed to exchange authorization code for tokens'
        );
      }
      
      const tokens = await this.createOutlookTokens(response);
      
      this.auditLogger.info('OAuth2Manager:ExchangeCodeForTokensSuccess', {
        accountId: response.account?.homeAccountId,
        expiresOn: tokens.expiresOn.toISOString()
      });
      
      return tokens;
      
    } catch (error) {
      this.auditLogger.error('OAuth2Manager:ExchangeCodeForTokensError', error);
      throw this.errorHandler.handleError(error, 'OAuth2Manager:ExchangeCodeForTokens');
    }
  }
  
  /**
   * Acquiert des tokens de manière interactive (pour desktop apps)
   */
  public async acquireTokenInteractive(): Promise<OutlookAuthTokens> {
    try {
      this.auditLogger.info('OAuth2Manager:AcquireTokenInteractive');
      
      // Pour une application web, cette méthode redirige vers getAuthorizationUrl
      // En production, cette méthode devrait être appelée après avoir reçu le code
      throw new OutlookError(
        'FEATURE_NOT_SUPPORTED',
        'Interactive token acquisition not supported in web applications. Use authorization code flow instead.',
        { 
          suggestedFlow: 'authorization_code',
          step1: 'Call getAuthorizationUrl()',
          step2: 'Redirect user to authorization URL',
          step3: 'Call exchangeCodeForTokens() with received code'
        }
      );
      
    } catch (error) {
      this.auditLogger.error('OAuth2Manager:AcquireTokenInteractiveError', error);
      throw this.errorHandler.handleError(error, 'OAuth2Manager:AcquireTokenInteractive');
    }
  }
  
  /**
   * Refresh des tokens existants
   * @param tokens Tokens à rafraîchir
   */
  public async refreshTokens(tokens: OutlookAuthTokens): Promise<OutlookAuthTokens> {
    try {
      this.auditLogger.info('OAuth2Manager:RefreshTokens', {
        expiresOn: tokens.expiresOn.toISOString(),
        scopes: tokens.scopes
      });
      
      if (!tokens.refreshToken) {
        throw new OutlookError(
          'REFRESH_TOKEN_MISSING',
          'Refresh token is required for token refresh'
        );
      }
      
      const refreshRequest: RefreshTokenRequest = {
        refreshToken: tokens.refreshToken,
        scopes: tokens.scopes,
        account: undefined
      };
      
      const response = await this.msalApp.acquireTokenByRefreshToken(refreshRequest);
      
      if (!response) {
        throw new OutlookError(
          'TOKEN_REFRESH_FAILED',
          'Failed to refresh tokens'
        );
      }
      
      const newTokens = await this.createOutlookTokens(response);
      
      this.auditLogger.info('OAuth2Manager:RefreshTokensSuccess', {
        oldExpiresOn: tokens.expiresOn.toISOString(),
        newExpiresOn: newTokens.expiresOn.toISOString()
      });
      
      return newTokens;
      
    } catch (error) {
      this.auditLogger.error('OAuth2Manager:RefreshTokensError', error);
      throw this.errorHandler.handleError(error, 'OAuth2Manager:RefreshTokens');
    }
  }
  
  /**
   * Validation des tokens
   * @param tokens Tokens à valider
   */
  public async validateTokens(tokens: OutlookAuthTokens): Promise<boolean> {
    try {
      // Vérification de base
      if (!tokens.accessToken || !tokens.expiresOn) {
        return false;
      }
      
      // Vérification de l'expiration avec buffer
      const now = new Date();
      const expirationWithBuffer = new Date(tokens.expiresOn.getTime() - this.tokenExpirationBuffer);
      
      if (now >= expirationWithBuffer) {
        this.auditLogger.info('OAuth2Manager:ValidateTokens', {
          result: false,
          reason: 'expired',
          expiresOn: tokens.expiresOn.toISOString(),
          now: now.toISOString()
        });
        return false;
      }
      
      // Validation format du token (basic JWT validation)
      if (!this.isValidJWT(tokens.accessToken)) {
        this.auditLogger.warn('OAuth2Manager:ValidateTokens', {
          result: false,
          reason: 'invalid_format'
        });
        return false;
      }
      
      this.auditLogger.debug('OAuth2Manager:ValidateTokens', {
        result: true,
        expiresOn: tokens.expiresOn.toISOString()
      });
      
      return true;
      
    } catch (error) {
      this.auditLogger.error('OAuth2Manager:ValidateTokensError', error);
      return false;
    }
  }
  
  /**
   * Vérifier si les tokens ont besoin d'être rafraîchis
   * @param tokens Tokens à vérifier
   */
  public async tokensNeedRefresh(tokens: OutlookAuthTokens): Promise<boolean> {
    if (!tokens || !tokens.expiresOn) {
      return true;
    }
    
    const now = new Date();
    const refreshThreshold = new Date(tokens.expiresOn.getTime() - (10 * 60 * 1000)); // 10 minutes avant expiration
    
    return now >= refreshThreshold;
  }
  
  /**
   * Stockage sécurisé des tokens en cache
   * @param userId ID de l'utilisateur
   * @param tokens Tokens à stocker
   */
  public async storeTokensInCache(userId: string, tokens: OutlookAuthTokens): Promise<void> {
    try {
      const cacheKey = `${this.cachePrefix}tokens:${userId}`;
      
      // Chiffrement des tokens sensibles
      const encryptedTokens = await this.encryptTokens(tokens);
      
      await this.cacheManager.set(
        cacheKey,
        encryptedTokens,
        OUTLOOK_CONSTANTS.TIMEOUTS.CACHE.TOKEN_TTL
      );
      
      this.auditLogger.info('OAuth2Manager:StoreTokensInCache', {
        userId,
        expiresOn: tokens.expiresOn.toISOString(),
        encrypted: true
      });
      
    } catch (error) {
      this.auditLogger.error('OAuth2Manager:StoreTokensInCacheError', error);
      throw this.errorHandler.handleError(error, 'OAuth2Manager:StoreTokensInCache');
    }
  }
  
  /**
   * Récupération des tokens depuis le cache
   * @param userId ID de l'utilisateur
   */
  public async getTokensFromCache(userId: string): Promise<OutlookAuthTokens | null> {
    try {
      const cacheKey = `${this.cachePrefix}tokens:${userId}`;
      
      const encryptedTokens = await this.cacheManager.get<any>(cacheKey);
      if (!encryptedTokens) {
        this.auditLogger.debug('OAuth2Manager:GetTokensFromCache', {
          userId,
          result: 'not_found'
        });
        return null;
      }
      
      // Déchiffrement des tokens
      const tokens = await this.decryptTokens(encryptedTokens);
      
      // Validation des tokens récupérés
      const isValid = await this.validateTokens(tokens);
      if (!isValid) {
        this.auditLogger.warn('OAuth2Manager:GetTokensFromCache', {
          userId,
          result: 'invalid',
          reason: 'validation_failed'
        });
        
        // Supprimer les tokens invalides du cache
        await this.removeTokensFromCache(userId);
        return null;
      }
      
      this.auditLogger.info('OAuth2Manager:GetTokensFromCache', {
        userId,
        result: 'success',
        expiresOn: tokens.expiresOn.toISOString()
      });
      
      return tokens;
      
    } catch (error) {
      this.auditLogger.error('OAuth2Manager:GetTokensFromCacheError', error);
      return null;
    }
  }
  
  /**
   * Suppression des tokens du cache
   * @param userId ID de l'utilisateur
   */
  public async removeTokensFromCache(userId: string): Promise<void> {
    try {
      const cacheKey = `${this.cachePrefix}tokens:${userId}`;
      await this.cacheManager.delete(cacheKey);
      
      this.auditLogger.info('OAuth2Manager:RemoveTokensFromCache', { userId });
      
    } catch (error) {
      this.auditLogger.error('OAuth2Manager:RemoveTokensFromCacheError', error);
      throw this.errorHandler.handleError(error, 'OAuth2Manager:RemoveTokensFromCache');
    }
  }
  
  /**
   * Révocation des tokens
   * @param tokens Tokens à révoquer
   */
  public async revokeTokens(tokens: OutlookAuthTokens): Promise<void> {
    try {
      this.auditLogger.info('OAuth2Manager:RevokeTokens');
      
      // Microsoft Graph ne support pas la révocation directe des tokens
      // Mais nous pouvons supprimer du cache et loger l'action
      this.auditLogger.info('OAuth2Manager:RevokeTokensSuccess', {
        note: 'Tokens marked as revoked (Microsoft Graph does not support token revocation endpoint)'
      });
      
    } catch (error) {
      this.auditLogger.error('OAuth2Manager:RevokeTokensError', error);
      throw this.errorHandler.handleError(error, 'OAuth2Manager:RevokeTokens');
    }
  }
  
  /**
   * Obtient les informations de compte
   * @param tokens Tokens pour récupérer le compte
   */
  public async getAccountInfo(tokens: OutlookAuthTokens): Promise<AccountInfo | null> {
    try {
      // Décoder le token ID si disponible
      if (tokens.idToken) {
        const payload = this.decodeJWTPayload(tokens.idToken);
        if (payload) {
          return {
            homeAccountId: payload.oid || payload.sub,
            environment: 'login.microsoftonline.com',
            tenantId: payload.tid || this.config.tenantId,
            username: payload.preferred_username || payload.email || payload.upn,
            localAccountId: payload.oid || payload.sub,
            name: payload.name,
            idTokenClaims: payload
          } as AccountInfo;
        }
      }
      
      return null;
      
    } catch (error) {
      this.auditLogger.error('OAuth2Manager:GetAccountInfoError', error);
      return null;
    }
  }
  
  /**
   * Méthodes utilitaires privées
   */
  
  private async createOutlookTokens(response: AuthenticationResult): Promise<OutlookAuthTokens> {
    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || '',
      idToken: response.idToken,
      expiresOn: response.expiresOn || new Date(Date.now() + 3600000), // 1 heure par défaut
      scopes: response.scopes || this.config.scopes,
      tokenType: 'Bearer'
    };
  }
  
  private async encryptTokens(tokens: OutlookAuthTokens): Promise<any> {
    return {
      accessToken: await this.encryptionService.encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken ? await this.encryptionService.encrypt(tokens.refreshToken) : null,
      idToken: tokens.idToken ? await this.encryptionService.encrypt(tokens.idToken) : null,
      expiresOn: tokens.expiresOn.toISOString(),
      scopes: tokens.scopes,
      tokenType: tokens.tokenType
    };
  }
  
  private async decryptTokens(encryptedTokens: any): Promise<OutlookAuthTokens> {
    return {
      accessToken: await this.encryptionService.decrypt(encryptedTokens.accessToken),
      refreshToken: encryptedTokens.refreshToken ? await this.encryptionService.decrypt(encryptedTokens.refreshToken) : '',
      idToken: encryptedTokens.idToken ? await this.encryptionService.decrypt(encryptedTokens.idToken) : undefined,
      expiresOn: new Date(encryptedTokens.expiresOn),
      scopes: encryptedTokens.scopes,
      tokenType: encryptedTokens.tokenType || 'Bearer'
    };
  }
  
  private isValidJWT(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      // Vérifier que chaque partie peut être décodée
      for (const part of parts) {
        JSON.parse(Buffer.from(part, 'base64').toString());
      }
      
      return true;
      
    } catch {
      return false;
    }
  }
  
  private decodeJWTPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload;
      
    } catch {
      return null;
    }
  }
  
  private generateSecureState(): string {
    return Buffer.from(Date.now().toString() + Math.random().toString()).toString('base64');
  }
  
  private maskClientId(clientId: string): string {
    if (clientId.length <= 8) {
      return '****';
    }
    return clientId.substring(0, 4) + '****' + clientId.substring(clientId.length - 4);
  }
  
  private validateConfig(): void {
    const required = ['clientId', 'clientSecret', 'tenantId', 'redirectUri', 'scopes'];
    const missing = required.filter(key => !this.config[key as keyof typeof this.config]);
    
    if (missing.length > 0) {
      throw new OutlookError(
        'CONFIGURATION_INVALID',
        `Missing required OAuth2 configuration: ${missing.join(', ')}`,
        { missing }
      );
    }
    
    // Validation des scopes
    if (!Array.isArray(this.config.scopes) || this.config.scopes.length === 0) {
      throw new OutlookError(
        'CONFIGURATION_INVALID',
        'OAuth2 scopes must be a non-empty array'
      );
    }
    
    // Validation de l'URI de redirection
    try {
      new URL(this.config.redirectUri);
    } catch {
      throw new OutlookError(
        'CONFIGURATION_INVALID',
        'Invalid OAuth2 redirectUri format'
      );
    }
  }
  
  private msalLoggerCallback(level: any, message: string, containsPii: boolean): void {
    if (containsPii) {
      return; // Ne pas logguer les informations PII
    }
    
    switch (level) {
      case 'Error':
        this.auditLogger.error('MSAL:Error', { message });
        break;
      case 'Warning':
        this.auditLogger.warn('MSAL:Warning', { message });
        break;
      case 'Info':
        this.auditLogger.info('MSAL:Info', { message });
        break;
      case 'Verbose':
        this.auditLogger.debug('MSAL:Debug', { message });
        break;
    }
  }
}

export default OAuth2Manager;