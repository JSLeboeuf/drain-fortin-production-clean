import { Phone, DollarSign, TrendingUp, Shield } from "lucide-react";
import { logger } from "@/lib/logger";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import MetricsCard from "@/components/dashboard/MetricsCard";
import QuickActions from "@/components/dashboard/QuickActions";
import LiveCallCard from "@/components/dashboard/LiveCallCard";
import CallsChart from "@/components/analytics/CallsChart";
import CallsTable from "@/components/dashboard/CallsTable";
import EnhancedAlertBanner from "@/components/dashboard/EnhancedAlertBanner";
import EnhancedMetricsCard from "@/components/dashboard/EnhancedMetricsCard";
import UxKpiPanel from "@/components/dashboard/UxKpiPanel";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import PaulROITracker from "@/components/dashboard/PaulROITracker";
import SmartInsights from "@/components/dashboard/SmartInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import { useDashboardData, useRealtimeCalls } from "@/hooks/useSupabase";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAllAlerts, useEnhancedMetrics } from "@/hooks/useAlerts";
import { useState, useEffect } from "react";

export default function Dashboard() {
  // Utiliser les hooks synchronisés avec Supabase
  const { 
    calls: recentCalls, 
    metrics, 
    connectionStatus,
    isLoading 
  } = useDashboardData();
  
  // Activer les mises à jour temps réel
  useRealtimeCalls();
  
  const { data: enhancedMetrics, isLoading: enhancedLoading } = useEnhancedMetrics();
  const { activeCalls } = useWebSocket();
  const alerts = useAllAlerts();
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Notifications P1 - désactivées temporairement pour éviter les erreurs
  const hasP1Active = activeCalls?.some(c => c.priority === 'P1') || false;
  const p1Count = activeCalls?.filter(c => c.priority === 'P1').length || 0;

  useEffect(() => {
    // Vérifier si c'est la première visite de Guillaume
    const hasSeenOnboarding = localStorage.getItem('guillaume_onboarding_seen');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.id));
  const hasUrgentCalls = activeCalls?.some(call => call.priority === "P1") || false;

  // Pas de données fictives - uniquement les vraies métriques

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const handleCallAction = (phoneNumber: string) => {
    // Open phone dialer or show contact info
    window.open(`tel:${phoneNumber}`);
  };

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('guillaume_onboarding_seen', 'true');
  };

  if (isLoading || enhancedLoading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
          <div className="ml-4 text-sm text-muted-foreground">
            {connectionStatus?.backend ? "✅ Backend" : "❌ Backend"}
            {" | "}
            {connectionStatus?.supabase ? "✅ Supabase" : "❌ Supabase"}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-background-solid to-drain-blue-50 dark:bg-background animate-fade-in">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden relative">
        <PageErrorBoundary pageName="Dashboard">
        {/* Bandeau P1 local retiré — géré par GlobalP1Banner */}
        <Header 
          title="Dashboard" 
          subtitle="Surveillance en temps réel de Paul, votre assistant vocal" 
        />
        
        <div className="px-4 md:px-6 mb-4">
          <QuickActions />
        </div>

        {visibleAlerts.length > 0 && (
          <EnhancedAlertBanner 
            alerts={visibleAlerts}
            onDismissAlert={handleDismissAlert}
            onCallAction={handleCallAction}
          />
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Configuration initiale Guillaume */}
          {showOnboarding && (
            <OnboardingChecklist onDismiss={handleDismissOnboarding} />
          )}
          
          {/* Insights intelligents - temporairement désactivé pour debug */}
          {/* <SmartInsights /> */}
          
          {/* ROI Tracker - temporairement désactivé pour debug */}
          {/* <PaulROITracker /> */}
          
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <MetricsCard
              title="Appels aujourd'hui"
              value={metrics.totalCalls}
              change={0}
              icon={<Phone className="h-6 w-6 text-drain-blue-500" />}
              trend="stable"
            />
            <MetricsCard
              title="Durée moyenne"
              value={`${Math.round(metrics.avgDuration)}min`}
              change={0}
              icon={<Phone className="h-6 w-6 text-drain-green-500" />}
              trend="stable"
            />
            <MetricsCard
              title="Urgences détectées"
              value={`${metrics.urgentCalls}`}
              change={0}
              icon={<TrendingUp className="h-6 w-6 text-priority-p1" />}
              trend="stable"
            />
            <MetricsCard
              title="Taux de conversion"
              value={`${Math.round(metrics.conversionRate * 100)}%`}
              change={0}
              icon={<Shield className="h-6 w-6 text-drain-orange-500" />}
              trend="stable"
            />
          </div>

          {/* UX KPIs */}
          <UxKpiPanel />

          {/* Live Calls and Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Live Calls Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Appels en cours
                  <span className="text-sm text-muted-foreground live-indicator" data-testid="text-active-calls-count">
                    {activeCalls?.length || 0} actifs
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!activeCalls || activeCalls.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid="text-no-active-calls">
                      Aucun appel en cours
                    </div>
                  ) : (
                    activeCalls.map((call) => (
                      <LiveCallCard
                        key={call.id}
                        call={call}
                        onListen={() => import.meta.env.DEV && logger.info("Listen to call", call.id)}
                        onTransfer={() => import.meta.env.DEV && logger.info("Transfer call", call.id)}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance en temps réel de Paul */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Paul</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Appels traités aujourd'hui</span>
                    <span className="font-medium">{metrics.totalCalls}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Durée moyenne par appel</span>
                    <span className="font-medium">{Math.round(metrics.avgDuration)} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Urgences détectées</span>
                    <span className="font-medium text-priority-p1">{metrics.urgentCalls}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Leads générés</span>
                    <span className="font-medium text-drain-green-500">{metrics.totalLeads}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Calls Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Appels récents
                <a href="/calls" className="text-sm text-drain-blue-500 hover:text-drain-blue-600" data-testid="link-view-all-calls">
                  Voir tous les appels
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentCalls ? (
                <CallsTable calls={recentCalls} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun appel récent
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </PageErrorBoundary>
      </main>
    </div>
  );
}