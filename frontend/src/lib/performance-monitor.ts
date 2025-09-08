/**
 * Performance Monitoring System
 * Tracks Web Vitals and custom performance metrics
 * Part of UltraThink systemic improvements
 */

import { logger } from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface WebVitalsData {
  CLS?: number;  // Cumulative Layout Shift
  FID?: number;  // First Input Delay
  FCP?: number;  // First Contentful Paint
  LCP?: number;  // Largest Contentful Paint
  TTFB?: number; // Time to First Byte
  INP?: number;  // Interaction to Next Paint
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private vitals: WebVitalsData = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private reportCallback?: (metrics: PerformanceMetric[]) => void;

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Observe paint timing
    this.observePaintTiming();
    
    // Observe layout shifts
    this.observeLayoutShifts();
    
    // Observe first input delay
    this.observeFirstInput();
    
    // Observe largest contentful paint
    this.observeLCP();
    
    // Observe navigation timing
    this.observeNavigationTiming();
  }

  private observePaintTiming() {
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.vitals.FCP = entry.startTime;
            this.addMetric('FCP', entry.startTime, this.rateFCP(entry.startTime));
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', paintObserver);
    } catch (e) {
      logger.warn('Paint timing observer not supported');
    }
  }

  private observeLayoutShifts() {
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.vitals.CLS = clsValue;
        this.addMetric('CLS', clsValue, this.rateCLS(clsValue));
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', clsObserver);
    } catch (e) {
      logger.warn('Layout shift observer not supported');
    }
  }

  private observeFirstInput() {
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0] as any;
        if (firstInput) {
          const fid = firstInput.processingStart - firstInput.startTime;
          this.vitals.FID = fid;
          this.addMetric('FID', fid, this.rateFID(fid));
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', fidObserver);
    } catch (e) {
      logger.warn('First input observer not supported');
    }
  }

  private observeLCP() {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          this.vitals.LCP = lastEntry.startTime;
          this.addMetric('LCP', lastEntry.startTime, this.rateLCP(lastEntry.startTime));
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    } catch (e) {
      logger.warn('LCP observer not supported');
    }
  }

  private observeNavigationTiming() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const ttfb = timing.responseStart - timing.requestStart;
      this.vitals.TTFB = ttfb;
      this.addMetric('TTFB', ttfb, this.rateTTFB(ttfb));
    }
  }

  // Rating functions based on Web Vitals thresholds
  private rateFCP(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 1800) return 'good';
    if (value <= 3000) return 'needs-improvement';
    return 'poor';
  }

  private rateLCP(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private rateFID(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private rateCLS(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private rateTTFB(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }

  private addMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor') {
    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now()
    };
    
    this.metrics.push(metric);
    logger.debug(`Performance metric: ${name}=${value}ms (${rating})`);
    
    if (this.reportCallback) {
      this.reportCallback([metric]);
    }
  }

  // Custom timing API
  startTiming(label: string): void {
    if (window.performance && window.performance.mark) {
      window.performance.mark(`${label}-start`);
    }
  }

  endTiming(label: string): number {
    if (window.performance && window.performance.mark && window.performance.measure) {
      window.performance.mark(`${label}-end`);
      window.performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measures = window.performance.getEntriesByName(label);
      if (measures.length > 0) {
        const duration = measures[measures.length - 1].duration;
        this.addMetric(label, duration, this.rateCustom(duration));
        return duration;
      }
    }
    return 0;
  }

  private rateCustom(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good';
    if (value <= 500) return 'needs-improvement';
    return 'poor';
  }

  // Get current metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getVitals(): WebVitalsData {
    return { ...this.vitals };
  }

  // Set callback for real-time reporting
  onMetric(callback: (metrics: PerformanceMetric[]) => void) {
    this.reportCallback = callback;
  }

  // Get performance score (0-100)
  getScore(): number {
    const vitals = this.getVitals();
    let score = 100;
    let count = 0;

    if (vitals.FCP !== undefined) {
      count++;
      if (vitals.FCP > 3000) score -= 20;
      else if (vitals.FCP > 1800) score -= 10;
    }

    if (vitals.LCP !== undefined) {
      count++;
      if (vitals.LCP > 4000) score -= 20;
      else if (vitals.LCP > 2500) score -= 10;
    }

    if (vitals.FID !== undefined) {
      count++;
      if (vitals.FID > 300) score -= 20;
      else if (vitals.FID > 100) score -= 10;
    }

    if (vitals.CLS !== undefined) {
      count++;
      if (vitals.CLS > 0.25) score -= 20;
      else if (vitals.CLS > 0.1) score -= 10;
    }

    if (vitals.TTFB !== undefined) {
      count++;
      if (vitals.TTFB > 1800) score -= 20;
      else if (vitals.TTFB > 800) score -= 10;
    }

    return Math.max(0, score);
  }

  // Generate report
  generateReport(): string {
    const vitals = this.getVitals();
    const score = this.getScore();
    
    return `
Performance Report
==================
Score: ${score}/100

Web Vitals:
- FCP: ${vitals.FCP?.toFixed(2) || 'N/A'}ms
- LCP: ${vitals.LCP?.toFixed(2) || 'N/A'}ms
- FID: ${vitals.FID?.toFixed(2) || 'N/A'}ms
- CLS: ${vitals.CLS?.toFixed(3) || 'N/A'}
- TTFB: ${vitals.TTFB?.toFixed(2) || 'N/A'}ms

Custom Metrics:
${this.metrics
  .filter(m => !['FCP', 'LCP', 'FID', 'CLS', 'TTFB'].includes(m.name))
  .map(m => `- ${m.name}: ${m.value.toFixed(2)}ms (${m.rating})`)
  .join('\n')}
    `.trim();
  }

  // Cleanup
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics = [];
    this.vitals = {};
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export function startTiming(label: string) {
  performanceMonitor.startTiming(label);
}

export function endTiming(label: string): number {
  return performanceMonitor.endTiming(label);
}

export function getPerformanceScore(): number {
  return performanceMonitor.getScore();
}

export function getPerformanceReport(): string {
  return performanceMonitor.generateReport();
}