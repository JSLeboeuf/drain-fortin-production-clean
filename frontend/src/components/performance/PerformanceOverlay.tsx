/**
 * Performance Overlay Component
 * Isabella Chen - Optimized for minimal render impact
 * Only shows in development mode
 */

import React, { memo } from 'react';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

export const PerformanceOverlay = memo(function PerformanceOverlay() {
  const { metrics, webVitals, networkStatus } = usePerformanceMonitoring();

  // Only render in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 right-4 bg-black/80 text-green-400 p-3 rounded-lg font-mono text-xs z-[9999] pointer-events-none select-none"
      style={{ 
        backdropFilter: 'blur(10px)',
        willChange: 'transform',
        contain: 'layout style paint'
      }}
    >
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span>FPS:</span>
          <span className={metrics.fps < 30 ? 'text-red-400' : metrics.fps < 50 ? 'text-yellow-400' : ''}>
            {metrics.fps}
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span>Memory:</span>
          <span className={metrics.memoryUsage > 100 ? 'text-yellow-400' : ''}>
            {metrics.memoryUsage}MB
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span>Latency:</span>
          <span className={metrics.networkLatency > 100 ? 'text-yellow-400' : ''}>
            {metrics.networkLatency}ms
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span>Network:</span>
          <span className={networkStatus === 'offline' ? 'text-red-400' : ''}>
            {networkStatus}
          </span>
        </div>
        
        {webVitals.LCP && (
          <div className="flex justify-between gap-4 border-t border-gray-600 pt-1 mt-1">
            <span>LCP:</span>
            <span className={webVitals.LCP > 2500 ? 'text-yellow-400' : ''}>
              {Math.round(webVitals.LCP)}ms
            </span>
          </div>
        )}
        
        {webVitals.CLS && (
          <div className="flex justify-between gap-4">
            <span>CLS:</span>
            <span className={webVitals.CLS > 0.1 ? 'text-yellow-400' : ''}>
              {webVitals.CLS.toFixed(3)}
            </span>
          </div>
        )}
        
        {webVitals.FID && (
          <div className="flex justify-between gap-4">
            <span>FID:</span>
            <span className={webVitals.FID > 100 ? 'text-yellow-400' : ''}>
              {Math.round(webVitals.FID)}ms
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

// Export for lazy loading
export default PerformanceOverlay;