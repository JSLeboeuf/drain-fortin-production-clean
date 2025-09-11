/**
 * SyncOrchestrator - Orchestration de la synchronisation
 */

import { CalendarEvent } from '../config/outlook.types';

export interface SyncState {
  lastSyncTime: Date;
  syncedItems: number;
  pendingItems: number;
  failedItems: number;
  status: 'idle' | 'syncing' | 'completed' | 'failed';
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Error[];
  duration: number;
}

export class SyncOrchestrator {
  private syncState: SyncState = {
    lastSyncTime: new Date(),
    syncedItems: 0,
    pendingItems: 0,
    failedItems: 0,
    status: 'idle'
  };

  constructor(private config?: { batchSize?: number; maxRetries?: number }) {}

  async orchestrateSync(
    items: CalendarEvent[],
    syncFn: (item: CalendarEvent) => Promise<void>
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    this.syncState.status = 'syncing';
    this.syncState.pendingItems = items.length;

    const batchSize = this.config?.batchSize || 10;
    const batches = this.createBatches(items, batchSize);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(item => this.syncItem(item, syncFn))
      );

      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          syncedCount++;
          this.syncState.syncedItems++;
        } else {
          failedCount++;
          this.syncState.failedItems++;
          errors.push(result.reason);
        }
        this.syncState.pendingItems--;
      });
    }

    this.syncState.status = syncedCount === items.length ? 'completed' : 'failed';
    this.syncState.lastSyncTime = new Date();

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      errors,
      duration: Date.now() - startTime
    };
  }

  private async syncItem(
    item: CalendarEvent,
    syncFn: (item: CalendarEvent) => Promise<void>
  ): Promise<void> {
    const maxRetries = this.config?.maxRetries || 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await syncFn(item);
        return;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Sync failed after retries');
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getSyncState(): SyncState {
    return { ...this.syncState };
  }
}