/**
 * Advanced Performance Optimizations
 * Memory-efficient, high-performance utilities
 */

import { logger } from './logger';

// Virtual scrolling implementation
export class VirtualScroller<T> {
  private items: T[] = [];
  private itemHeight: number;
  private containerHeight: number;
  private scrollTop = 0;
  private overscan = 3;
  private callbacks: Set<() => void> = new Set();

  constructor(
    items: T[],
    itemHeight: number,
    containerHeight: number
  ) {
    this.items = items;
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
  }

  updateScroll(scrollTop: number): void {
    this.scrollTop = scrollTop;
    this.notifySubscribers();
  }

  updateContainerHeight(height: number): void {
    this.containerHeight = height;
    this.notifySubscribers();
  }

  getVisibleItems(): { items: T[]; startIndex: number; endIndex: number } {
    const startIndex = Math.max(
      0,
      Math.floor(this.scrollTop / this.itemHeight) - this.overscan
    );
    
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const endIndex = Math.min(
      this.items.length,
      startIndex + visibleCount + this.overscan * 2
    );

    return {
      items: this.items.slice(startIndex, endIndex),
      startIndex,
      endIndex
    };
  }

  getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }

  getOffsetY(index: number): number {
    return index * this.itemHeight;
  }

  subscribe(callback: () => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifySubscribers(): void {
    this.callbacks.forEach(cb => cb());
  }
}

// Web Worker pool for parallel processing
export class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{
    data: any;
    resolve: (result: any) => void;
    reject: (error: any) => void;
  }> = [];
  private busyWorkers = new Set<Worker>();

  constructor(workerScript: string, poolSize = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      this.workers.push(worker);
    }
  }

  async process<T>(data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const availableWorker = this.getAvailableWorker();
      
      if (availableWorker) {
        this.executeOnWorker(availableWorker, data, resolve, reject);
      } else {
        this.queue.push({ data, resolve, reject });
      }
    });
  }

  private getAvailableWorker(): Worker | null {
    return this.workers.find(w => !this.busyWorkers.has(w)) || null;
  }

  private executeOnWorker(
    worker: Worker,
    data: any,
    resolve: (result: any) => void,
    reject: (error: any) => void
  ): void {
    this.busyWorkers.add(worker);

    const handleMessage = (e: MessageEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      this.busyWorkers.delete(worker);
      resolve(e.data);
      this.processQueue();
    };

    const handleError = (e: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      this.busyWorkers.delete(worker);
      reject(e);
      this.processQueue();
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage(data);
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;
    
    const worker = this.getAvailableWorker();
    if (worker) {
      const task = this.queue.shift()!;
      this.executeOnWorker(worker, task.data, task.resolve, task.reject);
    }
  }

  terminate(): void {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.queue = [];
    this.busyWorkers.clear();
  }
}

// Memory cache with LRU eviction
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  private accessOrder: K[] = [];

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    
    // Move to end (most recently used)
    this.updateAccessOrder(key);
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      const oldest = this.accessOrder.shift();
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, value);
    this.updateAccessOrder(key);
  }

  private updateAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }
}

// Request deduplication
export class RequestDeduper {
  private pending = new Map<string, Promise<any>>();

  async dedupe<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Return existing promise if request is in flight
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    // Create new request
    const promise = fetcher()
      .then(result => {
        this.pending.delete(key);
        return result;
      })
      .catch(error => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pending.clear();
  }
}

// Batch processor for reducing API calls
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private processor: (items: T[]) => Promise<R[]>;
  private maxBatchSize: number;
  private maxWaitTime: number;
  private pendingResolvers: Array<{
    item: T;
    resolve: (result: R) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    maxBatchSize = 10,
    maxWaitTime = 50
  ) {
    this.processor = processor;
    this.maxBatchSize = maxBatchSize;
    this.maxWaitTime = maxWaitTime;
  }

  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.batch.push(item);
      this.pendingResolvers.push({ item, resolve, reject });

      if (this.batch.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.maxWaitTime);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.batch.length === 0) return;

    const batchToProcess = [...this.batch];
    const resolvers = [...this.pendingResolvers];
    this.batch = [];
    this.pendingResolvers = [];

    try {
      const results = await this.processor(batchToProcess);
      
      resolvers.forEach((resolver, index) => {
        resolver.resolve(results[index]);
      });
    } catch (error) {
      resolvers.forEach(resolver => {
        resolver.reject(error);
      });
    }
  }
}

