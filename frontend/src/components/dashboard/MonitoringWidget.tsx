import { memo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';
import LoadingFallback from '../common/LoadingFallback';

const MonitoringWidget = memo(function MonitoringWidget() {
  const [realTimeData, setRealTimeData] = useState({
    cpuUsage: 45,
    memoryUsage: 67,
    activeConnections: 23,
    requestsPerSecond: 15
  });

  // Performance monitoring integration
  const { metrics, webVitals, networkStatus, isLowEndDevice } = usePerformanceMonitoring();

  // Mock monitoring data
  const { data: monitoringData, isLoading } = useQuery({
    queryKey: ['monitoring-widget'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 400));
      return {
        systemHealth: {
          status: 'healthy',
          uptime: '99.9%',
          lastCheck: new Date().toISOString(),
          issues: 0
        },
        alerts: [
          { id: 1, type: 'info', message: 'Système fonctionnel', time: '10:30' },
          { id: 2, type: 'warning', message: 'Latence légèrement élevée', time: '09:45' },
          { id: 3, type: 'success', message: 'Optimisation appliquée', time: '09:15' }
        ],
        performance: {
          avgResponseTime: 240,
          errorRate: 0.1,
          throughput: 1250
        }
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30000 // 30 seconds
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        cpuUsage: Math.max(10, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(20, Math.min(95, prev.memoryUsage + (Math.random() - 0.5) * 8)),
        activeConnections: Math.max(1, Math.min(100, prev.activeConnections + Math.floor((Math.random() - 0.5) * 6))),
        requestsPerSecond: Math.max(1, Math.min(50, prev.requestsPerSecond + Math.floor((Math.random() - 0.5) * 4)))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <LoadingFallback message="Chargement monitoring..." size="md" />;
  }

  const getStatusColor = (value: number, thresholds = { good: 70, warning: 85 }) => {
    if (value < thresholds.good) return 'text-green-600 bg-green-50';
    if (value < thresholds.warning) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Monitoring Système</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600">En temps réel</span>
          </div>
        </div>
        
        {/* System Health */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-lg p-4 ${getStatusColor(realTimeData.cpuUsage)}`}>
            <div className="text-2xl font-bold">
              {Math.round(realTimeData.cpuUsage)}%
            </div>
            <div className="text-sm">CPU Usage</div>
          </div>
          
          <div className={`rounded-lg p-4 ${getStatusColor(realTimeData.memoryUsage)}`}>
            <div className="text-2xl font-bold">
              {Math.round(realTimeData.memoryUsage)}%
            </div>
            <div className="text-sm">Mémoire</div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {realTimeData.activeConnections}
            </div>
            <div className="text-sm text-blue-700">Connexions</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {realTimeData.requestsPerSecond}/s
            </div>
            <div className="text-sm text-purple-700">Requêtes</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Core Web Vitals</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>LCP:</span>
                <span className={webVitals.LCP && webVitals.LCP > 2500 ? 'text-red-600' : 'text-green-600'}>
                  {webVitals.LCP ? `${Math.round(webVitals.LCP)}ms` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>FID:</span>
                <span className={webVitals.FID && webVitals.FID > 100 ? 'text-red-600' : 'text-green-600'}>
                  {webVitals.FID ? `${Math.round(webVitals.FID)}ms` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>CLS:</span>
                <span className={webVitals.CLS && webVitals.CLS > 0.1 ? 'text-red-600' : 'text-green-600'}>
                  {webVitals.CLS ? webVitals.CLS.toFixed(3) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Réseau</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium ${
                  networkStatus === 'fast' ? 'text-green-600' :
                  networkStatus === 'slow' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {networkStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Latence:</span>
                <span>{metrics.networkLatency}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Appareil:</span>
                <span>{isLowEndDevice ? 'Optimisé' : 'Standard'}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Performance</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>FPS:</span>
                <span className={metrics.fps < 30 ? 'text-red-600' : 'text-green-600'}>
                  {metrics.fps}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mémoire JS:</span>
                <span>{metrics.jsHeapSize}MB</span>
              </div>
              <div className="flex justify-between">
                <span>Temps Rendu:</span>
                <span>{Math.round(metrics.renderTime)}ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-md font-semibold mb-3">État du Système</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium">Système Principal</span>
            </div>
            <span className="text-green-600 font-medium">Opérationnel</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium">Base de Données</span>
            </div>
            <span className="text-green-600 font-medium">Connectée</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium">API VAPI</span>
            </div>
            <span className="text-green-600 font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-md font-semibold mb-3">Alertes Récentes</h4>
        <div className="space-y-2">
          {monitoringData?.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                alert.type === 'success' ? 'bg-green-50' :
                alert.type === 'warning' ? 'bg-yellow-50' :
                alert.type === 'error' ? 'bg-red-50' : 'bg-blue-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">
                  {alert.type === 'success' ? '✅' :
                   alert.type === 'warning' ? '⚠️' :
                   alert.type === 'error' ? '❌' : 'ℹ️'}
                </span>
                <span className="text-sm">{alert.message}</span>
              </div>
              <span className="text-xs text-gray-500">{alert.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default MonitoringWidget;