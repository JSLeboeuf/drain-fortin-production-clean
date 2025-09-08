/**
 * Structured logging utility for production-ready applications
 * Provides consistent logging with different levels and environments
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
  error?: Error | string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  context?: string;
}

class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 100;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: this.getEnvironmentLogLevel(),
      enableConsole: import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
      enableRemote: import.meta.env.PROD,
      remoteEndpoint: import.meta.env.VITE_LOG_ENDPOINT,
      ...config
    };
  }

  private getEnvironmentLogLevel(): LogLevel {
    if (import.meta.env.PROD) return LogLevel.WARN;
    if (import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true') return LogLevel.DEBUG;
    return LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const context = entry.context || this.config.context || 'App';
    return `[${entry.timestamp}] [${levelName}] [${context}] ${entry.message}`;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    data?: any,
    error?: Error | string
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.config.context,
      data,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      requestId: this.getRequestId()
    };
  }

  private getUserId(): string | undefined {
    // Get from auth context or localStorage
    try {
      return localStorage.getItem('userId') || undefined;
    } catch {
      return undefined;
    }
  }

  private getSessionId(): string | undefined {
    // Get or generate session ID
    try {
      let sessionId = sessionStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('sessionId', sessionId);
      }
      return sessionId;
    } catch {
      return undefined;
    }
  }

  private getRequestId(): string | undefined {
    // Generate unique request ID for tracing
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const formattedMessage = this.formatMessage(entry);
    const consoleData = entry.data || entry.error ? { data: entry.data, error: entry.error } : undefined;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, consoleData);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, consoleData);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, consoleData);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formattedMessage, consoleData);
        break;
    }
  }

  private async sendToRemote(entries: LogEntry[]): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Log-Source': 'frontend'
        },
        body: JSON.stringify({ logs: entries })
      });
    } catch (error) {
      // Silently fail to avoid infinite loop
      if (this.config.enableConsole) {
        console.error('Failed to send logs to remote:', error);
      }
    }
  }

  private bufferEntry(entry: LogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush();
    }
  }

  public flush(): void {
    if (this.buffer.length === 0) return;
    
    const entriesToSend = [...this.buffer];
    this.buffer = [];
    
    this.sendToRemote(entriesToSend);
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error | string): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createEntry(level, message, data, error);
    
    this.writeToConsole(entry);
    this.bufferEntry(entry);

    // Immediate send for critical errors
    if (level === LogLevel.CRITICAL) {
      this.flush();
    }
  }

  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, error?: Error | string | any, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  public critical(message: string, error?: Error | string, data?: any): void {
    this.log(LogLevel.CRITICAL, message, data, error);
    
    // For critical errors, also report to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error || new Error(message), {
        level: 'fatal',
        extra: data
      });
    }
  }

  public setContext(context: string): void {
    this.config.context = context;
  }

  public setUserId(userId: string): void {
    try {
      localStorage.setItem('userId', userId);
    } catch {
      // Ignore if localStorage is not available
    }
  }

  public performance(operation: string, duration: number, metadata?: any): void {
    this.info(`Performance: ${operation}`, {
      duration,
      operation,
      ...metadata
    });
  }

  public metric(name: string, value: number, unit?: string, metadata?: any): void {
    this.info(`Metric: ${name}`, {
      metric: name,
      value,
      unit,
      ...metadata
    });
  }
}

// Create default logger instance
export const logger = new Logger();

// Export factory function for creating context-specific loggers
export function createLogger(context: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger({ ...config, context });
}

// Auto-flush logs on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logger.flush();
  });

  // Periodic flush every 30 seconds
  setInterval(() => {
    logger.flush();
  }, 30000);
}

// Export types
export type { LogEntry, LoggerConfig };