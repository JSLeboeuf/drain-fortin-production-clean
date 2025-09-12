import { createOAuthAppAuth } from '@octokit/auth-oauth-app';
import { logger } from '../utils/logger.js';

export class OAuthManager {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    this.redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/auth/github/callback';

    if (!this.clientId || !this.clientSecret) {
      logger.warn('GitHub OAuth credentials not configured. OAuth flow will not work.');
    }
  }

  getAuthorizationUrl(): string {
    if (!this.clientId) {
      throw new Error('GITHUB_CLIENT_ID not configured');
    }

    const baseUrl = 'https://github.com/login/oauth/authorize';
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'repo,user,read:org',
      state: this.generateState(),
      allow_signup: 'true'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('GitHub OAuth credentials not configured');
    }

    // Vérifier le state pour la sécurité
    if (!this.verifyState(state)) {
      throw new Error('Invalid OAuth state parameter');
    }

    try {
      const auth = createOAuthAppAuth({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });

      const { token } = await auth({
        type: 'oauth-user',
        code,
      });

      logger.info('GitHub OAuth token obtained successfully');
      return token;
    } catch (error) {
      logger.error('Error during OAuth callback:', error);
      throw new Error('Failed to obtain GitHub access token');
    }
  }

  private generateState(): string {
    // En production, utiliser une vraie génération de state sécurisée
    // avec stockage en session/cache
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private verifyState(state: string): boolean {
    // En production, vérifier contre le state stocké en session
    // Pour l'exemple, on accepte tous les states
    return state && state.length > 10;
  }

  async refreshToken(refreshToken: string): Promise<string> {
    // Implémentation pour rafraîchir les tokens si nécessaire
    // GitHub OAuth ne fournit pas de refresh tokens par défaut
    throw new Error('Token refresh not implemented for GitHub OAuth App');
  }

  getClientConfiguration() {
    return {
      clientId: this.clientId ? `${this.clientId.substring(0, 8)}...` : 'Not configured',
      redirectUri: this.redirectUri,
      scopes: ['repo', 'user', 'read:org']
    };
  }
}
