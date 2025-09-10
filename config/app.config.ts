/**
 * Centralized Application Configuration
 * All environment variables and configuration settings in one place
 */

export interface AppConfig {
  supabase: {
    url: string
    anonKey: string
    serviceKey?: string
  }
  vapi: {
    apiKey: string
    webhookSecret: string
    assistantId: string
    phoneNumber: string
    publicKey?: string
  }
  twilio: {
    accountSid: string
    authToken: string
    phoneNumber: string
    fromNumber: string
    smsAlertsTo: string[]
    alertFallbackTo?: string
  }
  outlook: {
    clientId?: string
    clientSecret?: string
    tenantId?: string
    redirectUri?: string
  }
  app: {
    environment: 'development' | 'staging' | 'production'
    url: string
    apiUrl: string
    wsUrl?: string
    allowedOrigins: string[]
  }
  monitoring: {
    sentryDsn?: string
    enableSentry: boolean
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
  security: {
    jwtSecret?: string
    encryptionKey?: string
    sessionTimeout: number
    maxLoginAttempts: number
  }
  features: {
    enableOutlook: boolean
    enableSMS: boolean
    enableWebsocket: boolean
    enableAnalytics: boolean
  }
}

class ConfigurationManager {
  private config: AppConfig | null = null
  private validated: boolean = false

  /**
   * Load configuration from environment variables
   */
  load(): AppConfig {
    if (this.config && this.validated) {
      return this.config
    }

    const env = process.env.NODE_ENV || 'development'
    const isDev = env === 'development'
    const isProd = env === 'production'

    this.config = {
      supabase: {
        url: this.getRequired('VITE_SUPABASE_URL', 'SUPABASE_URL'),
        anonKey: this.getRequired('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'),
        serviceKey: this.getOptional('SUPABASE_SERVICE_ROLE_KEY')
      },
      vapi: {
        apiKey: this.getRequired('VAPI_API_KEY'),
        webhookSecret: this.getRequired('VAPI_WEBHOOK_SECRET'),
        assistantId: this.getRequired('VAPI_ASSISTANT_ID'),
        phoneNumber: this.getRequired('VAPI_PHONE_NUMBER'),
        publicKey: this.getOptional('VAPI_PUBLIC_KEY')
      },
      twilio: {
        accountSid: this.getRequired('TWILIO_ACCOUNT_SID'),
        authToken: this.getRequired('TWILIO_AUTH_TOKEN'),
        phoneNumber: this.getRequired('TWILIO_PHONE_NUMBER'),
        fromNumber: this.getRequired('TWILIO_FROM'),
        smsAlertsTo: this.getList('TWILIO_SMS_ALERTS_TO'),
        alertFallbackTo: this.getOptional('TWILIO_ALERT_FALLBACK_TO')
      },
      outlook: {
        clientId: this.getOptional('OUTLOOK_CLIENT_ID'),
        clientSecret: this.getOptional('OUTLOOK_CLIENT_SECRET'),
        tenantId: this.getOptional('OUTLOOK_TENANT_ID'),
        redirectUri: this.getOptional('OUTLOOK_REDIRECT_URI')
      },
      app: {
        environment: env as 'development' | 'staging' | 'production',
        url: this.getOptional('APP_URL') || (isDev ? 'http://localhost:5173' : 'https://drainfortin.com'),
        apiUrl: this.getOptional('API_URL') || this.getRequired('VITE_SUPABASE_URL') + '/functions/v1',
        wsUrl: this.getOptional('VITE_WS_URL'),
        allowedOrigins: this.getList('ALLOWED_ORIGINS', isDev 
          ? ['http://localhost:3000', 'http://localhost:5173']
          : ['https://drainfortin.com', 'https://www.drainfortin.com'])
      },
      monitoring: {
        sentryDsn: this.getOptional('VITE_SENTRY_DSN'),
        enableSentry: isProd || this.getBoolean('VITE_ENABLE_SENTRY'),
        logLevel: this.getOptional('LOG_LEVEL') as any || (isDev ? 'debug' : 'info')
      },
      security: {
        jwtSecret: this.getOptional('JWT_SECRET'),
        encryptionKey: this.getOptional('ENCRYPTION_KEY'),
        sessionTimeout: this.getNumber('SESSION_TIMEOUT', 3600),
        maxLoginAttempts: this.getNumber('MAX_LOGIN_ATTEMPTS', 5)
      },
      features: {
        enableOutlook: this.getBoolean('ENABLE_OUTLOOK', true),
        enableSMS: this.getBoolean('ENABLE_SMS', true),
        enableWebsocket: this.getBoolean('ENABLE_WEBSOCKET', true),
        enableAnalytics: this.getBoolean('ENABLE_ANALYTICS', isProd)
      }
    }

    this.validate()
    return this.config
  }

