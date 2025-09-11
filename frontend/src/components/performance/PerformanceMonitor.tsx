import { memo } from 'react';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';

const PerformanceMonitor = memo(function PerformanceMonitor() {
  const { metrics, webVitals, isLowEndDevice, networkStatus } = usePerformanceMonitoring();

  // Don't render in production unless explicitly enabled
  if (import.meta.env.PROD && !localStorage.getItem('debug-performance')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white text-xs p-2 rounded font-mono z-50">
      <div>FPS: {metrics.fps}</div>
      <div>Mem: {metrics.memoryUsage}MB</div>
      <div>Net: {networkStatus}</div>
      {isLowEndDevice && <div className="text-orange-300">Low-end device</div>}
    </div>
  );
});

export default PerformanceMonitor;