/**
 * Main Application Component - REFACTORED
 * Clean, maintainable application entry point using extracted components
 */

import React, { memo, Suspense, lazy } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/config/queryClient';
import { useVAPICalls } from '@/hooks/useVAPICalls';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { Header } from '@/components/layout';
import { QuickStats, AlertsPanel } from '@/components/dashboard';
import { LiveConversations } from '@/components/calls';
import { Card } from '@/components/ui';
import { DRAIN_FORTIN_COLORS } from '@/config/theme';
import '@/styles/global.css';

import type { CallStats, Alert } from '@/types';

// Lazy load heavy components
const Charts = lazy(() => import('./components/charts/BarChart'));

// Main Dashboard Component
const DrainFortinDashboard = memo(() => {
  const { calls, isLoading } = useVAPICalls();
  const { status: connectionStatus } = useConnectionStatus();

  // Calculate stats from calls data
  const stats: CallStats = {
    todayCalls: calls?.filter(c => {
      const today = new Date().toDateString();
      return new Date(c.created_at).toDateString() === today;
    }).length || 0,
    successCalls: calls?.filter(c => c.status === 'completed').length || 0,
    failedCalls: calls?.filter(c => c.status === 'failed').length || 0,
    avgDuration: calls?.length ? 
      Math.round(calls.reduce((acc, c) => acc + (c.duration || 0), 0) / calls.length) : 0
  };

  // Mock alerts - in real app, this would come from another hook
  const alerts: Alert[] = [
    {
      id: '1',
      type: 'warning',
      message: 'Latence élevée détectée',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2', 
      type: 'info',
      message: 'Nouveau client ajouté',
      timestamp: new Date().toISOString(),
    }
  ];

  const mainStyles: React.CSSProperties = {
    minHeight: '100vh',
    background: DRAIN_FORTIN_COLORS.grayLight,
  };

  const containerStyles: React.CSSProperties = {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  };

  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '20px',
  };

  const loadingStyles: React.CSSProperties = {
    padding: '40px',
    textAlign: 'center' as const,
    color: DRAIN_FORTIN_COLORS.gray,
  };

  if (isLoading) {
    return (
      <div style={mainStyles}>
        <Header connectionStatus={connectionStatus} alertCount={alerts.length} />
        <div style={containerStyles}>
          <div style={loadingStyles}>
            <div className="animate-pulse">Chargement des données...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={mainStyles}>
      {/* Header */}
      <Header connectionStatus={connectionStatus} alertCount={alerts.length} />

      {/* Main Content */}
      <main style={containerStyles}>
        {/* Quick Stats */}
        <QuickStats stats={stats} />

        {/* Main Grid */}
        <div style={gridStyles}>
          {/* Left Column */}
          <div>
            {/* Live Conversations */}
            <LiveConversations calls={calls} />

            {/* Charts */}
            <Suspense fallback={
              <Card title="Graphique des appels par heure">
                <div style={loadingStyles}>
                  <div className="animate-pulse">Chargement du graphique...</div>
                </div>
              </Card>
            }>
              <Charts />
            </Suspense>

            {/* Call History would go here */}
            <Card title="Historique des appels">
              <div style={loadingStyles}>
                Composant CallHistoryTable à extraire
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div>
            {/* Alerts Panel */}
            <AlertsPanel alerts={alerts} />

            {/* Quick Actions */}
            <Card title="Actions rapides">
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column' as const, 
                gap: '12px' 
              }}>
                <p style={{ color: DRAIN_FORTIN_COLORS.gray, fontSize: '14px' }}>
                  Actions rapides à implémenter avec les composants extraits
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Connection Error Banner */}
      {connectionStatus === 'disconnected' && (
        <div style={{
          position: 'fixed' as const,
          bottom: '20px',
          right: '20px',
          background: DRAIN_FORTIN_COLORS.orange,
          color: DRAIN_FORTIN_COLORS.white,
          padding: '16px 20px',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 3000,
        }} className="animate-slide-in-right">
          Erreur de connexion à VAPI - Reconnexion en cours...
        </div>
      )}
    </div>
  );
});

DrainFortinDashboard.displayName = 'DrainFortinDashboard';

// Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Dashboard Error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center' as const,
          background: DRAIN_FORTIN_COLORS.white,
        }}>
          <h2 style={{ color: DRAIN_FORTIN_COLORS.danger }}>
            Une erreur est survenue
          </h2>
          <p style={{ color: DRAIN_FORTIN_COLORS.gray }}>
            Veuillez rafraîchir la page
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App Export
export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DrainFortinDashboard />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}