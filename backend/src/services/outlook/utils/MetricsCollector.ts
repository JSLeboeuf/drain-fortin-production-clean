/**
 * MetricsCollector.ts - Système de collecte et analyse de métriques
 * Surveille les performances et l'utilisation des ressources
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { EventEmitter } from 'events';
import { AuditLogger } from '../security/AuditLogger';
import { CacheManager } from './CacheManager';
import { OutlookErrorHandler } from './OutlookErrorHandler';
import {
  MetricsConfig,
  MetricType,
  MetricValue,
  MetricData,
  MetricsSnapshot,
  MetricsAggregation,
  MetricThreshold,
  AlertRule,
  MetricsProvider
} from '../config/outlook.types';

/**
 * Configuration par défaut des métriques
 */
const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  enabled: true,
  provider: 'memory',
  interval: 30000, // 30 secondes
  retention: {
    raw: 3600000,      // 1 heure de données brutes
    minutely: 86400000, // 1 jour de données par minute
    hourly: 2592000000, // 30 jours de données par heure
    daily: 31536000000  // 1 an de données par jour
  },
  aggregation: {
    enableMinutely: true,
    enableHourly: true,
    enableDaily: true,
    functions: ['avg', 'min', 'max', 'sum', 'count']
  },
  alerts: {
    enabled: true,
    defaultThresholds: {
      responseTime: { warning: 2000, critical: 5000 },
      errorRate: { warning: 0.05, critical: 0.1 },
      memoryUsage: { warning: 0.8, critical: 0.9 },
      queueSize: { warning: 100, critical: 500 }
    }
  }
};

/**
 * Collecteur de métriques principal
 */
export class MetricsCollector extends EventEmitter {
  private readonly config: MetricsConfig;
  private readonly auditLogger?: AuditLogger;
  private readonly cacheManager?: CacheManager;
  private readonly errorHandler: OutlookErrorHandler;
  
  private metrics: Map<string, MetricData[]> = new Map();
  private aggregatedMetrics: Map<string, Map<string, MetricsAggregation[]>> = new Map();
  private thresholds: Map<string, MetricThreshold> = new Map();
  private alertRules: Map<string, AlertRule[]> = new Map();
  private collectionTimer?: NodeJS.Timeout;
  private aggregationTimer?: NodeJS.Timeout;
  private isRunning = false;
  private startTime = Date.now();

  constructor(
    config: Partial<MetricsConfig> = {},
    dependencies: {
      auditLogger?: AuditLogger;
      cacheManager?: CacheManager;
      errorHandler: OutlookErrorHandler;
    }
  ) {
    super();
    
    this.config = { ...DEFAULT_METRICS_CONFIG, ...config };
    this.auditLogger = dependencies.auditLogger;
    this.cacheManager = dependencies.cacheManager;
    this.errorHandler = dependencies.errorHandler;
    
    // Initialiser les seuils par défaut
    Object.entries(this.config.alerts.defaultThresholds).forEach(([metric, threshold]) => {
      this.thresholds.set(metric, threshold);
    });
    
    this.auditLogger?.log('info', 'MetricsCollector initialized', {
      component: 'MetricsCollector',
      provider: this.config.provider,
      interval: this.config.interval
    });
  }