// Intersection Observer pooling
export class IntersectionObserverPool {
  private observers = new Map<string, IntersectionObserver>();
  private elements = new Map<Element, Set<(entry: IntersectionObserverEntry) => void>>();

  observe(
    element: Element,
    callback: (entry: IntersectionObserverEntry) => void,
    options?: IntersectionObserverInit
  ): () => void {
    const key = JSON.stringify(options || {});
    
    if (!this.observers.has(key)) {
      this.observers.set(key, new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            const callbacks = this.elements.get(entry.target);
            callbacks?.forEach(cb => cb(entry));
          });
        },
        options
      ));
    }

    const observer = this.observers.get(key)!;
    
    if (!this.elements.has(element)) {
      this.elements.set(element, new Set());
      observer.observe(element);
    }
    
    this.elements.get(element)!.add(callback);

    // Return cleanup function
    return () => {
      const callbacks = this.elements.get(element);
      callbacks?.delete(callback);
      
      if (callbacks?.size === 0) {
        observer.unobserve(element);
        this.elements.delete(element);
      }
    };
  }

  disconnect(): void {
    this.observers.forEach(o => o.disconnect());
    this.observers.clear();
    this.elements.clear();
  }
}

// RAF scheduler for smooth animations
export class RAFScheduler {
  private tasks = new Map<string, () => void>();
  private rafId: number | null = null;
  private isRunning = false;

  schedule(id: string, task: () => void): void {
    this.tasks.set(id, task);
    
    if (!this.isRunning) {
      this.start();
    }
  }

  cancel(id: string): void {
    this.tasks.delete(id);
    
    if (this.tasks.size === 0) {
      this.stop();
    }
  }

  private start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const frame = () => {
      this.tasks.forEach(task => task());
      
      if (this.tasks.size > 0) {
        this.rafId = requestAnimationFrame(frame);
      } else {
        this.stop();
      }
    };
    
    this.rafId = requestAnimationFrame(frame);
  }

  private stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isRunning = false;
  }

  clear(): void {
    this.tasks.clear();
    this.stop();
  }
}

// Image optimization and lazy loading
export class ImageOptimizer {
  private observer: IntersectionObserver;
  private loadedImages = new Set<string>();

  constructor(
    private options = {
      rootMargin: '50px',
      threshold: 0.01,
      fadeIn: true
    }
  ) {
    this.observer = new IntersectionObserver(
      entries => this.handleIntersection(entries),
      {
        rootMargin: options.rootMargin,
        threshold: options.threshold
      }
    );
  }

  observe(img: HTMLImageElement): void {
    if (img.dataset.src && !this.loadedImages.has(img.dataset.src)) {
      this.observer.observe(img);
      
      // Add loading state
      img.classList.add('img-loading');
    }
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        this.loadImage(img);
      }
    });
  }

  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (!src) return;

    // Preload image
    const tempImg = new Image();
    
    tempImg.onload = () => {
      img.src = src;
      img.removeAttribute('data-src');
      this.loadedImages.add(src);
      this.observer.unobserve(img);
      
      // Add fade in effect
      if (this.options.fadeIn) {
        img.classList.remove('img-loading');
        img.classList.add('img-loaded');
      }
    };

    tempImg.onerror = () => {
      logger.error('Failed to load image', { src });
      img.classList.add('img-error');
    };

    tempImg.src = src;
  }

  disconnect(): void {
    this.observer.disconnect();
  }
}

// Performance budget monitor
export class PerformanceBudget {
  private budgets = new Map<string, number>();
  private measurements = new Map<string, number[]>();
  private violations: Array<{ metric: string; budget: number; actual: number }> = [];

  setBudget(metric: string, maxValue: number): void {
    this.budgets.set(metric, maxValue);
  }

  measure(metric: string, value: number): boolean {
    if (!this.measurements.has(metric)) {
      this.measurements.set(metric, []);
    }
    
    this.measurements.get(metric)!.push(value);
    
    const budget = this.budgets.get(metric);
    if (budget && value > budget) {
      this.violations.push({ metric, budget, actual: value });
      logger.warn(`Performance budget exceeded`, { metric, budget, actual: value });
      return false;
    }
    
    return true;
  }

  getAverages(): Map<string, number> {
    const averages = new Map<string, number>();
    
    this.measurements.forEach((values, metric) => {
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      averages.set(metric, avg);
    });
    
    return averages;
  }

  getViolations(): typeof this.violations {
    return [...this.violations];
  }

  reset(): void {
    this.measurements.clear();
    this.violations = [];
  }
}