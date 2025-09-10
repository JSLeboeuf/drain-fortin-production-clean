import React, { useMemo, useCallback, useState, useEffect, lazy, Suspense } from "react";
import { Phone, DollarSign, TrendingUp, Shield } from "lucide-react";
import { logger } from "@/lib/logger";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import { useDashboardData, useRealtimeCalls } from "@/hooks/useSupabase";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAllAlerts, useEnhancedMetrics } from "@/hooks/useAlerts";

// Lazy load heavy components
const MetricsCard = lazy(() => import("@/components/dashboard/MetricsCard"));
const QuickActions = lazy(() => import("@/components/dashboard/QuickActions"));
const LiveCallCard = lazy(() => import("@/components/dashboard/LiveCallCard"));
const CallsChart = lazy(() => import("@/components/analytics/CallsChart"));
const CallsTable = lazy(() => import("@/components/dashboard/CallsTable"));
const EnhancedAlertBanner = lazy(() => import("@/components/dashboard/EnhancedAlertBanner"));
const EnhancedMetricsCard = lazy(() => import("@/components/dashboard/EnhancedMetricsCard"));
const UxKpiPanel = lazy(() => import("@/components/dashboard/UxKpiPanel"));
const OnboardingChecklist = lazy(() => import("@/components/dashboard/OnboardingChecklist"));
const PaulROITracker = lazy(() => import("@/components/dashboard/PaulROITracker"));
const SmartInsights = lazy(() => import("@/components/dashboard/SmartInsights"));

// Memoized Stats Component
const DashboardStats = React.memo(({ metrics, enhancedMetrics }: any) => {
  const statsConfig = useMemo(() => [
    {
      title: "Appels Totaux",
      value: metrics?.totalCalls || 0,
      icon: Phone,
      trend: enhancedMetrics?.callsTrend || "+0%",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Revenus",
      value: `$${metrics?.totalRevenue || 0}`,
      icon: DollarSign,
      trend: enhancedMetrics?.revenueTrend || "+0%",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Taux Conversion",
      value: `${metrics?.conversionRate || 0}%`,
      icon: TrendingUp,
      trend: enhancedMetrics?.conversionTrend || "+0%",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Urgences P1",
      value: metrics?.urgentCalls || 0,
      icon: Shield,
      trend: enhancedMetrics?.urgentTrend || "0",
      color: metrics?.urgentCalls > 0 ? "text-red-600" : "text-gray-600",
      bgColor: metrics?.urgentCalls > 0 ? "bg-red-50" : "bg-gray-50",
    },
  ], [metrics, enhancedMetrics]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statsConfig.map((stat, index) => (
        <Suspense key={index} fallback={<Card className="animate-pulse h-32" />}>
          <EnhancedMetricsCard {...stat} />
        </Suspense>
      ))}
    </div>
  );
});

// Optimized Dashboard Component
export default React.memo(function DashboardOptimized() {
  // Optimized hooks with selective subscriptions
  const { 
    calls: recentCalls, 
    metrics, 
    connectionStatus,
    isLoading 
  } = useDashboardData();
  
  // Selective realtime subscription
  const { activeCalls } = useWebSocket();
  
  // Lazy load enhanced metrics
  const { data: enhancedMetrics, isLoading: enhancedLoading } = useEnhancedMetrics();
  
  // Lazy load alerts
  const { data: alerts, isLoading: alertsLoading } = useAllAlerts();
  
  // Local state with optimized defaults
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('guillaume_onboarding_seen');
  });
  
  // Enable realtime updates only when visible
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (!document.hidden) {
      const subscription = useRealtimeCalls();
      unsubscribe = () => subscription;
    }
    
    const handleVisibilityChange = () => {
      if (document.hidden && unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      } else if (!document.hidden && !unsubscribe) {
        const subscription = useRealtimeCalls();
        unsubscribe = () => subscription;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Memoized computations
  const visibleAlerts = useMemo(() => {
    if (!alerts) return [];
    return alerts.filter(alert => !dismissedAlerts.has(alert.id));
  }, [alerts, dismissedAlerts]);

  const hasP1Active = useMemo(() => {
    return activeCalls?.some(c => c.priority === 'P1') || false;
  }, [activeCalls]);

  const p1Count = useMemo(() => {
    return activeCalls?.filter(c => c.priority === 'P1').length || 0;
  }, [activeCalls]);

  // Optimized callbacks
  const handleDismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  }, []);

  const handleCallAction = useCallback((phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`);
  }, []);

  const handleDismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('guillaume_onboarding_seen', 'true');
  }, []);

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <div className="animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-800 mb-4" />
            <div className="px-6 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                ))}
              </div>
              <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
              <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-background-solid to-drain-blue-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden relative">
        <PageErrorBoundary pageName="Dashboard">
          <Header 
            title="Dashboard" 
            subtitle="Surveillance en temps réel de Paul, votre assistant vocal" 
          />
          
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 md:px-6 py-4">
              {/* P1 Alert Banner */}
              {hasP1Active && (
                <Suspense fallback={null}>
                  <EnhancedAlertBanner
                    type="urgent"
                    title={`${p1Count} Urgence${p1Count > 1 ? 's' : ''} P1 Active${p1Count > 1 ? 's' : ''}`}
                    message="Intervention immédiate requise"
                    onDismiss={() => {}}
                  />
                </Suspense>
              )}

              {/* Stats Cards */}
              <DashboardStats metrics={metrics} enhancedMetrics={enhancedMetrics} />

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Live Calls */}
                <div className="lg:col-span-2">
                  <Suspense fallback={<Card className="animate-pulse h-96" />}>
                    <Card>
                      <CardHeader>
                        <CardTitle>Appels en Direct</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activeCalls && activeCalls.length > 0 ? (
                          <div className="space-y-3">
                            {activeCalls.slice(0, 5).map((call) => (
                              <LiveCallCard
                                key={call.id}
                                call={call}
                                onAction={handleCallAction}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-8">
                            Aucun appel actif
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Suspense>
                </div>

                {/* Quick Actions */}
                <Suspense fallback={<Card className="animate-pulse h-96" />}>
                  <QuickActions />
                </Suspense>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Suspense fallback={<Card className="animate-pulse h-64" />}>
                  <CallsChart data={recentCalls} />
                </Suspense>
                <Suspense fallback={<Card className="animate-pulse h-64" />}>
                  <PaulROITracker />
                </Suspense>
              </div>

              {/* Calls Table */}
              <Suspense fallback={<Card className="animate-pulse h-96" />}>
                <CallsTable 
                  calls={recentCalls} 
                  loading={isLoading}
                />
              </Suspense>

              {/* Smart Insights */}
              {enhancedMetrics && (
                <Suspense fallback={null}>
                  <SmartInsights metrics={enhancedMetrics} />
                </Suspense>
              )}

              {/* Onboarding (if needed) */}
              {showOnboarding && (
                <Suspense fallback={null}>
                  <OnboardingChecklist onDismiss={handleDismissOnboarding} />
                </Suspense>
              )}
            </div>
          </div>
        </PageErrorBoundary>
      </main>
    </div>
  );
});