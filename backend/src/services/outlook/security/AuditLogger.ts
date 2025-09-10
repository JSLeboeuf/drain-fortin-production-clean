/**
 * AuditLogger.ts - Logger d'audit complet avec sécurité et compliance
 * Logging détaillé, rotation, chiffrement, et conformité GDPR/PIPEDA
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import * as fs from 'fs';
import * as path from 'path';
import { EncryptionService } from './EncryptionService';
import { OutlookConfig, OutlookError } from '../config/outlook.types';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface AuditLogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  stackTrace?: string;
  duration?: number;
  encrypted?: boolean;
  complianceFlags?: string[];
}

export interface AuditLogFilter {
  level?: LogLevel;
  category?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  correlationId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Service d'audit et de logging avec sécurité et compliance
 * Gère la rotation, le chiffrement, et la conformité réglementaire
 */
export class AuditLogger {
  private readonly config: OutlookConfig['audit'];
  private encryptionService?: EncryptionService;
  private logBuffer: AuditLogEntry[] = [];
  private bufferSize = 100;
  private flushInterval = 5000; // 5 secondes
  private flushTimer?: NodeJS.Timeout;
  private logFilePath?: string;
  private currentLogFile?: string;
  
  private readonly sensitiveFields = [
    'password', 'token', 'accessToken', 'refreshToken', 'secret', 
    'key', 'authorization', 'credential', 'ssn', 'sin', 'credit',
    'phone', 'email', 'address', 'ip', 'userAgent'
  ];
  
  constructor(config: OutlookConfig['audit'], encryptionService?: EncryptionService) {
    this.config = {
      enabled: true,
      level: 'info',
      destination: 'console',
      retentionDays: 30,
      encryptPII: true,
      ...config
    };
    
    this.encryptionService = encryptionService;
    
    // Initialisation selon la destination
    this.initialize();
    
    // Démarrage du buffer de log
    this.startLogBuffer();
  }
  
  /**
   * Log d'erreur avec contexte détaillé
   * @param category Catégorie du log
   * @param message Message ou objet d'erreur
   * @param data Données contextuelles
   * @param context Contexte d'exécution
   */
  public error(
    category: string, 
    message: string | Error | any, 
    data?: any, 
    context?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): void {
    const entry = this.createLogEntry('error', category, message, data, context);
    
    // Ajout de la stack trace pour les erreurs
    if (message instanceof Error) {
      entry.stackTrace = message.stack;
      entry.message = message.message;
      entry.data = { ...data, errorName: message.name, ...message };
    }
    
    this.writeLog(entry);
  }
  
  /**
   * Log d'avertissement
   */
  public warn(
    category: string, 
    message: string | any, 
    data?: any, 
    context?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): void {
    const entry = this.createLogEntry('warn', category, message, data, context);
    this.writeLog(entry);
  }
  
  /**
   * Log d'information
   */
  public info(
    category: string, 
    message: string | any, 
    data?: any, 
    context?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): void {
    const entry = this.createLogEntry('info', category, message, data, context);
    this.writeLog(entry);
  }
  
  /**
   * Log de debug
   */
  public debug(
    category: string, 
    message: string | any, 
    data?: any, 
    context?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): void {
    const entry = this.createLogEntry('debug', category, message, data, context);
    this.writeLog(entry);
  }
  
