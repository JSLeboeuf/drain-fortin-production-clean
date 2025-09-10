/**
 * Centralized Environment Configuration
 * Validates and provides typed access to all environment variables
 */

class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: Record<string, string>;

  private constructor() {
    this.config = this.validateAndLoad();
  }

  private validateAndLoad(): Record<string, string> {
    const required = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_VAPI_PUBLIC_KEY',
      'VITE_VAPI_PRIVATE_KEY'
    ];

    const config: Record<string, string> = {};

    // Validate required variables
    for (const key of required) {
      const value = import.meta.env[key];
      if (!value) {
        console.error(`Missing required environment variable: ${key}`);
        // In production, throw error. In dev, use fallback
        if (import.meta.env.PROD) {
          throw new Error(`Missing required environment variable: ${key}`);
        }
      }
      config[key] = value || '';
    }

    // Optional variables with defaults
    config.VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    config.VITE_ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS || 'false';
    config.VITE_SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
    config.VITE_LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'error';

    return config;
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  public get(key: string): string {
    return this.config[key] || '';
  }

  public getBoolean(key: string): boolean {
    return this.config[key] === 'true';
  }

  public getNumber(key: string): number {
    return parseInt(this.config[key] || '0', 10);
  }

  // Typed getters for common configs
  public get supabaseUrl(): string {
    return this.get('VITE_SUPABASE_URL');
  }

  public get supabaseAnonKey(): string {
    return this.get('VITE_SUPABASE_ANON_KEY');
  }

  public get vapiPublicKey(): string {
    return this.get('VITE_VAPI_PUBLIC_KEY');
  }

  public get vapiPrivateKey(): string {
    return this.get('VITE_VAPI_PRIVATE_KEY');
  }

  public get apiBaseUrl(): string {
    return this.get('VITE_API_BASE_URL');
  }

  public get enableAnalytics(): boolean {
    return this.getBoolean('VITE_ENABLE_ANALYTICS');
  }

  public get sentryDsn(): string {
    return this.get('VITE_SENTRY_DSN');
  }

  public get logLevel(): string {
    return this.get('VITE_LOG_LEVEL');
  }

  public get isDevelopment(): boolean {
    return import.meta.env.DEV;
  }

  public get isProduction(): boolean {
    return import.meta.env.PROD;
  }
}

// Export singleton instance
export const env = EnvironmentConfig.getInstance();

// Type-safe environment access
export type EnvConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  vapiPublicKey: string;
  vapiPrivateKey: string;
  apiBaseUrl: string;
  enableAnalytics: boolean;
  sentryDsn: string;
  logLevel: string;
  isDevelopment: boolean;
  isProduction: boolean;
};