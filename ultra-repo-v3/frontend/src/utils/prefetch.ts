// Intelligent prefetching utilities for optimized navigation

interface PrefetchOptions {
  priority?: 'high' | 'low';
  delay?: number;
  threshold?: number;
}

class PrefetchManager {
  private prefetchedUrls = new Set<string>();
  private prefetchQueue: Array<() => Promise<void>> = [];
  private isIdle = false;
  private observer: IntersectionObserver | null = null;

  constructor() {
    // Setup idle detection
    if ('requestIdleCallback' in window) {
      this.setupIdleDetection();
    }
    
    // Setup network detection
    this.setupNetworkDetection();
    
    // Setup visibility change detection
    this.setupVisibilityDetection();
  }

  // Prefetch a single route
  async prefetchRoute(url: string, options: PrefetchOptions = {}) {
    const { priority = 'low', delay = 0 } = options;
    
    // Skip if already prefetched
    if (this.prefetchedUrls.has(url)) return;
    
    // Skip if on slow connection
    if (!this.shouldPrefetch()) return;
    
    const prefetchTask = async () => {
      await this.delay(delay);
      
      try {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = 'document';
        
        if (priority === 'high') {
          link.setAttribute('importance', 'high');
        }
        
        document.head.appendChild(link);
        this.prefetchedUrls.add(url);
        
        // Prefetch loaded successfully
      } catch (error) {
        // Prefetch failed silently
      }
    };
    
    if (priority === 'high') {
      await prefetchTask();
    } else {
      this.queuePrefetch(prefetchTask);
    }
  }

  // Prefetch multiple routes
  async prefetchRoutes(urls: string[], options: PrefetchOptions = {}) {
    for (const url of urls) {
      await this.prefetchRoute(url, options);
    }
  }

  // Prefetch based on user interaction patterns
  setupInteractionPrefetch() {
    // Prefetch on hover
    document.addEventListener('mouseover', (e) => {
      const link = (e.target as HTMLElement).closest('a');
      if (link && link.href && !link.href.startsWith('#')) {
        this.prefetchRoute(link.href, { delay: 200 });
      }
    });
    
    // Prefetch on focus (keyboard navigation)
    document.addEventListener('focusin', (e) => {
      const link = (e.target as HTMLElement).closest('a');
      if (link && link.href && !link.href.startsWith('#')) {
        this.prefetchRoute(link.href, { delay: 100 });
      }
    });
  }

  // Prefetch visible links using Intersection Observer
  observeLinks(container: HTMLElement = document.body) {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            if (link.href && !link.href.startsWith('#')) {
              this.prefetchRoute(link.href, { delay: 1000 });
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );
    
    const links = container.querySelectorAll('a[href]');
    links.forEach((link) => {
      this.observer!.observe(link);
    });
  }

  // Prefetch data/API endpoints
  async prefetchData(url: string, options: RequestInit = {}) {
    if (this.prefetchedUrls.has(url)) return;
    
    if (!this.shouldPrefetch()) return;
    
    try {
      const response = await fetch(url, {
        ...options,
        method: 'GET',
        headers: {
          ...options.headers,
          'X-Prefetch': 'true',
        },
      });
      
      if (response.ok) {
        this.prefetchedUrls.add(url);
        // Data prefetch cached successfully
      }
    } catch (error) {
      // Data prefetch failed silently
    }
  }

  // Prefetch critical resources
  prefetchCriticalResources(resources: string[]) {
    resources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      
      // Determine resource type
      if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
        link.as = 'image';
      } else if (resource.match(/\.(woff|woff2|ttf|otf)$/)) {
        link.as = 'font';
        link.setAttribute('crossorigin', 'anonymous');
      }
      