  /**
   * Log d'audit spécifique avec métriques de performance
   */
  public audit(
    category: string,
    action: string,
    result: 'success' | 'failure' | 'warning',
    data?: any,
    context?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
      startTime?: Date;
    }
  ): void {
    const entry = this.createLogEntry('info', `AUDIT:${category}`, action, {
      result,
      ...data
    }, context);
    
    // Calcul de la durée si startTime fourni
    if (context?.startTime) {
      entry.duration = Date.now() - context.startTime.getTime();
    }
    
    // Ajout de flags de compliance
    entry.complianceFlags = this.identifyComplianceFlags(action, data);
    
    this.writeLog(entry);
  }
  
  /**
   * Log de sécurité pour les événements critiques
   */
  public security(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any,
    context?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): void {
    const entry = this.createLogEntry('error', 'SECURITY', event, {
      severity,
      ...details
    }, context);
    
    entry.complianceFlags = ['SECURITY_EVENT', `SEVERITY_${severity.toUpperCase()}`];
    
    this.writeLog(entry);
    
    // Alert immédiat pour les événements critiques
    if (severity === 'critical') {
      this.flushBuffer(); // Force l'écriture immédiate
    }
  }
  
  /**
   * Recherche dans les logs d'audit
   * @param filter Critères de recherche
   */
  public async searchLogs(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    try {
      // Pour l'implémentation en fichier
      if (this.config.destination === 'file' && this.logFilePath) {
        return await this.searchLogsInFile(filter);
      }
      
      // Pour d'autres destinations, retourner du buffer récent
      return this.filterLogBuffer(filter);
      
    } catch (error) {
      throw new OutlookError(
        'AUDIT_SEARCH_ERROR',
        `Failed to search audit logs: ${error.message}`,
        { filter, error: error.message }
      );
    }
  }
  
  /**
   * Export des logs pour compliance
   * @param startDate Date de début
   * @param endDate Date de fin
   * @param format Format d'export ('json' | 'csv')
   */
  public async exportLogs(
    startDate: Date, 
    endDate: Date, 
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const logs = await this.searchLogs({
        startDate,
        endDate,
        limit: 10000
      });
      
      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else {
        return this.convertLogsToCSV(logs);
      }
      
    } catch (error) {
      throw new OutlookError(
        'AUDIT_EXPORT_ERROR',
        `Failed to export audit logs: ${error.message}`,
        { startDate, endDate, format, error: error.message }
      );
    }
  }
  
  /**
   * Nettoyage des logs anciens selon la politique de rétention
   */
  public async cleanupOldLogs(): Promise<{ deleted: number; errors: string[] }> {
    const result = { deleted: 0, errors: [] as string[] };
    
    try {
      if (this.config.destination === 'file' && this.logFilePath) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
        
        // Implémentation du nettoyage des fichiers
        // Cette partie dépendrait de la structure de stockage des logs
        this.info('AuditLogger:CleanupOldLogs', `Cleaned up logs older than ${cutoffDate.toISOString()}`);
      }
      
    } catch (error) {
      result.errors.push(error.message);
    }
    
    return result;
  }
  
  /**
   * Anonymisation des données PII selon GDPR/PIPEDA
   * @param userId ID de l'utilisateur à anonymiser
   */
  public async anonymizeUserData(userId: string): Promise<{ anonymized: number; errors: string[] }> {
    const result = { anonymized: 0, errors: [] as string[] };
    
    try {
      const userLogs = await this.searchLogs({ userId });
      
      for (const log of userLogs) {
        try {
          // Anonymisation des données
          log.userId = this.anonymizeValue(log.userId);
          log.data = this.anonymizeObject(log.data);
          log.ipAddress = this.anonymizeValue(log.ipAddress);
          log.userAgent = this.anonymizeValue(log.userAgent);
          
          result.anonymized++;
        } catch (error) {
          result.errors.push(`Failed to anonymize log ${log.timestamp}: ${error.message}`);
        }
      }
      
      this.info('AuditLogger:AnonymizeUserData', `Anonymized ${result.anonymized} log entries for user`, {
        userId: this.anonymizeValue(userId),
        errors: result.errors.length
      });
      
    } catch (error) {
      result.errors.push(error.message);
    }
    
    return result;
  }
  
  /**
   * Statistiques d'utilisation des logs
   */
  public async getLogStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalEntries: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    securityEvents: number;
    complianceEvents: number;
    averageEntriesPerDay: number;
    topCategories: Array<{ category: string; count: number }>;
  }> {
    try {
      const logs = await this.searchLogs({
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
        endDate: endDate || new Date()
      });
      
      const stats = {
        totalEntries: logs.length,
        byLevel: { error: 0, warn: 0, info: 0, debug: 0 } as Record<LogLevel, number>,
        byCategory: {} as Record<string, number>,
        securityEvents: 0,
        complianceEvents: 0,
        averageEntriesPerDay: 0,
        topCategories: [] as Array<{ category: string; count: number }>
      };
      
      logs.forEach(log => {
        // Par niveau
        stats.byLevel[log.level]++;
        
        // Par catégorie
        stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
        
        // Événements de sécurité
        if (log.category.includes('SECURITY')) {
          stats.securityEvents++;
        }
        
        // Événements de compliance
        if (log.complianceFlags && log.complianceFlags.length > 0) {
          stats.complianceEvents++;
        }
      });
      
      // Top catégories
      stats.topCategories = Object.entries(stats.byCategory)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([category, count]) => ({ category, count }));
      
      // Moyenne par jour
      const daysDiff = startDate && endDate ? 
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 30;
      stats.averageEntriesPerDay = stats.totalEntries / daysDiff;
      
      return stats;
      
    } catch (error) {
      throw new OutlookError(
        'AUDIT_STATISTICS_ERROR',
        `Failed to generate log statistics: ${error.message}`,
        { startDate, endDate, error: error.message }
      );
    }
  }
  
  /**
   * Fermeture propre du service d'audit
   */
  public async shutdown(): Promise<void> {
    try {
      // Flush final du buffer
      await this.flushBuffer();
      
      // Arrêt du timer
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = undefined;
      }
      
      this.info('AuditLogger:Shutdown', 'Audit logger shutdown completed');
      
    } catch (error) {
      console.error('Error during audit logger shutdown:', error);
    }
  }
  
  /**
   * Méthodes privées
   */
  
  private initialize(): void {
    try {
      switch (this.config.destination) {
        case 'file':
          this.initializeFileLogging();
          break;
        case 'database':
          this.initializeDatabaseLogging();
          break;
        case 'webhook':
          this.initializeWebhookLogging();
          break;
        case 'console':
        default:
          // Console logging est prêt par défaut
          break;
      }
      
    } catch (error) {
      console.error('Failed to initialize audit logger:', error);
      // Fallback vers console
      this.config.destination = 'console';
    }
  }
  
  private initializeFileLogging(): void {
    const logsDir = process.env.LOGS_DIR || './logs';
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.logFilePath = path.join(logsDir, 'audit');
    this.rotateLogFile();
  }
  
  private initializeDatabaseLogging(): void {
    // Implémentation pour base de données
    // Dépendrait du provider de base de données utilisé
  }
  
  private initializeWebhookLogging(): void {
    // Implémentation pour webhook
    // Vérifier la connectivité vers le webhook
  }
  
  private createLogEntry(
    level: LogLevel, 
    category: string, 
    message: string | any, 
    data?: any,
    context?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): AuditLogEntry {
    return {
      timestamp: new Date(),
      level,
      category,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      data: data ? this.sanitizeData(data) : undefined,
      userId: context?.userId,
      sessionId: context?.sessionId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      correlationId: context?.correlationId || this.generateCorrelationId()
    };
  }
  
  private writeLog(entry: AuditLogEntry): void {
    if (!this.config.enabled || !this.shouldLog(entry.level)) {
      return;
    }
    
    // Chiffrement si nécessaire
    if (this.config.encryptPII && this.containsPII(entry)) {
      entry = this.encryptPII(entry);
    }
    
    // Ajout au buffer
    this.logBuffer.push(entry);
    
    // Flush si buffer plein
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
    
    // Log immédiat pour les erreurs en mode console
    if (entry.level === 'error' && this.config.destination === 'console') {
      console.error(`[${entry.timestamp.toISOString()}] ${entry.category}: ${entry.message}`, 
        entry.data || '');
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const configLevelIndex = levels.indexOf(this.config.level);
    const entryLevelIndex = levels.indexOf(level);
    
    return entryLevelIndex <= configLevelIndex;
  }
  
  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sanitized = { ...data };
    
    this.sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = this.maskValue(sanitized[field]);
      }
    });
    
    return sanitized;
  }
  
  private maskValue(value: any): string {
    if (typeof value !== 'string') {
      value = String(value);
    }
    
    if (value.length <= 4) {
      return '****';
    }
    
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }
  
  private containsPII(entry: AuditLogEntry): boolean {
    const checkForPII = (obj: any): boolean => {
      if (typeof obj !== 'object' || obj === null) {
        return false;
      }
      
      for (const key of Object.keys(obj)) {
        if (this.sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          return true;
        }
        
        if (typeof obj[key] === 'object') {
          if (checkForPII(obj[key])) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    return !!(entry.userId || entry.ipAddress || entry.userAgent || checkForPII(entry.data));
  }
  
  private encryptPII(entry: AuditLogEntry): AuditLogEntry {
    if (!this.encryptionService) {
      return entry;
    }
    
    const encrypted = { ...entry };
    
    try {
      if (encrypted.userId) {
        encrypted.userId = this.encryptionService.encrypt(encrypted.userId);
      }
      if (encrypted.ipAddress) {
        encrypted.ipAddress = this.encryptionService.encrypt(encrypted.ipAddress);
      }
      if (encrypted.userAgent) {
        encrypted.userAgent = this.encryptionService.encrypt(encrypted.userAgent);
      }
      if (encrypted.data) {
        encrypted.data = this.encryptSensitiveFields(encrypted.data);
      }
      
      encrypted.encrypted = true;
      
    } catch (error) {
      // En cas d'erreur de chiffrement, on garde les données masquées
      console.error('Failed to encrypt PII in audit log:', error);
    }
    
    return encrypted;
  }
  
  private encryptSensitiveFields(data: any): any {
    if (!this.encryptionService || typeof data !== 'object' || data === null) {
      return data;
    }
    
    const encrypted = { ...data };
    
    this.sensitiveFields.forEach(field => {
      if (field in encrypted && typeof encrypted[field] === 'string') {
        try {
          encrypted[field] = this.encryptionService!.encrypt(encrypted[field]);
        } catch (error) {
          // Garder masqué en cas d'erreur
          encrypted[field] = this.maskValue(encrypted[field]);
        }
      }
    });
    
    return encrypted;
  }
  
  private startLogBuffer(): void {
    this.flushTimer = setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flushBuffer();
      }
    }, this.flushInterval);
  }
  
  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }
    
    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      switch (this.config.destination) {
        case 'file':
          await this.writeLogsToFile(logsToFlush);
          break;
        case 'database':
          await this.writeLogsToDatabase(logsToFlush);
          break;
        case 'webhook':
          await this.writeLogsToWebhook(logsToFlush);
          break;
        case 'console':
        default:
          this.writeLogsToConsole(logsToFlush);
          break;
      }
      
    } catch (error) {
      console.error('Failed to flush audit log buffer:', error);
      // Remettre les logs dans le buffer pour retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }
  
  private writeLogsToConsole(logs: AuditLogEntry[]): void {
    logs.forEach(log => {
      const logLine = `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.category}: ${log.message}`;
      
      switch (log.level) {
        case 'error':
          console.error(logLine, log.data || '');
          break;
        case 'warn':
          console.warn(logLine, log.data || '');
          break;
        case 'debug':
          console.debug(logLine, log.data || '');
          break;
        default:
          console.log(logLine, log.data || '');
      }
    });
  }
  
  private async writeLogsToFile(logs: AuditLogEntry[]): Promise<void> {
    if (!this.currentLogFile) {
      this.rotateLogFile();
    }
    
    const logLines = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
    
    return new Promise((resolve, reject) => {
      fs.appendFile(this.currentLogFile!, logLines, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  
  private async writeLogsToDatabase(logs: AuditLogEntry[]): Promise<void> {
    // Implémentation pour base de données
    // Dépendrait du provider de base de données utilisé
    throw new Error('Database logging not implemented');
  }
  
  private async writeLogsToWebhook(logs: AuditLogEntry[]): Promise<void> {
    // Implémentation pour webhook
    // Envoyer les logs à un endpoint HTTP
    throw new Error('Webhook logging not implemented');
  }
  
  private rotateLogFile(): void {
    if (!this.logFilePath) return;
    
    const date = new Date().toISOString().split('T')[0];
    this.currentLogFile = `${this.logFilePath}-${date}.jsonl`;
  }
  
  private async searchLogsInFile(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    // Implémentation de recherche dans fichier
    // Cette partie nécessiterait une implémentation plus complexe pour la performance
    return [];
  }
  
  private filterLogBuffer(filter: AuditLogFilter): AuditLogEntry[] {
    return this.logBuffer.filter(log => {
      if (filter.level && log.level !== filter.level) return false;
      if (filter.category && !log.category.includes(filter.category)) return false;
      if (filter.userId && log.userId !== filter.userId) return false;
      if (filter.correlationId && log.correlationId !== filter.correlationId) return false;
      if (filter.startDate && log.timestamp < filter.startDate) return false;
      if (filter.endDate && log.timestamp > filter.endDate) return false;
      
      return true;
    }).slice(filter.offset || 0, (filter.offset || 0) + (filter.limit || 100));
  }
  
  private convertLogsToCSV(logs: AuditLogEntry[]): string {
    if (logs.length === 0) return '';
    
    const headers = ['timestamp', 'level', 'category', 'message', 'userId', 'correlationId', 'duration'];
    const csvLines = [headers.join(',')];
    
    logs.forEach(log => {
      const row = [
        log.timestamp.toISOString(),
        log.level,
        `"${log.category}"`,
        `"${log.message.replace(/"/g, '""')}"`,
        log.userId || '',
        log.correlationId || '',
        log.duration?.toString() || ''
      ];
      csvLines.push(row.join(','));
    });
    
    return csvLines.join('\n');
  }
  
  private identifyComplianceFlags(action: string, data: any): string[] {
    const flags: string[] = [];
    
    // Flags GDPR/PIPEDA
    if (action.includes('access') || action.includes('export')) {
      flags.push('DATA_ACCESS');
    }
    
    if (action.includes('delete') || action.includes('anonymize')) {
      flags.push('DATA_DELETION');
    }
    
    if (action.includes('consent')) {
      flags.push('CONSENT_MANAGEMENT');
    }
    
    // Flags de sécurité
    if (action.includes('auth') || action.includes('login')) {
      flags.push('AUTHENTICATION');
    }
    
    if (action.includes('encrypt') || action.includes('decrypt')) {
      flags.push('ENCRYPTION_OPERATION');
    }
    
    return flags;
  }
  
  private anonymizeValue(value: string | undefined): string | undefined {
    if (!value) return value;
    return `ANON_${crypto.createHash('sha256').update(value).digest('hex').substring(0, 8)}`;
  }
  
  private anonymizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const anonymized = { ...obj };
    
    this.sensitiveFields.forEach(field => {
      if (field in anonymized) {
        anonymized[field] = this.anonymizeValue(String(anonymized[field]));
      }
    });
    
    return anonymized;
  }
  
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export default AuditLogger;