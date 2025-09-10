/**
 * CacheManager.ts - Gestionnaire de cache intelligent avec support multiple
 * Support mémoire, Redis, fichier avec invalidation automatique
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createClient, RedisClientType } from 'redis';
import { OutlookConfig, OutlookError } from '../config/outlook.types';
import { OUTLOOK_CONSTANTS } from '../config/outlook.constants';

/**
 * Interface pour les entrées de cache
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  tags?: string[];
  compressed?: boolean;
}

/**
 * Interface pour les statistiques de cache
 */
export interface CacheStatistics {
  totalEntries: number;
  totalMemoryUsage: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  averageAccessTime: number;
  topKeys: Array<{ key: string; accessCount: number; lastAccessed: Date }>;
  expiredEntries: number;
  compressionRatio: number;
}

/**
 * Options de configuration pour le cache
 */
export interface CacheOptions {
  compress?: boolean;
  tags?: string[];
  namespace?: string;
  priority?: number;
}

/**
 * Gestionnaire de cache intelligent avec support multi-provider
 * Optimisé pour performance et flexibilité
 */
export class CacheManager {
  private config: OutlookConfig['cache'];
  private memoryCache: Map<string, CacheEntry> = new Map();
  private redisClient: RedisClientType | null = null;
  private fileCachePath: string | null = null;
  