      document.head.appendChild(link);
    });
  }

  // DNS prefetch for external domains
  dnsPrefetch(domains: string[]) {
    domains.forEach((domain) => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });
  }

  // Preconnect to external origins
  preconnect(origins: string[]) {
    origins.forEach((origin) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.setAttribute('crossorigin', 'anonymous');
      document.head.appendChild(link);
    });
  }

  // Check if prefetching should occur
  private shouldPrefetch(): boolean {
    // Check network connection
    const connection = (navigator as any).connection;
    if (connection) {
      // Skip on slow connections
      if (connection.saveData) return false;
      if (connection.effectiveType === 'slow-2g') return false;
      if (connection.effectiveType === '2g') return false;
    }
    
    // Check battery level
    const battery = (navigator as any).battery;
    if (battery && battery.level < 0.2 && !battery.charging) {
      return false;
    }
    
    // Check memory pressure
    const memory = (performance as any).memory;
    if (memory && memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.9) {
      return false;
    }
    
    return true;
  }

  // Queue prefetch for idle time
  private queuePrefetch(task: () => Promise<void>) {
    this.prefetchQueue.push(task);
    this.processPrefetchQueue();
  }

  // Process prefetch queue during idle time
  private async processPrefetchQueue() {
    if (this.prefetchQueue.length === 0) return;
    
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        async (deadline) => {
          while (
            this.prefetchQueue.length > 0 &&
            deadline.timeRemaining() > 0
          ) {
            const task = this.prefetchQueue.shift();
            if (task) await task();
          }
          
          // Continue processing if more tasks
          if (this.prefetchQueue.length > 0) {
            this.processPrefetchQueue();
          }
        },
        { timeout: 5000 }
      );
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(async () => {
        const task = this.prefetchQueue.shift();
        if (task) await task();
        
        if (this.prefetchQueue.length > 0) {
          this.processPrefetchQueue();
        }
      }, 100);
    }
  }

  // Setup idle detection
  private setupIdleDetection() {
    let idleTimer: NodeJS.Timeout;
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const resetIdleTimer = () => {
      this.isIdle = false;
      clearTimeout(idleTimer);
      
      idleTimer = setTimeout(() => {
        this.isIdle = true;
        this.processPrefetchQueue();
      }, 3000);
    };
    
    events.forEach((event) => {
      document.addEventListener(event, resetIdleTimer, true);
    });
    
    resetIdleTimer();
  }

  // Setup network change detection
  private setupNetworkDetection() {
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        if (this.shouldPrefetch()) {
          this.processPrefetchQueue();
        }
      });
    }
  }

  // Setup visibility change detection
  private setupVisibilityDetection() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Pause prefetching when page is hidden
        this.prefetchQueue = [];
      }
    });
  }

  // Utility: delay helper
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Clear prefetch cache
  clearCache() {
    this.prefetchedUrls.clear();
    this.prefetchQueue = [];
  }

  // Get prefetch statistics
  getStats() {
    return {
      prefetchedCount: this.prefetchedUrls.size,
      queuedCount: this.prefetchQueue.length,
      isIdle: this.isIdle,
      shouldPrefetch: this.shouldPrefetch(),
    };
  }
}

// Singleton instance
let prefetchManager: PrefetchManager | null = null;

export function getPrefetchManager(): PrefetchManager {
  if (!prefetchManager) {
    prefetchManager = new PrefetchManager();
  }
  return prefetchManager;
}

// React hook for prefetching
export function usePrefetch() {
  const manager = getPrefetchManager();
  
  return {
    prefetchRoute: (url: string, options?: PrefetchOptions) => 
      manager.prefetchRoute(url, options),
    prefetchData: (url: string, options?: RequestInit) => 
      manager.prefetchData(url, options),
    prefetchResources: (resources: string[]) => 
      manager.prefetchCriticalResources(resources),
    dnsPrefetch: (domains: string[]) => 
      manager.dnsPrefetch(domains),
    preconnect: (origins: string[]) => 
      manager.preconnect(origins),
    getStats: () => manager.getStats(),
  };
}

// Initialize prefetching on app start
export function initPrefetching() {
  const manager = getPrefetchManager();
  
  // Setup interaction-based prefetching
  manager.setupInteractionPrefetch();
  
  // Observe all links for prefetching
  if (document.readyState === 'complete') {
    manager.observeLinks();
  } else {
    window.addEventListener('load', () => {
      manager.observeLinks();
    });
  }
  
  // Prefetch critical routes
  manager.prefetchRoutes([
    '/dashboard',
    '/calls',
    '/settings',
  ], { priority: 'low', delay: 5000 });
  
  // DNS prefetch for external services
  manager.dnsPrefetch([
    'https://api.supabase.co',
    'https://cdn.jsdelivr.net',
  ]);
  
  // Preconnect to critical origins
  manager.preconnect([
    'https://api.supabase.co',
  ]);
  
  // Prefetch manager initialized
}