  /**
   * Validate configuration
   */
  private validate(): void {
    const errors: string[] = []

    // Check required fields based on features
    if (this.config!.features.enableOutlook) {
      if (!this.config!.outlook.clientId) {
        errors.push('Outlook is enabled but OUTLOOK_CLIENT_ID is missing')
      }
    }

    if (this.config!.features.enableSMS) {
      if (!this.config!.twilio.accountSid || !this.config!.twilio.authToken) {
        errors.push('SMS is enabled but Twilio credentials are missing')
      }
    }

    // Validate URLs
    const urlPattern = /^https?:\/\/.+/
    if (!urlPattern.test(this.config!.supabase.url)) {
      errors.push('Invalid SUPABASE_URL format')
    }

    // Validate phone numbers
    const phonePattern = /^\+\d{10,15}$/
    if (!phonePattern.test(this.config!.vapi.phoneNumber)) {
      errors.push('Invalid VAPI_PHONE_NUMBER format (must be E.164 format)')
    }

    // Check for production requirements
    if (this.config!.app.environment === 'production') {
      if (!this.config!.security.jwtSecret) {
        errors.push('JWT_SECRET is required in production')
      }
      if (!this.config!.monitoring.sentryDsn) {
        console.warn('Warning: Sentry DSN not configured for production')
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`)
    }

    this.validated = true
  }

  /**
   * Helper methods for getting environment variables
   */
  private getRequired(...keys: string[]): string {
    for (const key of keys) {
      const value = process.env[key]
      if (value !== undefined && value !== '') {
        return value
      }
    }
    throw new Error(`Missing required environment variable: ${keys.join(' or ')}`)
  }

  private getOptional(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue
  }

  private getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = process.env[key]
    if (value === undefined) return defaultValue
    return value.toLowerCase() === 'true' || value === '1'
  }

  private getNumber(key: string, defaultValue: number): number {
    const value = process.env[key]
    if (!value) return defaultValue
    const num = parseInt(value, 10)
    if (isNaN(num)) {
      throw new Error(`Invalid number for ${key}: ${value}`)
    }
    return num
  }

  private getList(key: string, defaultValue: string[] = []): string[] {
    const value = process.env[key]
    if (!value) return defaultValue
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0)
  }

  /**
   * Get a specific configuration value
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    if (!this.config) {
      this.load()
    }
    return this.config![key]
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    if (!this.config) {
      this.load()
    }
    return this.config!.features[feature]
  }

  /**
   * Get the current environment
   */
  getEnvironment(): 'development' | 'staging' | 'production' {
    if (!this.config) {
      this.load()
    }
    return this.config!.app.environment
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.getEnvironment() === 'production'
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.getEnvironment() === 'development'
  }

  /**
   * Export configuration for client-side use (filtered)
   */
  getPublicConfig(): Partial<AppConfig> {
    if (!this.config) {
      this.load()
    }

    // Only expose safe values to client
    return {
      supabase: {
        url: this.config!.supabase.url,
        anonKey: this.config!.supabase.anonKey
      },
      vapi: {
        publicKey: this.config!.vapi.publicKey,
        phoneNumber: this.config!.vapi.phoneNumber,
        assistantId: this.config!.vapi.assistantId,
        apiKey: '', // Never expose
        webhookSecret: '' // Never expose
      },
      app: {
        environment: this.config!.app.environment,
        url: this.config!.app.url,
        apiUrl: this.config!.app.apiUrl,
        wsUrl: this.config!.app.wsUrl,
        allowedOrigins: []
      },
      monitoring: {
        sentryDsn: this.config!.monitoring.sentryDsn,
        enableSentry: this.config!.monitoring.enableSentry,
        logLevel: this.config!.monitoring.logLevel
      },
      features: this.config!.features
    }
  }
}

// Export singleton instance
export const config = new ConfigurationManager()

// Export convenience functions
export const getConfig = () => config.load()
export const validateConfig = () => {
  try {
    config.load()
    console.log('✅ Configuration validated successfully')
    return true
  } catch (error) {
    console.error('❌ Configuration validation failed:', error)
    return false
  }
}

// Auto-validate in development
if (process.env.NODE_ENV === 'development') {
  try {
    config.load()
  } catch (error) {
    console.error('Configuration error:', error)
  }
}

export default config