  private statistics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalAccessTime: 0,
    operations: 0
  };
  
  private cleanupInterval: NodeJS.Timeout | null = null;
  private compressionEnabled = false;
  
  constructor(config: OutlookConfig['cache']) {
    this.config = {
      provider: 'memory',
      ttl: 3600,
      maxSize: 10000,
      ...config
    };
    
    this.compressionEnabled = process.env.NODE_ENV === 'production';
    this.initialize();
  }
  
  /**
   * Initialise le gestionnaire de cache
   */
  private async initialize(): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.initializeRedis();
          break;
          
        case 'file':
          await this.initializeFileCache();
          break;
          
        case 'memory':
        default:
          this.initializeMemoryCache();
          break;
      }
      
      // Démarrage du nettoyage automatique
      this.startCleanupScheduler();
      
    } catch (error) {
      console.warn('Cache initialization failed, falling back to memory cache:', error);
      this.config.provider = 'memory';
      this.initializeMemoryCache();
    }
  }
  
  /**
   * Stocke une valeur dans le cache
   * @param key Clé de cache
   * @param value Valeur à stocker
   * @param ttl Durée de vie en secondes (optionnel)
   * @param options Options de cache
   */
  public async set<T>(
    key: string, 
    value: T, 
    ttl?: number, 
    options: CacheOptions = {}
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const actualTTL = ttl || this.config.ttl;
      const fullKey = this.buildKey(key, options.namespace);
      
      const entry: CacheEntry<T> = {
        key: fullKey,
        value: value,
        expiresAt: Date.now() + (actualTTL * 1000),
        createdAt: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        tags: options.tags,
        compressed: false
      };
      
      // Compression si activée
      if (options.compress || (this.compressionEnabled && this.shouldCompress(value))) {
        entry.value = await this.compressValue(value) as T;
        entry.compressed = true;
      }
      
      switch (this.config.provider) {
        case 'redis':
          await this.setRedis(fullKey, entry, actualTTL);
          break;
          
        case 'file':
          await this.setFile(fullKey, entry);
          break;
          
        case 'memory':
        default:
          await this.setMemory(fullKey, entry);
          break;
      }
      
    } finally {
      this.updateStatistics('set', Date.now() - startTime);
    }
  }
  
  /**
   * Récupère une valeur depuis le cache
   * @param key Clé de cache
   * @param namespace Namespace optionnel
   */
  public async get<T>(key: string, namespace?: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const fullKey = this.buildKey(key, namespace);
      let entry: CacheEntry<T> | null = null;
      
      switch (this.config.provider) {
        case 'redis':
          entry = await this.getRedis<T>(fullKey);
          break;
          
        case 'file':
          entry = await this.getFile<T>(fullKey);
          break;
          
        case 'memory':
        default:
          entry = await this.getMemory<T>(fullKey);
          break;
      }
      
      if (!entry) {
        this.statistics.misses++;
        return null;
      }
      
      // Vérification de l'expiration
      if (Date.now() > entry.expiresAt) {
        await this.delete(key, namespace);
        this.statistics.misses++;
        return null;
      }
      
      // Mise à jour des statistiques d'accès
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      // Décompression si nécessaire
      let value = entry.value;
      if (entry.compressed) {
        value = await this.decompressValue(entry.value) as T;
      }
      
      this.statistics.hits++;
      return value;
      
    } finally {
      this.updateStatistics('get', Date.now() - startTime);
    }
  }
  
  /**
   * Supprime une entrée du cache
   * @param key Clé de cache
   * @param namespace Namespace optionnel
   */
  public async delete(key: string, namespace?: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const fullKey = this.buildKey(key, namespace);
      
      switch (this.config.provider) {
        case 'redis':
          return await this.deleteRedis(fullKey);
          
        case 'file':
          return await this.deleteFile(fullKey);
          
        case 'memory':
        default:
          return await this.deleteMemory(fullKey);
      }
      
    } finally {
      this.updateStatistics('delete', Date.now() - startTime);
    }
  }
  
  /**
   * Vide complètement le cache
   */
  public async clear(): Promise<void> {
    const startTime = Date.now();
    
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.clearRedis();
          break;
          
        case 'file':
          await this.clearFile();
          break;
          
        case 'memory':
        default:
          await this.clearMemory();
          break;
      }
      
      // Reset des statistiques
      this.statistics = {
        hits: 0,
        misses: 0,
        evictions: 0,
        totalAccessTime: 0,
        operations: 0
      };
      
    } finally {
      this.updateStatistics('clear', Date.now() - startTime);
    }
  }
  
  /**
   * Vérifie si une clé existe dans le cache
   * @param key Clé à vérifier
   * @param namespace Namespace optionnel
   */
  public async has(key: string, namespace?: string): Promise<boolean> {
    const value = await this.get(key, namespace);
    return value !== null;
  }
  
  /**
   * Récupère multiple valeurs en une seule opération
   * @param keys Clés à récupérer
   * @param namespace Namespace optionnel
   */
  public async getMultiple<T>(keys: string[], namespace?: string): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};
    
    // Pour l'optimisation, on pourrait implémenter des requêtes batch spécifiques à chaque provider
    const promises = keys.map(async (key) => {
      const value = await this.get<T>(key, namespace);
      return { key, value };
    });
    
    const resolved = await Promise.all(promises);
    
    resolved.forEach(({ key, value }) => {
      results[key] = value;
    });
    
    return results;
  }
  
  /**
   * Stocke multiple valeurs en une seule opération
   * @param entries Entrées à stocker
   * @param ttl Durée de vie commune
   * @param options Options communes
   */
  public async setMultiple<T>(
    entries: Record<string, T>,
    ttl?: number,
    options: CacheOptions = {}
  ): Promise<void> {
    const promises = Object.entries(entries).map(([key, value]) =>
      this.set(key, value, ttl, options)
    );
    
    await Promise.all(promises);
  }
  
  /**
   * Invalide les entrées par tags
   * @param tags Tags à invalider
   */
  public async invalidateByTags(tags: string[]): Promise<number> {
    let invalidatedCount = 0;
    
    if (this.config.provider === 'memory') {
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
          this.memoryCache.delete(key);
          invalidatedCount++;
        }
      }
    }
    
    // Pour Redis et File, cela nécessiterait une implémentation plus complexe
    // avec indexation des tags
    
    return invalidatedCount;
  }
  
  /**
   * Récupère les statistiques du cache
   */
  public getStatistics(): CacheStatistics {
    const totalRequests = this.statistics.hits + this.statistics.misses;
    const hitRate = totalRequests > 0 ? (this.statistics.hits / totalRequests) * 100 : 0;
    const missRate = 100 - hitRate;
    
    let totalEntries = 0;
    let totalMemoryUsage = 0;
    let topKeys: Array<{ key: string; accessCount: number; lastAccessed: Date }> = [];
    let expiredEntries = 0;
    
    if (this.config.provider === 'memory') {
      totalEntries = this.memoryCache.size;
      
      const now = Date.now();
      const entries = Array.from(this.memoryCache.values());
      
      // Calcul de l'usage mémoire (approximatif)
      totalMemoryUsage = entries.reduce((total, entry) => {
        return total + JSON.stringify(entry).length * 2; // Approximation UTF-16
      }, 0);
      
      // Top des clés les plus accédées
      topKeys = entries
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 10)
        .map(entry => ({
          key: entry.key,
          accessCount: entry.accessCount,
          lastAccessed: new Date(entry.lastAccessed)
        }));
      
      // Comptage des entrées expirées
      expiredEntries = entries.filter(entry => now > entry.expiresAt).length;
    }
    
    return {
      totalEntries,
      totalMemoryUsage,
      hitRate,
      missRate,
      evictionCount: this.statistics.evictions,
      averageAccessTime: this.statistics.operations > 0 ? 
        this.statistics.totalAccessTime / this.statistics.operations : 0,
      topKeys,
      expiredEntries,
      compressionRatio: 0 // TODO: Calculer le ratio de compression
    };
  }
  
  /**
   * Nettoyage manuel des entrées expirées
   */
  public async cleanup(): Promise<number> {
    let cleanedCount = 0;
    
    if (this.config.provider === 'memory') {
      const now = Date.now();
      
      for (const [key, entry] of this.memoryCache.entries()) {
        if (now > entry.expiresAt) {
          this.memoryCache.delete(key);
          cleanedCount++;
        }
      }
      
      this.statistics.evictions += cleanedCount;
    }
    
    return cleanedCount;
  }
  
  /**
   * Fermeture propre du gestionnaire de cache
   */
  public async close(): Promise<void> {
    // Arrêt du scheduler de nettoyage
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Fermeture des connexions
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
    
    // Nettoyage final
    this.memoryCache.clear();
  }
  
  /**
   * Méthodes privées pour chaque provider
   */
  
  private initializeMemoryCache(): void {
    // Rien de spécial à initialiser pour le cache mémoire
  }
  
  private async initializeRedis(): Promise<void> {
    if (!this.config.redisUrl) {
      throw new OutlookError('CACHE_CONFIG_ERROR', 'Redis URL is required for Redis cache');
    }
    
    this.redisClient = createClient({ url: this.config.redisUrl });
    
    this.redisClient.on('error', (error) => {
      console.error('Redis cache error:', error);
    });
    
    await this.redisClient.connect();
  }
  
  private async initializeFileCache(): Promise<void> {
    this.fileCachePath = this.config.filePath || path.join(process.cwd(), 'cache');
    
    // Créer le répertoire s'il n'existe pas
    try {
      await fs.mkdir(this.fileCachePath, { recursive: true });
    } catch (error) {
      throw new OutlookError('CACHE_INIT_ERROR', `Failed to create cache directory: ${error}`);
    }
  }
  
  private async setMemory<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // Vérification de la limite de taille
    if (this.config.maxSize && this.memoryCache.size >= this.config.maxSize) {
      await this.evictLRU();
    }
    
    this.memoryCache.set(key, entry);
  }
  
  private async getMemory<T>(key: string): Promise<CacheEntry<T> | null> {
    return this.memoryCache.get(key) as CacheEntry<T> || null;
  }
  
  private async deleteMemory(key: string): Promise<boolean> {
    return this.memoryCache.delete(key);
  }
  
  private async clearMemory(): Promise<void> {
    this.memoryCache.clear();
  }
  
  private async setRedis<T>(key: string, entry: CacheEntry<T>, ttl: number): Promise<void> {
    if (!this.redisClient) return;
    
    const serialized = JSON.stringify(entry);
    await this.redisClient.setEx(key, ttl, serialized);
  }
  
  private async getRedis<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.redisClient) return null;
    
    const serialized = await this.redisClient.get(key);
    if (!serialized) return null;
    
    try {
      return JSON.parse(serialized) as CacheEntry<T>;
    } catch {
      return null;
    }
  }
  
  private async deleteRedis(key: string): Promise<boolean> {
    if (!this.redisClient) return false;
    
    const result = await this.redisClient.del(key);
    return result > 0;
  }
  
  private async clearRedis(): Promise<void> {
    if (!this.redisClient) return;
    
    await this.redisClient.flushDb();
  }
  
  private async setFile<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.fileCachePath) return;
    
    const fileName = this.sanitizeFileName(key) + '.json';
    const filePath = path.join(this.fileCachePath, fileName);
    const serialized = JSON.stringify(entry, null, 2);
    
    await fs.writeFile(filePath, serialized, 'utf8');
  }
  
  private async getFile<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.fileCachePath) return null;
    
    const fileName = this.sanitizeFileName(key) + '.json';
    const filePath = path.join(this.fileCachePath, fileName);
    
    try {
      const serialized = await fs.readFile(filePath, 'utf8');
      return JSON.parse(serialized) as CacheEntry<T>;
    } catch {
      return null;
    }
  }
  
  private async deleteFile(key: string): Promise<boolean> {
    if (!this.fileCachePath) return false;
    
    const fileName = this.sanitizeFileName(key) + '.json';
    const filePath = path.join(this.fileCachePath, fileName);
    
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  private async clearFile(): Promise<void> {
    if (!this.fileCachePath) return;
    
    try {
      const files = await fs.readdir(this.fileCachePath);
      const deletePromises = files
        .filter(file => file.endsWith('.json'))
        .map(file => fs.unlink(path.join(this.fileCachePath!, file)));
      
      await Promise.all(deletePromises);
    } catch {
      // Ignorer les erreurs lors du nettoyage
    }
  }
  
  /**
   * Méthodes utilitaires
   */
  
  private buildKey(key: string, namespace?: string): string {
    const prefix = namespace || 'outlook';
    return `${prefix}:${key}`;
  }
  
  private sanitizeFileName(key: string): string {
    return key.replace(/[^a-zA-Z0-9-_]/g, '_');
  }
  
  private shouldCompress(value: any): boolean {
    const serialized = JSON.stringify(value);
    return serialized.length > 1024; // Comprimer si > 1KB
  }
  
  private async compressValue(value: any): Promise<string> {
    // Implémentation simple de compression (base64)
    const serialized = JSON.stringify(value);
    return Buffer.from(serialized).toString('base64');
  }
  
  private async decompressValue(compressedValue: any): Promise<any> {
    // Décompression correspondante
    if (typeof compressedValue === 'string') {
      try {
        const serialized = Buffer.from(compressedValue, 'base64').toString();
        return JSON.parse(serialized);
      } catch {
        return compressedValue; // Fallback si pas compressé
      }
    }
    return compressedValue;
  }
  
  private async evictLRU(): Promise<void> {
    if (this.memoryCache.size === 0) return;
    
    // Trouver l'entrée la moins récemment utilisée
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.statistics.evictions++;
    }
  }
  
  private updateStatistics(operation: string, duration: number): void {
    this.statistics.operations++;
    this.statistics.totalAccessTime += duration;
  }
  
  private startCleanupScheduler(): void {
    // Nettoyage automatique toutes les 5 minutes
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        console.warn('Cache cleanup error:', error);
      }
    }, 5 * 60 * 1000);
  }
}

export default CacheManager;