  /**
   * Démarre la collecte de métriques
   */
  start(): void {
    if (this.isRunning) {
      this.auditLogger?.log('warn', 'MetricsCollector already running', {
        component: 'MetricsCollector'
      });
      return;
    }

    if (!this.config.enabled) {
      this.auditLogger?.log('info', 'MetricsCollector disabled by configuration', {
        component: 'MetricsCollector'
      });
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    
    // Démarrer la collecte automatique des métriques système
    this.collectionTimer = setInterval(() => {
      this.collectSystemMetrics().catch(error => {
        this.auditLogger?.log('error', 'System metrics collection failed', {
          component: 'MetricsCollector',
          error: error.message
        });
      });
    }, this.config.interval);
    
    // Démarrer l'agrégation périodique
    if (this.config.aggregation.enableMinutely || 
        this.config.aggregation.enableHourly || 
        this.config.aggregation.enableDaily) {
      this.aggregationTimer = setInterval(() => {
        this.performAggregation().catch(error => {
          this.auditLogger?.log('error', 'Metrics aggregation failed', {
            component: 'MetricsCollector',
            error: error.message
          });
        });
      }, 60000); // Agrégation toutes les minutes
    }
    
    this.auditLogger?.log('info', 'MetricsCollector started', {
      component: 'MetricsCollector',
      interval: this.config.interval
    });
    
    this.emit('started');
  }

  /**
   * Arrête la collecte de métriques
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }
    
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = undefined;
    }
    
    this.auditLogger?.log('info', 'MetricsCollector stopped', {
      component: 'MetricsCollector',
      uptime: Date.now() - this.startTime
    });
    
    this.emit('stopped');
  }

  /**
   * Enregistre une métrique
   */
  record(name: string, value: MetricValue, tags: Record<string, string> = {}): void {
    if (!this.config.enabled) {
      return;
    }

    const metricData: MetricData = {
      name,
      value,
      tags,
      timestamp: Date.now(),
      type: this.determineMetricType(value)
    };
    
    // Ajouter à la collection
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricList = this.metrics.get(name)!;
    metricList.push(metricData);
    
    // Nettoyer les anciennes données
    this.cleanupOldMetrics(name);
    
    // Vérifier les seuils et alertes
    this.checkThresholds(name, value, tags);
    
    this.emit('metricRecorded', metricData);
    
    this.auditLogger?.log('debug', 'Metric recorded', {
      component: 'MetricsCollector',
      metric: name,
      value,
      tags
    });
  }

  /**
   * Enregistre une métrique de compteur
   */
  counter(name: string, increment: number = 1, tags: Record<string, string> = {}): void {
    const existing = this.getLatestMetric(name);
    const newValue = existing ? (existing.value as number) + increment : increment;
    this.record(name, newValue, tags);
  }

  /**
   * Enregistre une métrique de gauge (jauge)
   */
  gauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.record(name, value, tags);
  }

  /**
   * Enregistre une métrique de timing
   */
  timing(name: string, duration: number, tags: Record<string, string> = {}): void {
    this.record(name, duration, { ...tags, type: 'timing' });
  }

  /**
   * Enregistre une métrique d'histogramme
   */
  histogram(name: string, value: number, buckets: number[], tags: Record<string, string> = {}): void {
    // Déterminer le bucket approprié
    let bucket = 'inf';
    for (const b of buckets.sort((a, b) => a - b)) {
      if (value <= b) {
        bucket = b.toString();
        break;
      }
    }
    
    this.record(name, value, { ...tags, bucket, type: 'histogram' });
  }

  /**
   * Mesure et enregistre le temps d'exécution d'une fonction
   */
  async time<T>(
    name: string,
    fn: () => Promise<T>,
    tags: Record<string, string> = {}
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.timing(name, duration, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.timing(name, duration, { ...tags, status: 'error' });
      throw error;
    }
  }

  /**
   * Collecte automatique des métriques système
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      // Métriques de mémoire
      const memoryUsage = process.memoryUsage();
      this.gauge('system.memory.heap_used', memoryUsage.heapUsed);
      this.gauge('system.memory.heap_total', memoryUsage.heapTotal);
      this.gauge('system.memory.external', memoryUsage.external);
      this.gauge('system.memory.rss', memoryUsage.rss);
      this.gauge('system.memory.usage_ratio', memoryUsage.heapUsed / memoryUsage.heapTotal);
      
      // Métriques de processus
      const cpuUsage = process.cpuUsage();
      this.gauge('system.cpu.user', cpuUsage.user);
      this.gauge('system.cpu.system', cpuUsage.system);
      
      // Uptime
      this.gauge('system.uptime', process.uptime());
      this.gauge('system.collector_uptime', (Date.now() - this.startTime) / 1000);
      
      // Métriques de l'event loop
      this.recordEventLoopMetrics();
      
      // Métriques spécifiques à l'intégration Outlook
      await this.collectOutlookMetrics();
      
    } catch (error) {
      this.auditLogger?.log('error', 'Failed to collect system metrics', {
        component: 'MetricsCollector',
        error: (error as Error).message
      });
    }
  }

  /**
   * Collecte les métriques de l'event loop
   */
  private recordEventLoopMetrics(): void {
    const startTime = process.hrtime();
    
    setImmediate(() => {
      const delta = process.hrtime(startTime);
      const lag = (delta[0] * 1e9 + delta[1]) / 1e6; // Convertir en millisecondes
      this.gauge('system.event_loop.lag', lag);
    });
  }

