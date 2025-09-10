import React, { useState, useEffect, lazy, Suspense, memo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { 
  Phone, 
  Calendar, 
  AlertCircle, 
  Users, 
  Activity,
  Clock,
  TrendingUp,
  PhoneCall,
  CheckCircle,
  XCircle,
  Zap,
  Shield,
  BarChart3,
  Bell,
  Home,
  Settings,
  Menu,
  X,
  ChevronDown,
  Droplets,
  Wrench
} from 'lucide-react';

// Supabase client with optimized settings
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  {
    auth: { persistSession: true },
    realtime: { params: { eventsPerSecond: 10 } }
  }
);

// Query client with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Lazy load heavy components
const Charts = lazy(() => import('./components/Charts').catch(() => ({ default: () => <div>Charts unavailable</div> })));
const DataTable = lazy(() => import('./components/DataTable').catch(() => ({ default: () => <div>Table unavailable</div> })));

// Design System from drainfortin.ca
const theme = {
  colors: {
    primary: '#2ea3f2',
    text: '#666',
    heading: '#333',
    background: '#fff',
    backgroundAlt: '#f8f9fa',
    border: '#e2e2e2',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
  },
  fonts: {
    base: 'Open Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: 'Teko, Open Sans, sans-serif',
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 20px rgba(0,0,0,0.15)',
    xl: '0 20px 40px rgba(0,0,0,0.2)',
  },
  animations: {
    duration: '0.4s',
    easing: 'ease-in-out',
  }
};

