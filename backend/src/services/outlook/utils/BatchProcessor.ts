/**
 * BatchProcessor.ts - Processeur de batch avancé pour opérations en lot
 * Optimise les performances avec traitement parallèle et gestion d'erreurs
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { EventEmitter } from 'events';
import { AuditLogger } from '../security/AuditLogger';
import { RetryMechanism } from './RetryMechanism';
import { OutlookErrorHandler } from './OutlookErrorHandler';
import {
  BatchConfig,
  BatchJob,
  BatchResult,
  BatchStatistics,
  BatchProcessor as IBatchProcessor,
  BatchProcessingMode,
  BatchErrorStrategy,
  BatchItem
} from '../config/outlook.types';

/**
 * Configuration par défaut du batch processor
 */
const DEFAULT_BATCH_CONFIG: BatchConfig = {
  batchSize: 20,
  maxConcurrency: 5,
  processingMode: 'parallel',
  errorStrategy: 'continue',
  retryFailedItems: true,
  maxRetries: 3,
  delayBetweenBatches: 100,
  timeout: 30000,
  enableStatistics: true,
  enableProgressTracking: true
};

/**
 * Processeur de batch principal
 */
export class BatchProcessor<TInput, TOutput> extends EventEmitter implements IBatchProcessor<TInput, TOutput> {
  private readonly config: BatchConfig;
  private readonly auditLogger?: AuditLogger;
  private readonly retryMechanism?: RetryMechanism;
  private readonly errorHandler: OutlookErrorHandler;
  
  private activeJobs: Map<string, BatchJob<TInput, TOutput>> = new Map();
  private statistics: BatchStatistics = {
    totalBatches: 0,
    successfulBatches: 0,
    failedBatches: 0,
    totalItems: 0,
    successfulItems: 0,
    failedItems: 0,
    averageBatchSize: 0,
    averageProcessingTime: 0,
    totalProcessingTime: 0
  };

  constructor(
    config: Partial<BatchConfig> = {},
    dependencies: {
      auditLogger?: AuditLogger;
      retryMechanism?: RetryMechanism;
      errorHandler: OutlookErrorHandler;
    }
  ) {
    super();
    
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
    this.auditLogger = dependencies.auditLogger;
    this.retryMechanism = dependencies.retryMechanism;
    this.errorHandler = dependencies.errorHandler;
    
    this.auditLogger?.log('info', 'BatchProcessor initialized', {
      component: 'BatchProcessor',
      batchSize: this.config.batchSize,
      maxConcurrency: this.config.maxConcurrency,
      processingMode: this.config.processingMode
    });
  }