  /**
   * Collecte les métriques spécifiques à l'intégration Outlook
   */
  private async collectOutlookMetrics(): Promise<void> {
    try {
      // Nombre de métriques collectées
      this.gauge('outlook.metrics.total_metrics', this.metrics.size);
      
      let totalDataPoints = 0;
      for (const metricList of this.metrics.values()) {
        totalDataPoints += metricList.length;
      }
      this.gauge('outlook.metrics.total_data_points', totalDataPoints);
      
      // Métriques du cache si disponible
      if (this.cacheManager) {
        const cacheStats = this.cacheManager.getStatistics();
        this.gauge('outlook.cache.hit_rate', cacheStats.hitRate);
        this.gauge('outlook.cache.total_keys', cacheStats.totalKeys);
        this.gauge('outlook.cache.memory_usage', cacheStats.memoryUsage || 0);
      }
      
    } catch (error) {
      this.auditLogger?.log('error', 'Failed to collect Outlook metrics', {
        component: 'MetricsCollector',
        error: (error as Error).message
      });
    }
  }

  /**
   * Détermine le type de métrique basé sur la valeur
   */
  private determineMetricType(value: MetricValue): MetricType {
    if (typeof value === 'number') {
      return 'gauge';
    } else if (typeof value === 'boolean') {
      return 'boolean';
    } else {
      return 'string';
    }
  }

  /**
   * Nettoie les anciennes métriques selon les règles de rétention
   */
  private cleanupOldMetrics(metricName: string): void {
    const metricList = this.metrics.get(metricName);
    if (!metricList) return;
    
    const now = Date.now();
    const retentionTime = this.config.retention.raw;
    
    // Supprimer les métriques plus anciennes que la période de rétention
    const filteredMetrics = metricList.filter(metric => 
      (now - metric.timestamp) <= retentionTime
    );
    
    this.metrics.set(metricName, filteredMetrics);
  }

  /**
   * Vérifie les seuils et déclenche les alertes
   */
  private checkThresholds(name: string, value: MetricValue, tags: Record<string, string>): void {
    if (!this.config.alerts.enabled || typeof value !== 'number') {
      return;
    }

    const threshold = this.thresholds.get(name);
    if (!threshold) {
      return;
    }

    let alertLevel: 'warning' | 'critical' | null = null;
    
    if (value >= threshold.critical) {
      alertLevel = 'critical';
    } else if (value >= threshold.warning) {
      alertLevel = 'warning';
    }

    if (alertLevel) {
      const alert = {
        metric: name,
        value,
        threshold: threshold[alertLevel],
        level: alertLevel,
        tags,
        timestamp: Date.now()
      };
      
      this.emit('alert', alert);
      
      this.auditLogger?.log(alertLevel === 'critical' ? 'error' : 'warn', 
        `Metric threshold exceeded`, {
          component: 'MetricsCollector',
          metric: name,
          value,
          threshold: threshold[alertLevel],
          level: alertLevel
        });
    }
  }

  /**
   * Effectue l'agrégation des métriques
   */
  private async performAggregation(): Promise<void> {
    try {
      const now = Date.now();
      
      for (const [metricName, metricList] of this.metrics.entries()) {
        if (metricList.length === 0) continue;
        
        // Agrégation par minute
        if (this.config.aggregation.enableMinutely) {
          await this.aggregateMetrics(metricName, metricList, 'minutely', 60000, now);
        }
        
        // Agrégation par heure
        if (this.config.aggregation.enableHourly) {
          await this.aggregateMetrics(metricName, metricList, 'hourly', 3600000, now);
        }
        
        // Agrégation par jour
        if (this.config.aggregation.enableDaily) {
          await this.aggregateMetrics(metricName, metricList, 'daily', 86400000, now);
        }
      }
      
    } catch (error) {
      this.auditLogger?.log('error', 'Metrics aggregation failed', {
        component: 'MetricsCollector',
        error: (error as Error).message
      });
    }
  }