// Global styles injection
const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: ${theme.fonts.base};
    font-size: 14px;
    line-height: 1.7;
    color: ${theme.colors.text};
    background: ${theme.colors.background};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${theme.fonts.heading};
    color: ${theme.colors.heading};
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  .magic-card {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: ${theme.shadows.sm};
    transition: all ${theme.animations.duration} ${theme.animations.easing};
    border: 1px solid ${theme.colors.border};
  }

  .magic-card:hover {
    box-shadow: ${theme.shadows.md};
    transform: translateY(-2px);
  }

  .magic-button {
    background: ${theme.colors.primary};
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${theme.animations.duration} ${theme.animations.easing};
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .magic-button:hover {
    background: #2593e2;
    transform: translateY(-1px);
    box-shadow: ${theme.shadows.md};
  }

  .magic-button:active {
    transform: translateY(0);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .animate-slide-in {
    animation: slideIn 0.5s ease-out forwards;
  }

  .animate-pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    body {
      font-size: 16px;
    }
    
    .magic-card {
      padding: 16px;
    }
  }
`;

// Inject styles
if (!document.getElementById('magic-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'magic-styles';
  styleSheet.textContent = globalStyles;
  document.head.appendChild(styleSheet);
}

// Optimized Stats Card Component
const StatsCard = memo(({ title, value, icon: Icon, trend, color = theme.colors.primary }: any) => (
  <div className="magic-card animate-slide-in" style={{ animationDelay: `${Math.random() * 0.3}s` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
      <div>
        <p style={{ fontSize: '12px', color: theme.colors.text, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </p>
        <h2 style={{ fontSize: '32px', fontWeight: '700', color: theme.colors.heading, fontFamily: theme.fonts.heading }}>
          {value}
        </h2>
      </div>
      <div style={{ 
        width: '48px', 
        height: '48px', 
        borderRadius: '12px', 
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={24} color={color} />
      </div>
    </div>
    {trend && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
        <TrendingUp size={16} color={trend > 0 ? theme.colors.success : theme.colors.danger} />
        <span style={{ color: trend > 0 ? theme.colors.success : theme.colors.danger, fontWeight: '600' }}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
        <span style={{ color: theme.colors.text }}>vs hier</span>
      </div>
    )}
  </div>
));

// Navigation Component
const Navigation = memo(({ activeSection, setActiveSection }: any) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Home },
    { id: 'calls', label: 'Appels', icon: PhoneCall },
    { id: 'appointments', label: 'Rendez-vous', icon: Calendar },
    { id: 'alerts', label: 'Alertes', icon: Bell },
    { id: 'analytics', label: 'Analytiques', icon: BarChart3 },
  ];

  return (
    <nav style={{
      background: 'white',
      borderBottom: `1px solid ${theme.colors.border}`,
      padding: '16px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: theme.shadows.sm
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Droplets size={32} color={theme.colors.primary} />
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: theme.colors.heading, fontFamily: theme.fonts.heading }}>
            Drain Fortin
          </h1>
        </div>

        {/* Desktop Navigation */}
        <div style={{ display: 'flex', gap: '8px' }} className="desktop-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                background: activeSection === item.id ? theme.colors.primary : 'transparent',
                color: activeSection === item.id ? 'white' : theme.colors.text,
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: `all ${theme.animations.duration} ${theme.animations.easing}`,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: theme.colors.heading
          }}
          className="mobile-menu-btn"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          borderBottom: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadows.md,
          padding: '16px'
        }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setMobileMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px',
                background: activeSection === item.id ? `${theme.colors.primary}10` : 'transparent',
                color: activeSection === item.id ? theme.colors.primary : theme.colors.text,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                textAlign: 'left'
              }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  );
});

// Main Dashboard Component
const Dashboard = memo(() => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [realtimeData, setRealtimeData] = useState<any>({});

  // Fetch dashboard data
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [calls, appointments, alerts] = await Promise.all([
        supabase.from('call_logs').select('*', { count: 'exact' }),
        supabase.from('appointments').select('*', { count: 'exact' }),
        supabase.from('alerts').select('*', { count: 'exact' })
      ]);

      return {
        totalCalls: calls.count || 0,
        appointments: appointments.count || 0,
        activeAlerts: alerts.count || 0,
        conversionRate: 67
      };
    }
  });

  // Setup realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        setRealtimeData(prev => ({ ...prev, lastUpdate: Date.now() }));
        queryClient.invalidateQueries(['dashboard-stats']);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: theme.colors.backgroundAlt
      }}>
        <div className="animate-pulse" style={{ textAlign: 'center' }}>
          <Droplets size={48} color={theme.colors.primary} />
          <p style={{ marginTop: '16px', color: theme.colors.text }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.backgroundAlt }}>
      <Navigation activeSection={activeSection} setActiveSection={setActiveSection} />
      
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
        {/* Real-time Status Bar */}
        <div className="magic-card" style={{ 
          marginBottom: '24px',
          background: `linear-gradient(135deg, ${theme.colors.primary}10 0%, ${theme.colors.primary}05 100%)`,
          border: `1px solid ${theme.colors.primary}30`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: theme.colors.success,
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: theme.colors.heading }}>
              Système en ligne
            </span>
            <span style={{ fontSize: '12px', color: theme.colors.text, marginLeft: 'auto' }}>
              Dernière mise à jour: {new Date().toLocaleTimeString('fr-CA')}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <StatsCard
            title="Appels aujourd'hui"
            value={stats?.totalCalls || 0}
            icon={PhoneCall}
            trend={12}
            color={theme.colors.primary}
          />
          <StatsCard
            title="Rendez-vous"
            value={stats?.appointments || 0}
            icon={Calendar}
            trend={-5}
            color={theme.colors.info}
          />
          <StatsCard
            title="Alertes actives"
            value={stats?.activeAlerts || 0}
            icon={AlertCircle}
            trend={0}
            color={theme.colors.warning}
          />
          <StatsCard
            title="Taux conversion"
            value={`${stats?.conversionRate || 0}%`}
            icon={TrendingUp}
            trend={8}
            color={theme.colors.success}
          />
        </div>

        {/* Content Sections */}
        {activeSection === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            <div className="magic-card">
              <h2 style={{ fontSize: '20px', marginBottom: '16px', fontFamily: theme.fonts.heading }}>
                Activité récente
              </h2>
              <Suspense fallback={<div className="animate-pulse">Chargement des graphiques...</div>}>
                <Charts />
              </Suspense>
            </div>

            <div className="magic-card">
              <h2 style={{ fontSize: '20px', marginBottom: '16px', fontFamily: theme.fonts.heading }}>
                Appels en cours
              </h2>
              <Suspense fallback={<div className="animate-pulse">Chargement des données...</div>}>
                <DataTable />
              </Suspense>
            </div>
          </div>
        )}

        {activeSection === 'calls' && (
          <div className="magic-card animate-slide-in">
            <h2 style={{ fontSize: '24px', marginBottom: '20px', fontFamily: theme.fonts.heading }}>
              Gestion des appels
            </h2>
            <p style={{ color: theme.colors.text }}>
              Interface de gestion des appels avec VAPI Paul Assistant
            </p>
          </div>
        )}

        {activeSection === 'appointments' && (
          <div className="magic-card animate-slide-in">
            <h2 style={{ fontSize: '24px', marginBottom: '20px', fontFamily: theme.fonts.heading }}>
              Calendrier des rendez-vous
            </h2>
            <p style={{ color: theme.colors.text }}>
              Planification et gestion des interventions
            </p>
          </div>
        )}

        {activeSection === 'alerts' && (
          <div className="magic-card animate-slide-in">
            <h2 style={{ fontSize: '24px', marginBottom: '20px', fontFamily: theme.fonts.heading }}>
              Centre d'alertes
            </h2>
            <p style={{ color: theme.colors.text }}>
              Notifications et alertes système en temps réel
            </p>
          </div>
        )}

        {activeSection === 'analytics' && (
          <div className="magic-card animate-slide-in">
            <h2 style={{ fontSize: '24px', marginBottom: '20px', fontFamily: theme.fonts.heading }}>
              Analytiques avancées
            </h2>
            <p style={{ color: theme.colors.text }}>
              Rapports détaillés et métriques de performance
            </p>
          </div>
        )}
      </main>
    </div>
  );
});

// Main App Component with Error Boundary
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center'
        }}>
          <AlertCircle size={48} color={theme.colors.danger} />
          <h2 style={{ marginTop: '16px', color: theme.colors.heading }}>Une erreur est survenue</h2>
          <p style={{ color: theme.colors.text, marginTop: '8px' }}>
            Veuillez rafraîchir la page ou contacter le support.
          </p>
          <button 
            className="magic-button" 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px' }}
          >
            Rafraîchir la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}