export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  meta?: any;
}

export class Logger {
  private logs: LogEntry[] = [];

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: any) {
    this.log('error', message, meta);
  }

  private log(level: 'info' | 'warn' | 'error', message: string, meta?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta
    };

    this.logs.push(entry);

    // Garder seulement les 1000 derniers logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // Afficher dans la console avec le niveau approprié
    const prefix = `[${entry.timestamp}] ${level.toUpperCase()}`;
    const output = meta ? `${prefix} ${message} ${JSON.stringify(meta)}` : `${prefix} ${message}`;

    switch (level) {
      case 'info':
        console.log(`ℹ️ ${output}`);
        break;
      case 'warn':
        console.warn(`⚠️ ${output}`);
        break;
      case 'error':
        console.error(`❌ ${output}`);
        break;
    }
  }

  getLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsByLevel(level: 'info' | 'warn' | 'error', limit: number = 100): LogEntry[] {
    return this.logs.filter(log => log.level === level).slice(-limit);
  }

  clearLogs() {
    this.logs = [];
  }
}

// Instance globale du logger
export const logger = new Logger();