  /**
   * Agrège les métriques pour une période donnée
   */
  private async aggregateMetrics(
    metricName: string,
    metricList: MetricData[],
    interval: 'minutely' | 'hourly' | 'daily',
    periodMs: number,
    now: number
  ): Promise<void> {
    const periodStart = Math.floor(now / periodMs) * periodMs;
    const periodMetrics = metricList.filter(m => 
      m.timestamp >= periodStart && m.timestamp < (periodStart + periodMs)
    );
    
    if (periodMetrics.length === 0) return;
    
    // Calculer les agrégations
    const numericValues = periodMetrics
      .map(m => m.value)
      .filter(v => typeof v === 'number') as number[];
    
    if (numericValues.length === 0) return;
    
    const aggregation: MetricsAggregation = {
      timestamp: periodStart,
      interval,
      count: numericValues.length,
      sum: numericValues.reduce((a, b) => a + b, 0),
      avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      median: this.calculateMedian(numericValues),
      p95: this.calculatePercentile(numericValues, 0.95),
      p99: this.calculatePercentile(numericValues, 0.99)
    };
    
    // Stocker l'agrégation
    if (!this.aggregatedMetrics.has(metricName)) {
      this.aggregatedMetrics.set(metricName, new Map());
    }
    
    const metricAggregations = this.aggregatedMetrics.get(metricName)!;
    if (!metricAggregations.has(interval)) {
      metricAggregations.set(interval, []);
    }
    
    const intervalAggregations = metricAggregations.get(interval)!;
    intervalAggregations.push(aggregation);
    
    // Nettoyer les anciennes agrégations
    const retentionPeriod = this.config.retention[interval];
    const cutoffTime = now - retentionPeriod;
    
    metricAggregations.set(interval, 
      intervalAggregations.filter(agg => agg.timestamp >= cutoffTime)
    );
  }

  /**
   * Calcule la médiane d'un tableau de nombres
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Calcule un percentile d'un tableau de nombres
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Obtient la dernière valeur d'une métrique
   */
  private getLatestMetric(name: string): MetricData | undefined {
    const metricList = this.metrics.get(name);
    if (!metricList || metricList.length === 0) {
      return undefined;
    }
    
    return metricList[metricList.length - 1];
  }

