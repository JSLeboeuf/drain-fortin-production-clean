// Parallel processing utilities for optimized backend operations

interface TaskResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
}

interface ParallelOptions {
  maxConcurrency?: number;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class ParallelProcessor {
  private defaultOptions: Required<ParallelOptions> = {
    maxConcurrency: 10,
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
  };

  // Process tasks in parallel with concurrency control
  async processParallel<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options?: ParallelOptions
  ): Promise<TaskResult<R>[]> {
    const opts = { ...this.defaultOptions, ...options };
    const results: TaskResult<R>[] = [];
    const queue = [...items];
    const inProgress = new Set<Promise<void>>();

    while (queue.length > 0 || inProgress.size > 0) {
      // Start new tasks up to concurrency limit
      while (inProgress.size < opts.maxConcurrency && queue.length > 0) {
        const item = queue.shift()!;
        const task = this.processItem(item, processor, opts)
          .then(result => {
            results.push(result);
            inProgress.delete(task);
          });
        inProgress.add(task);
      }

      // Wait for at least one task to complete
      if (inProgress.size > 0) {
        await Promise.race(inProgress);
      }
    }

    return results;
  }

  // Process single item with timeout and retry
  private async processItem<T, R>(
    item: T,
    processor: (item: T) => Promise<R>,
    options: Required<ParallelOptions>
  ): Promise<TaskResult<R>> {
    const start = performance.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < options.retries; attempt++) {
      try {
        const result = await this.withTimeout(
          processor(item),
          options.timeout
        );
        
        return {
          success: true,
          data: result,
          duration: performance.now() - start,
        };
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < options.retries - 1) {
          await this.delay(options.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: lastError,
      duration: performance.now() - start,
    };
  }

  // Batch process with automatic chunking
  async processBatch<T, R>(
    items: T[],
    batchProcessor: (batch: T[]) => Promise<R[]>,
    batchSize = 100
  ): Promise<R[]> {
    const results: R[] = [];
    const batches = this.chunkArray(items, batchSize);

    // Process batches in parallel
    const batchResults = await this.processParallel(
      batches,
      batchProcessor,
      { maxConcurrency: 5 } // Limit concurrent batches
    );

    // Flatten results
    for (const result of batchResults) {
      if (result.success && result.data) {
        results.push(...result.data);
      }
    }

    return results;
  }

  // Map-reduce pattern for aggregation
  async mapReduce<T, M, R>(
    items: T[],
    mapper: (item: T) => Promise<M>,
    reducer: (acc: R, mapped: M) => R,
    initialValue: R,
    options?: ParallelOptions
  ): Promise<R> {
    const mappedResults = await this.processParallel(items, mapper, options);
    
    let result = initialValue;
    for (const mapped of mappedResults) {
      if (mapped.success && mapped.data !== undefined) {
        result = reducer(result, mapped.data);
      }
    }
    
    return result;
  }

  // Pipeline pattern for sequential processing
  async pipeline<T>(
    input: T,
    ...processors: Array<(data: any) => Promise<any>>
  ): Promise<any> {
    let result = input;
    
    for (const processor of processors) {
      result = await processor(result);
    }
    
    return result;
  }

  // Fan-out/fan-in pattern
  async fanOutFanIn<T, R>(
    input: T,
    processors: Array<(input: T) => Promise<R>>
  ): Promise<R[]> {
    const promises = processors.map(processor => processor(input));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<R>).value);
  }

  // Race pattern with timeout
  async race<T>(
    processors: Array<() => Promise<T>>,
    timeout = 5000
  ): Promise<T> {
    const promises = [
      ...processors.map(p => p()),
      this.delay(timeout).then(() => {
        throw new Error('Race timeout');
      }),
    ];
    
    return Promise.race(promises);
  }

  // Throttled parallel execution
  async throttledProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    rateLimit: number, // items per second
    options?: ParallelOptions
  ): Promise<TaskResult<R>[]> {
    const delayBetween = 1000 / rateLimit;
    const results: TaskResult<R>[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const start = performance.now();
      
      const result = await this.processItem(
        items[i],
        processor,
        { ...this.defaultOptions, ...options }
      );
      
      results.push(result);
      
      // Throttle if needed
      const elapsed = performance.now() - start;
      if (elapsed < delayBetween) {
        await this.delay(delayBetween - elapsed);
      }
    }
    
    return results;
  }

  // Utility: Add timeout to promise
  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      ),
    ]);
  }

  // Utility: Delay helper
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility: Chunk array into batches
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Singleton instance
let processorInstance: ParallelProcessor | null = null;

export function getParallelProcessor(): ParallelProcessor {
  if (!processorInstance) {
    processorInstance = new ParallelProcessor();
  }
  return processorInstance;
}

// Decorators for parallel processing
export function parallel(options?: ParallelOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const processor = getParallelProcessor();
      
      // If the method returns an array, process in parallel
      const result = await originalMethod.apply(this, args);
      
      if (Array.isArray(result)) {
        return processor.processParallel(
          result,
          async (item) => item,
          options
        );
      }
      
      return result;
    };
    
    return descriptor;
  };
}

// Queue implementation for task scheduling
export class TaskQueue<T> {
  private queue: Array<() => Promise<T>> = [];
  private running = false;
  private concurrency: number;
  private active = 0;

  constructor(concurrency = 5) {
    this.concurrency = concurrency;
  }

  add(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });
      
      if (!this.running) {
        this.run();
      }
    });
  }

  private async run() {
    this.running = true;
    
    while (this.queue.length > 0 || this.active > 0) {
      while (this.active < this.concurrency && this.queue.length > 0) {
        const task = this.queue.shift()!;
        this.active++;
        
        task().finally(() => {
          this.active--;
        });
      }
      
      if (this.active > 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    this.running = false;
  }

  clear() {
    this.queue = [];
  }

  get size() {
    return this.queue.length;
  }

  get activeCount() {
    return this.active;
  }
}