  /**
   * Traite une collection d'éléments en batches
   */
  async processBatch(
    items: TInput[],
    processor: (item: TInput, index: number, batch: TInput[]) => Promise<TOutput>,
    options: {
      jobId?: string;
      customConfig?: Partial<BatchConfig>;
      onProgress?: (progress: { completed: number; total: number; percentage: number }) => void;
      onBatchComplete?: (batchResult: BatchResult<TOutput>) => void;
    } = {}
  ): Promise<BatchResult<TOutput>> {
    const { jobId = this.generateJobId(), customConfig, onProgress, onBatchComplete } = options;
    const effectiveConfig = { ...this.config, ...customConfig };
    const startTime = Date.now();
    
    if (items.length === 0) {
      return {
        jobId,
        success: true,
        results: [],
        errors: [],
        statistics: {
          totalItems: 0,
          successfulItems: 0,
          failedItems: 0,
          processingTime: 0,
          throughput: 0
        }
      };
    }

    this.auditLogger?.log('info', 'Starting batch processing', {
      component: 'BatchProcessor',
      jobId,
      totalItems: items.length,
      batchSize: effectiveConfig.batchSize,
      processingMode: effectiveConfig.processingMode
    });

    // Créer et enregistrer le job
    const job: BatchJob<TInput, TOutput> = {
      id: jobId,
      items,
      startTime,
      status: 'running',
      progress: { completed: 0, total: items.length, percentage: 0 },
      config: effectiveConfig,
      results: [],
      errors: []
    };
    
    this.activeJobs.set(jobId, job);
    this.emit('jobStarted', { jobId, totalItems: items.length });

    try {
      // Diviser en batches
      const batches = this.createBatches(items, effectiveConfig.batchSize);
      const results: TOutput[] = [];
      const errors: Array<{ item: TInput; index: number; error: Error }> = [];
      
      this.statistics.totalBatches += batches.length;
      this.statistics.totalItems += items.length;

      // Traiter les batches selon le mode configuré
      if (effectiveConfig.processingMode === 'parallel') {
        const batchResults = await this.processParallelBatches(
          batches,
          processor,
          job,
          onProgress,
          onBatchComplete
        );
        
        batchResults.forEach(batchResult => {
          results.push(...batchResult.results);
          errors.push(...batchResult.errors);
        });
      } else {
        const batchResult = await this.processSequentialBatches(
          batches,
          processor,
          job,
          onProgress,
          onBatchComplete
        );
        
        results.push(...batchResult.results);
        errors.push(...batchResult.errors);
      }

      // Gérer les éléments échoués selon la stratégie
      if (errors.length > 0 && effectiveConfig.retryFailedItems) {
        const retryResults = await this.retryFailedItems(
          errors.map(e => e.item),
          processor,
          job
        );
        
        retryResults.successful.forEach((result, index) => {
          const originalIndex = errors[index].index;
          results[originalIndex] = result;
        });
        
        // Mettre à jour les erreurs avec seulement celles qui ont vraiment échoué
        const finalErrors = retryResults.failed.map((error, index) => ({
          item: errors[index].item,
          index: errors[index].index,
          error
        }));
        
        errors.splice(0, errors.length, ...finalErrors);
      }

      const processingTime = Date.now() - startTime;
      const successfulItems = results.length;
      const failedItems = errors.length;
      
      // Mettre à jour les statistiques
      this.updateStatistics(items.length, successfulItems, failedItems, processingTime);
      
      // Finaliser le job
      job.status = errors.length === 0 ? 'completed' : 'completed_with_errors';
      job.endTime = Date.now();
      job.results = results;
      job.errors = errors;
      
      const finalResult: BatchResult<TOutput> = {
        jobId,
        success: errors.length === 0,
        results,
        errors,
        statistics: {
          totalItems: items.length,
          successfulItems,
          failedItems,
          processingTime,
          throughput: (successfulItems / processingTime) * 1000 // items per second
        }
      };

      this.emit('jobCompleted', {
        jobId,
        success: finalResult.success,
        statistics: finalResult.statistics
      });

      this.auditLogger?.log('info', 'Batch processing completed', {
        component: 'BatchProcessor',
        jobId,
        totalItems: items.length,
        successfulItems,
        failedItems,
        processingTime,
        throughput: finalResult.statistics.throughput
      });

      return finalResult;

    } catch (error) {
      job.status = 'failed';
      job.endTime = Date.now();
      job.errors.push({ item: items[0], index: 0, error: error as Error });
      
      this.statistics.failedBatches++;
      this.statistics.failedItems += items.length;
      
      this.emit('jobFailed', { jobId, error: error as Error });
      
      this.auditLogger?.log('error', 'Batch processing failed', {
        component: 'BatchProcessor',
        jobId,
        error: (error as Error).message,
        totalItems: items.length
      });
      
      throw error;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Divise les éléments en batches
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Traite les batches en parallèle
   */
  private async processParallelBatches<TIn, TOut>(
    batches: TIn[][],
    processor: (item: TIn, index: number, batch: TIn[]) => Promise<TOut>,
    job: BatchJob<TInput, TOutput>,
    onProgress?: (progress: { completed: number; total: number; percentage: number }) => void,
    onBatchComplete?: (batchResult: BatchResult<TOut>) => void
  ): Promise<Array<{ results: TOut[]; errors: Array<{ item: TIn; index: number; error: Error }> }>> {
    const semaphore = new Semaphore(this.config.maxConcurrency);
    const promises = batches.map(async (batch, batchIndex) => {
      return semaphore.acquire(async () => {
        const batchStartTime = Date.now();
        
        try {
          const batchResult = await this.processSingleBatch(
            batch,
            processor,
            batchIndex * this.config.batchSize
          );
          
          // Mettre à jour le progrès
          job.progress.completed += batch.length;
          job.progress.percentage = (job.progress.completed / job.progress.total) * 100;
          
          if (onProgress) {
            onProgress(job.progress);
          }
          
          this.emit('batchProgress', {
            jobId: job.id,
            progress: job.progress,
            batchIndex,
            batchSize: batch.length
          });
          
          if (onBatchComplete) {
            onBatchComplete({
              jobId: job.id,
              success: batchResult.errors.length === 0,
              results: batchResult.results,
              errors: batchResult.errors,
              statistics: {
                totalItems: batch.length,
                successfulItems: batchResult.results.length,
                failedItems: batchResult.errors.length,
                processingTime: Date.now() - batchStartTime,
                throughput: (batchResult.results.length / (Date.now() - batchStartTime)) * 1000
              }
            });
          }
          
          return batchResult;
          
        } finally {
          // Délai entre les batches si configuré
          if (this.config.delayBetweenBatches > 0) {
            await this.delay(this.config.delayBetweenBatches);
          }
        }
      });
    });

    return Promise.all(promises);
  }

  /**
   * Traite les batches séquentiellement
   */
  private async processSequentialBatches<TIn, TOut>(
    batches: TIn[][],
    processor: (item: TIn, index: number, batch: TIn[]) => Promise<TOut>,
    job: BatchJob<TInput, TOutput>,
    onProgress?: (progress: { completed: number; total: number; percentage: number }) => void,
    onBatchComplete?: (batchResult: BatchResult<TOut>) => void
  ): Promise<{ results: TOut[]; errors: Array<{ item: TIn; index: number; error: Error }> }> {
    const results: TOut[] = [];
    const errors: Array<{ item: TIn; index: number; error: Error }> = [];
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartTime = Date.now();
      
      try {
        const batchResult = await this.processSingleBatch(
          batch,
          processor,
          batchIndex * this.config.batchSize
        );
        
        results.push(...batchResult.results);
        errors.push(...batchResult.errors);
        
        // Mettre à jour le progrès
        job.progress.completed += batch.length;
        job.progress.percentage = (job.progress.completed / job.progress.total) * 100;
        
        if (onProgress) {
          onProgress(job.progress);
        }
        
        this.emit('batchProgress', {
          jobId: job.id,
          progress: job.progress,
          batchIndex,
          batchSize: batch.length
        });
        
        if (onBatchComplete) {
          onBatchComplete({
            jobId: job.id,
            success: batchResult.errors.length === 0,
            results: batchResult.results,
            errors: batchResult.errors,
            statistics: {
              totalItems: batch.length,
              successfulItems: batchResult.results.length,
              failedItems: batchResult.errors.length,
              processingTime: Date.now() - batchStartTime,
              throughput: (batchResult.results.length / (Date.now() - batchStartTime)) * 1000
            }
          });
        }
        
      } finally {
        // Délai entre les batches
        if (this.config.delayBetweenBatches > 0 && batchIndex < batches.length - 1) {
          await this.delay(this.config.delayBetweenBatches);
        }
      }
    }
    
    return { results, errors };
  }

  /**
   * Traite un batch individuel
   */
  private async processSingleBatch<TIn, TOut>(
    batch: TIn[],
    processor: (item: TIn, index: number, batch: TIn[]) => Promise<TOut>,
    baseIndex: number
  ): Promise<{ results: TOut[]; errors: Array<{ item: TIn; index: number; error: Error }> }> {
    const results: TOut[] = [];
    const errors: Array<{ item: TIn; index: number; error: Error }> = [];
    
    if (this.config.processingMode === 'parallel') {
      // Traitement parallèle des éléments du batch
      const promises = batch.map(async (item, itemIndex) => {
        try {
          const result = await this.processItemWithTimeout(
            item,
            baseIndex + itemIndex,
            batch,
            processor
          );
          return { success: true, result, index: itemIndex };
        } catch (error) {
          return { 
            success: false, 
            error: error as Error, 
            item, 
            index: baseIndex + itemIndex 
          };
        }
      });
      
      const outcomes = await Promise.all(promises);
      
      outcomes.forEach((outcome, index) => {
        if (outcome.success) {
          results[index] = (outcome as any).result;
        } else {
          errors.push({
            item: (outcome as any).item,
            index: (outcome as any).index,
            error: (outcome as any).error
          });
        }
      });
      
    } else {
      // Traitement séquentiel des éléments du batch
      for (let itemIndex = 0; itemIndex < batch.length; itemIndex++) {
        const item = batch[itemIndex];
        try {
          const result = await this.processItemWithTimeout(
            item,
            baseIndex + itemIndex,
            batch,
            processor
          );
          results[itemIndex] = result;
        } catch (error) {
          errors.push({
            item,
            index: baseIndex + itemIndex,
            error: error as Error
          });
          
          // Appliquer la stratégie d'erreur
          if (this.config.errorStrategy === 'stop') {
            break;
          }
        }
      }
    }
    
    return { results, errors };
  }

  /**
   * Traite un élément avec timeout
   */
  private async processItemWithTimeout<TIn, TOut>(
    item: TIn,
    index: number,
    batch: TIn[],
    processor: (item: TIn, index: number, batch: TIn[]) => Promise<TOut>
  ): Promise<TOut> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Processing timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });
    
    const processingPromise = processor(item, index, batch);
    
    return Promise.race([processingPromise, timeoutPromise]);
  }

  /**
   * Réessaie les éléments échoués
   */
  private async retryFailedItems<TIn, TOut>(
    failedItems: TIn[],
    processor: (item: TIn, index: number, batch: TIn[]) => Promise<TOut>,
    job: BatchJob<TInput, TOutput>
  ): Promise<{ successful: TOut[]; failed: Error[] }> {
    if (!this.retryMechanism || failedItems.length === 0) {
      return { successful: [], failed: [] };
    }

    this.auditLogger?.log('info', 'Retrying failed items', {
      component: 'BatchProcessor',
      jobId: job.id,
      failedItemsCount: failedItems.length
    });

    const successful: TOut[] = [];
    const failed: Error[] = [];
    
    for (let i = 0; i < failedItems.length; i++) {
      const item = failedItems[i];
      
      try {
        const result = await this.retryMechanism.execute(
          () => processor(item, i, failedItems),
          `retry-item-${i}`,
          { maxRetries: this.config.maxRetries }
        );
        
        if (result.success) {
          successful.push(result.result!);
        } else {
          failed.push(result.error!);
        }
      } catch (error) {
        failed.push(error as Error);
      }
    }
    
    this.auditLogger?.log('info', 'Retry completed', {
      component: 'BatchProcessor',
      jobId: job.id,
      retriedItems: failedItems.length,
      successful: successful.length,
      failed: failed.length
    });
    
    return { successful, failed };
  }

  /**
   * Met à jour les statistiques
   */
  private updateStatistics(
    totalItems: number,
    successfulItems: number,
    failedItems: number,
    processingTime: number
  ): void {
    this.statistics.successfulBatches++;
    this.statistics.successfulItems += successfulItems;
    this.statistics.failedItems += failedItems;
    this.statistics.totalProcessingTime += processingTime;
    
    const totalBatches = this.statistics.totalBatches;
    const totalProcessingTime = this.statistics.totalProcessingTime;
    
    this.statistics.averageBatchSize = this.statistics.totalItems / totalBatches;
    this.statistics.averageProcessingTime = totalProcessingTime / totalBatches;
  }

  /**
   * Génère un ID unique pour le job
   */
  private generateJobId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Fonction utilitaire pour attendre
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtient les jobs actifs
   */
  getActiveJobs(): BatchJob<TInput, TOutput>[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Obtient un job spécifique par ID
   */
  getJob(jobId: string): BatchJob<TInput, TOutput> | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Annule un job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    
    if (job && job.status === 'running') {
      job.status = 'cancelled';
      job.endTime = Date.now();
      
      this.emit('jobCancelled', { jobId });
      
      this.auditLogger?.log('info', 'Batch job cancelled', {
        component: 'BatchProcessor',
        jobId
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Obtient les statistiques globales
   */
  getStatistics(): BatchStatistics {
    return { ...this.statistics };
  }

  /**
   * Réinitialise les statistiques
   */
  resetStatistics(): void {
    this.statistics = {
      totalBatches: 0,
      successfulBatches: 0,
      failedBatches: 0,
      totalItems: 0,
      successfulItems: 0,
      failedItems: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0
    };
    
    this.auditLogger?.log('info', 'Batch processor statistics reset', {
      component: 'BatchProcessor'
    });
  }

  /**
   * Nettoie les ressources
   */
  async dispose(): Promise<void> {
    // Annuler tous les jobs actifs
    const activeJobIds = Array.from(this.activeJobs.keys());
    for (const jobId of activeJobIds) {
      await this.cancelJob(jobId);
    }
    
    this.activeJobs.clear();
    this.removeAllListeners();
    
    this.auditLogger?.log('info', 'BatchProcessor disposed', {
      component: 'BatchProcessor',
      finalStatistics: this.getStatistics()
    });
  }
}

/**
 * Sémaphore pour limiter la concurrence
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.permits > 0) {
        this.permits--;
        this.executeWithRelease(fn, resolve, reject);
      } else {
        this.waiting.push(() => {
          this.permits--;
          this.executeWithRelease(fn, resolve, reject);
        });
      }
    });
  }

  private async executeWithRelease<T>(
    fn: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (error: any) => void
  ): Promise<void> {
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.release();
    }
  }

  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) {
        next();
      }
    }
  }
}

/**
 * Factory pour créer des instances de BatchProcessor
 */
export class BatchProcessorFactory {
  /**
   * Crée une instance par défaut
   */
  static createDefault<TInput, TOutput>(
    errorHandler: OutlookErrorHandler
  ): BatchProcessor<TInput, TOutput> {
    return new BatchProcessor<TInput, TOutput>({}, { errorHandler });
  }

  /**
   * Crée une instance optimisée pour les opérations d'API
   */
  static createForAPI<TInput, TOutput>(
    errorHandler: OutlookErrorHandler,
    retryMechanism?: RetryMechanism
  ): BatchProcessor<TInput, TOutput> {
    return new BatchProcessor<TInput, TOutput>({
      batchSize: 10,
      maxConcurrency: 3,
      processingMode: 'parallel',
      errorStrategy: 'continue',
      retryFailedItems: true,
      maxRetries: 2,
      delayBetweenBatches: 500,
      timeout: 15000
    }, { errorHandler, retryMechanism });
  }

  /**
   * Crée une instance optimisée pour les opérations de base de données
   */
  static createForDatabase<TInput, TOutput>(
    errorHandler: OutlookErrorHandler
  ): BatchProcessor<TInput, TOutput> {
    return new BatchProcessor<TInput, TOutput>({
      batchSize: 50,
      maxConcurrency: 2,
      processingMode: 'sequential',
      errorStrategy: 'continue',
      retryFailedItems: false,
      delayBetweenBatches: 100,
      timeout: 30000
    }, { errorHandler });
  }
}

export default BatchProcessor;