  /**
   * Obtient un snapshot des métriques actuelles
   */
  getSnapshot(): MetricsSnapshot {
    const metrics: Record<string, MetricData[]> = {};
    const aggregated: Record<string, Record<string, MetricsAggregation[]>> = {};
    
    // Copier les métriques brutes
    for (const [name, data] of this.metrics.entries()) {
      metrics[name] = [...data];
    }
    
    // Copier les métriques agrégées
    for (const [name, intervals] of this.aggregatedMetrics.entries()) {
      aggregated[name] = {};
      for (const [interval, data] of intervals.entries()) {
        aggregated[name][interval] = [...data];
      }
    }
    
    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      metrics,
      aggregated,
      totalMetrics: this.metrics.size,
      totalDataPoints: Array.from(this.metrics.values())
        .reduce((sum, list) => sum + list.length, 0)
    };
  }

  /**
   * Obtient les métriques pour un nom spécifique
   */
  getMetric(name: string, options: {
    since?: number;
    until?: number;
    tags?: Record<string, string>;
    limit?: number;
  } = {}): MetricData[] {
    const metricList = this.metrics.get(name);
    if (!metricList) {
      return [];
    }
    
    let filtered = metricList;
    
    // Filtrer par période
    if (options.since || options.until) {
      filtered = filtered.filter(metric => {
        const time = metric.timestamp;
        return (!options.since || time >= options.since) &&
               (!options.until || time <= options.until);
      });
    }
    
    // Filtrer par tags
    if (options.tags) {
      filtered = filtered.filter(metric => {
        return Object.entries(options.tags!).every(([key, value]) => 
          metric.tags[key] === value
        );
      });
    }
    
    // Limiter le nombre de résultats
    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }
    
    return filtered;
  }

  /**
   * Obtient les métriques agrégées
   */
  getAggregatedMetric(
    name: string,
    interval: 'minutely' | 'hourly' | 'daily',
    options: {
      since?: number;
      until?: number;
      limit?: number;
    } = {}
  ): MetricsAggregation[] {
    const metricAggregations = this.aggregatedMetrics.get(name);
    if (!metricAggregations) {
      return [];
    }
    
    const intervalData = metricAggregations.get(interval);
    if (!intervalData) {
      return [];
    }
    
    let filtered = intervalData;
    
    // Filtrer par période
    if (options.since || options.until) {
      filtered = filtered.filter(agg => {
        const time = agg.timestamp;
        return (!options.since || time >= options.since) &&
               (!options.until || time <= options.until);
      });
    }
    
    // Limiter le nombre de résultats
    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }
    
    return filtered;
  }

  /**
   * Définit un seuil d'alerte pour une métrique
   */
  setThreshold(metricName: string, threshold: MetricThreshold): void {
    this.thresholds.set(metricName, threshold);
    
    this.auditLogger?.log('info', 'Metric threshold set', {
      component: 'MetricsCollector',
      metric: metricName,
      threshold
    });
  }

  /**
   * Supprime un seuil d'alerte
   */
  removeThreshold(metricName: string): void {
    this.thresholds.delete(metricName);
    
    this.auditLogger?.log('info', 'Metric threshold removed', {
      component: 'MetricsCollector',
      metric: metricName
    });
  }

  /**
   * Exporte les métriques vers un provider externe
   */
  async export(provider: MetricsProvider, options: {
    format?: 'json' | 'prometheus' | 'csv';
    since?: number;
    until?: number;
  } = {}): Promise<string> {
    const snapshot = this.getSnapshot();
    
    switch (options.format) {
      case 'prometheus':
        return this.exportToPrometheus(snapshot, options);
      
      case 'csv':
        return this.exportToCsv(snapshot, options);
      
      case 'json':
      default:
        return JSON.stringify(snapshot, null, 2);
    }
  }

  /**
   * Exporte au format Prometheus
   */
  private exportToPrometheus(snapshot: MetricsSnapshot, options: any): string {
    const lines: string[] = [];
    
    for (const [metricName, metricList] of Object.entries(snapshot.metrics)) {
      const latest = metricList[metricList.length - 1];
      if (!latest || typeof latest.value !== 'number') continue;
      
      const sanitizedName = metricName.replace(/[^a-zA-Z0-9_]/g, '_');
      const tags = Object.entries(latest.tags)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      
      const tagString = tags ? `{${tags}}` : '';
      lines.push(`${sanitizedName}${tagString} ${latest.value} ${latest.timestamp}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Exporte au format CSV
   */
  private exportToCsv(snapshot: MetricsSnapshot, options: any): string {
    const rows: string[] = ['timestamp,metric,value,tags'];
    
    for (const [metricName, metricList] of Object.entries(snapshot.metrics)) {
      for (const metric of metricList) {
        const tagsString = JSON.stringify(metric.tags);
        rows.push(`${metric.timestamp},${metricName},${metric.value},"${tagsString}"`);
      }
    }
    
    return rows.join('\n');
  }

  /**
   * Nettoie les ressources
   */
  async dispose(): Promise<void> {
    this.stop();
    this.metrics.clear();
    this.aggregatedMetrics.clear();
    this.thresholds.clear();
    this.alertRules.clear();
    this.removeAllListeners();
    
    this.auditLogger?.log('info', 'MetricsCollector disposed', {
      component: 'MetricsCollector',
      uptime: Date.now() - this.startTime
    });
  }
}

/**
 * Factory pour créer des instances de MetricsCollector
 */
export class MetricsCollectorFactory {
  /**
   * Crée une instance par défaut
   */
  static createDefault(errorHandler: OutlookErrorHandler): MetricsCollector {
    return new MetricsCollector({}, { errorHandler });
  }

  /**
   * Crée une instance avec collecte intensive
   */
  static createIntensive(
    errorHandler: OutlookErrorHandler,
    dependencies: {
      auditLogger?: AuditLogger;
      cacheManager?: CacheManager;
    }
  ): MetricsCollector {
    return new MetricsCollector({
      interval: 10000, // 10 secondes
      retention: {
        raw: 7200000,      // 2 heures
        minutely: 172800000, // 2 jours
        hourly: 2592000000,  // 30 jours
        daily: 31536000000   // 1 an
      },
      aggregation: {
        enableMinutely: true,
        enableHourly: true,
        enableDaily: true,
        functions: ['avg', 'min', 'max', 'sum', 'count', 'p95', 'p99']
      },
      alerts: {
        enabled: true,
        defaultThresholds: {
          responseTime: { warning: 1000, critical: 3000 },
          errorRate: { warning: 0.02, critical: 0.05 },
          memoryUsage: { warning: 0.7, critical: 0.85 },
          queueSize: { warning: 50, critical: 200 }
        }
      }
    }, { errorHandler, ...dependencies });
  }

  /**
   * Crée une instance légère pour production
   */
  static createLightweight(errorHandler: OutlookErrorHandler): MetricsCollector {
    return new MetricsCollector({
      interval: 120000, // 2 minutes
      retention: {
        raw: 3600000,      // 1 heure
        minutely: 43200000, // 12 heures
        hourly: 604800000,  // 7 jours
        daily: 2592000000   // 30 jours
      },
      aggregation: {
        enableMinutely: false,
        enableHourly: true,
        enableDaily: true,
        functions: ['avg', 'min', 'max']
      },
      alerts: {
        enabled: true,
        defaultThresholds: {
          memoryUsage: { warning: 0.9, critical: 0.95 },
          errorRate: { warning: 0.1, critical: 0.2 }
        }
      }
    }, { errorHandler });
  }
}

export default MetricsCollector;