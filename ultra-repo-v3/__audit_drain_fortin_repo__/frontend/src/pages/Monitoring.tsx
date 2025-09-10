import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  MemoryStick,
  RefreshCw,
  Server,
  TrendingUp,
  Wifi,
  XCircle,
} from 'lucide-react';
import { monitoring, type HealthCheck, type PerformanceMetric } from '@/services/monitoring';
import { alertService, type Alert as SystemAlert } from '@/services/alerts';
import { useMonitoring, usePerformanceMonitor, useNetworkMonitor, useMemoryMonitor } from '@/hooks/useMonitoring';
import { cn } from '@/lib/utils';

export default function Monitoring() {
  const [health, setHealth] = useState<Record<string, HealthCheck>>({});
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [sessionInfo, setSessionInfo] = useState(monitoring.getSessionInfo());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { trackOperation } = useMonitoring({ componentName: 'MonitoringDashboard' });
  const jankFrames = usePerformanceMonitor();
  useNetworkMonitor();
  useMemoryMonitor();

  useEffect(() => {
    // Subscribe to alerts
    const unsubscribe = alertService.subscribe(setAlerts);

    // Refresh data every 10 seconds
    const interval = setInterval(() => {
      refreshData();
    }, 10000);

    // Initial load
    refreshData();

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const refreshData = async () => {
    const op = trackOperation('RefreshMonitoringData');
    setIsRefreshing(true);

    try {
      setHealth(monitoring.getHealthStatus());
      setMetrics(monitoring.getMetrics().slice(-50)); // Last 50 metrics
      setSessionInfo(monitoring.getSessionInfo());
      
      // Fetch full health check from API
      const response = await fetch('/api/health?full=true');
      if (response.ok) {
        const healthData = await response.json();
        // Update health with API data
        setHealth(prev => ({
          ...prev,
          api: {
            service: 'api',
            status: healthData.status === 'healthy' ? 'healthy' : 
                   healthData.status === 'degraded' ? 'degraded' : 'unhealthy',
            latency: 0,
            lastCheck: Date.now(),
            message: `Uptime: ${Math.floor(healthData.uptime / 1000)}s`,
          },
        }));
      }
    } catch (error) {
      console.error('Error refreshing monitoring data:', error);
    } finally {
      setIsRefreshing(false);
      op.end();
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getHealthBadge = (status: string) => {
    const variant = status === 'healthy' ? 'success' : 
                   status === 'degraded' ? 'warning' : 'destructive';
    return <Badge variant={variant as any}>{status}</Badge>;
  };

  const getCoreWebVitals = () => {
    const vitals = {
      LCP: metrics.find(m => m.name === 'LCP')?.value,
      FID: metrics.find(m => m.name === 'FID')?.value,
      CLS: metrics.find(m => m.name === 'CLS')?.value,
      TTFB: metrics.find(m => m.name === 'TTFB')?.value,
    };
    return vitals;
  };

  const getMetricStatus = (name: string, value?: number) => {
    if (!value) return 'unknown';
    
    const thresholds: Record<string, { good: number; needs: number }> = {
      LCP: { good: 2500, needs: 4000 },
      FID: { good: 100, needs: 300 },
      CLS: { good: 0.1, needs: 0.25 },
      TTFB: { good: 800, needs: 1800 },
    };

    const threshold = thresholds[name];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needs) return 'needs-improvement';
    return 'poor';
  };

  const vitals = getCoreWebVitals();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Real-time performance metrics and health monitoring
          </p>
        </div>
        <Button 
          onClick={refreshData} 
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map(alert => (
            <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <span>{alert.message}</span>
                {alert.actions?.[0] && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={alert.actions[0].action}
                  >
                    {alert.actions[0].label}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Health Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="errors">Errors & Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(health).map(([service, check]) => (
              <Card key={service}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium capitalize">
                      {service}
                    </CardTitle>
                    {getHealthBadge(check.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    {getHealthIcon(check.status)}
                    <span className="text-sm text-muted-foreground">
                      {check.message || `${service} service`}
                    </span>
                  </div>
                  {check.latency > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Latency: {check.latency}ms
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Last check: {new Date(check.lastCheck).toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Session Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium">Session ID</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {sessionInfo.sessionId}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Uptime</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.floor((Date.now() - sessionInfo.startTime) / 60000)} min
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Metrics Collected</p>
                  <p className="text-xs text-muted-foreground">
                    {sessionInfo.metrics}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Errors Logged</p>
                  <p className="text-xs text-muted-foreground">
                    {sessionInfo.errors}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Largest Contentful Paint</CardTitle>
                <CardDescription>LCP</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {vitals.LCP ? `${vitals.LCP.toFixed(0)}ms` : '-'}
                </div>
                <Badge 
                  variant={getMetricStatus('LCP', vitals.LCP) === 'good' ? 'success' : 
                          getMetricStatus('LCP', vitals.LCP) === 'needs-improvement' ? 'warning' : 
                          'destructive'} 
                  className="mt-2"
                >
                  {getMetricStatus('LCP', vitals.LCP)}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">First Input Delay</CardTitle>
                <CardDescription>FID</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {vitals.FID ? `${vitals.FID.toFixed(0)}ms` : '-'}
                </div>
                <Badge 
                  variant={getMetricStatus('FID', vitals.FID) === 'good' ? 'success' : 
                          getMetricStatus('FID', vitals.FID) === 'needs-improvement' ? 'warning' : 
                          'destructive'} 
                  className="mt-2"
                >
                  {getMetricStatus('FID', vitals.FID)}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Cumulative Layout Shift</CardTitle>
                <CardDescription>CLS</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {vitals.CLS ? vitals.CLS.toFixed(3) : '-'}
                </div>
                <Badge 
                  variant={getMetricStatus('CLS', vitals.CLS) === 'good' ? 'success' : 
                          getMetricStatus('CLS', vitals.CLS) === 'needs-improvement' ? 'warning' : 
                          'destructive'} 
                  className="mt-2"
                >
                  {getMetricStatus('CLS', vitals.CLS)}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Time to First Byte</CardTitle>
                <CardDescription>TTFB</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {vitals.TTFB ? `${vitals.TTFB.toFixed(0)}ms` : '-'}
                </div>
                <Badge 
                  variant={getMetricStatus('TTFB', vitals.TTFB) === 'good' ? 'success' : 
                          getMetricStatus('TTFB', vitals.TTFB) === 'needs-improvement' ? 'warning' : 
                          'destructive'} 
                  className="mt-2"
                >
                  {getMetricStatus('TTFB', vitals.TTFB)}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Frame Performance</CardTitle>
              <CardDescription>
                Monitoring frame drops and jank
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Jank Frames Detected</p>
                  <p className="text-2xl font-bold">{jankFrames}</p>
                </div>
                <Badge variant={jankFrames > 10 ? 'destructive' : jankFrames > 5 ? 'warning' : 'success'}>
                  {jankFrames === 0 ? 'Smooth' : jankFrames > 10 ? 'Poor' : 'Acceptable'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Metrics</CardTitle>
              <CardDescription>
                Last 50 performance measurements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {metrics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No metrics collected yet</p>
                ) : (
                  metrics.reverse().map((metric, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{metric.name}</span>
                        {metric.tags && (
                          <div className="flex gap-1">
                            {Object.entries(metric.tags).map(([key, value]) => (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">
                          {metric.value.toFixed(2)} {metric.unit}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                System alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active alerts</p>
                ) : (
                  alerts.map(alert => (
                    <div key={alert.id} className="flex items-start justify-between py-2 border-b">
                      <div className="flex items-start gap-2">
                        <AlertCircle className={cn(
                          "h-4 w-4 mt-0.5",
                          alert.severity === 'critical' ? "text-red-500" :
                          alert.severity === 'warning' ? "text-yellow-500" : "text-blue-500"
                        )} />
                        <div>
                          <p className="text-sm font-medium">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          alert.severity === 'critical' ? 'destructive' :
                          alert.severity === 'warning' ? 'warning' : 'secondary'
                        }>
                          {alert.severity}
                        </Badge>
                        {!alert.resolved && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => alertService.resolveAlert(alert.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error Log</CardTitle>
              <CardDescription>
                Recent errors and exceptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {monitoring.getErrors().length === 0 ? (
                  <p className="text-sm text-muted-foreground">No errors logged</p>
                ) : (
                  monitoring.getErrors().slice(-20).reverse().map((error, i) => (
                    <div key={i} className="py-2 border-b">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-600">{error.message}</p>
                          {error.context && (
                            <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto">
                              {JSON.stringify(error.context, null, 2)}
                            </pre>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}