import React, { useState, useEffect, useCallback, memo, Suspense, lazy } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
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
  Wrench,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Filter,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Eye,
  AlertTriangle,
  ChevronRight,
  Circle
} from 'lucide-react';

// =====================================
// CONFIGURATION DRAIN FORTIN
// =====================================

// Palette de couleurs EXACTE de Drain Fortin
const DRAIN_FORTIN_COLORS = {
  blueDark: '#263559',      // Bleu-gris foncé (headers, menus)
  orange: '#FF9900',        // Orange brandé (CTAs, accents)
  white: '#FFFFFF',         // Blanc pur (fonds)
  grayLight: '#F4F4F4',     // Gris clair (sections secondaires)
  black: '#000000',         // Noir (textes importants)
  gray: '#666666',          // Gris (textes secondaires)
  success: '#4CAF50',       // Vert succès
  warning: '#FF9900',       // Orange warning (même que brand)
  danger: '#F44336',        // Rouge erreur
  info: '#2196F3',          // Bleu info
  liveGreen: '#00C851',     // Vert live
  hoverOrange: '#E68900',   // Orange hover (plus foncé)
  blueLightBg: '#F0F4FA',   // Bleu très clair pour hover rows
};

// Configuration Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  {
    auth: { persistSession: true },
    realtime: { 
      params: { 
        eventsPerSecond: 10 
      }
    }
  }
);

// Query Client avec cache agressif
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 secondes
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// Lazy load pour les composants lourds
const Charts = lazy(() => import('recharts').then(module => ({
  default: () => <BarChartComponent />
})));

// =====================================
// STYLES GLOBAUX DRAIN FORTIN
// =====================================

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap');
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: ${DRAIN_FORTIN_COLORS.black};
    background: ${DRAIN_FORTIN_COLORS.grayLight};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Scrollbar personnalisée */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${DRAIN_FORTIN_COLORS.grayLight};
  }

  ::-webkit-scrollbar-thumb {
    background: ${DRAIN_FORTIN_COLORS.blueDark};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${DRAIN_FORTIN_COLORS.orange};
  }

  /* Animations */
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .animate-slide-in-right {
    animation: slideInRight 0.3s ease-out;
  }

  .animate-pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  /* Focus visible pour accessibilité */
  *:focus-visible {
    outline: 2px solid ${DRAIN_FORTIN_COLORS.orange};
    outline-offset: 2px;
  }

  /* Transitions par défaut */
  button, a, input, select, textarea {
    transition: all 0.2s ease;
  }
`;

// Injecter les styles
if (!document.getElementById('drain-fortin-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'drain-fortin-styles';
  styleSheet.textContent = globalStyles;
  document.head.appendChild(styleSheet);
}

// =====================================
// COMPOSANTS UI DRAIN FORTIN
// =====================================

// Bouton principal orange
const ButtonPrimary = memo(({ children, onClick, disabled = false, icon: Icon, ...props }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: disabled ? DRAIN_FORTIN_COLORS.gray : DRAIN_FORTIN_COLORS.orange,
      color: DRAIN_FORTIN_COLORS.white,
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      opacity: disabled ? 0.6 : 1,
    }}
    onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = DRAIN_FORTIN_COLORS.hoverOrange)}
    onMouseLeave={(e) => !disabled && (e.currentTarget.style.background = DRAIN_FORTIN_COLORS.orange)}
    {...props}
  >
    {Icon && <Icon size={18} />}
    {children}
  </button>
));

// Card avec style Drain Fortin
const Card = memo(({ children, title, className = '', style = {} }: any) => (
  <div 
    className={`animate-fade-in ${className}`}
    style={{
      background: DRAIN_FORTIN_COLORS.white,
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      marginBottom: '20px',
      ...style
    }}
  >
    {title && (
      <h3 style={{
        fontSize: '18px',
        fontWeight: '700',
        color: DRAIN_FORTIN_COLORS.blueDark,
        marginBottom: '16px',
        borderBottom: `2px solid ${DRAIN_FORTIN_COLORS.orange}`,
        paddingBottom: '8px'
      }}>
        {title}
      </h3>
    )}
    {children}
  </div>
));

// Badge de statut
const StatusBadge = memo(({ status, live = false }: any) => {
  const colors = {
    active: DRAIN_FORTIN_COLORS.liveGreen,
    completed: DRAIN_FORTIN_COLORS.success,
    failed: DRAIN_FORTIN_COLORS.danger,
    pending: DRAIN_FORTIN_COLORS.warning,
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      background: colors[status] || DRAIN_FORTIN_COLORS.gray,
      color: DRAIN_FORTIN_COLORS.white,
    }}>
      {live && <Circle size={8} className="animate-pulse" fill="currentColor" />}
      {status === 'active' ? 'En cours' : 
       status === 'completed' ? 'Terminé' :
       status === 'failed' ? 'Échec' : 
       status === 'pending' ? 'En attente' : status}
    </span>
  );
});

// =====================================
// HEADER DRAIN FORTIN
// =====================================

const Header = memo(({ connectionStatus, alertCount }: any) => (
  <header style={{
    background: DRAIN_FORTIN_COLORS.blueDark,
    color: DRAIN_FORTIN_COLORS.white,
    padding: '16px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  }}>
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      {/* Logo et titre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Droplets size={32} color={DRAIN_FORTIN_COLORS.orange} />
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '700',
            margin: 0 
          }}>
            Monitoring IA Réceptionniste
          </h1>
          <p style={{ 
            fontSize: '12px', 
            opacity: 0.8,
            margin: 0 
          }}>
            Drain Fortin - Système VAPI
          </p>
        </div>
      </div>

      {/* Statut et alertes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Statut connexion */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '4px'
        }}>
          {connectionStatus === 'connected' ? (
            <>
              <Wifi size={18} color={DRAIN_FORTIN_COLORS.liveGreen} />
              <span style={{ fontSize: '14px' }}>Connecté</span>
            </>
          ) : (
            <>
              <WifiOff size={18} color={DRAIN_FORTIN_COLORS.danger} />
              <span style={{ fontSize: '14px' }}>Déconnecté</span>
            </>
          )}
        </div>

        {/* Badge alertes */}
        {alertCount > 0 && (
          <div style={{
            background: DRAIN_FORTIN_COLORS.orange,
            borderRadius: '20px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}>
            <Bell size={18} />
            <span style={{ fontWeight: '600' }}>{alertCount}</span>
          </div>
        )}

        {/* Version API */}
        <span style={{ 
          fontSize: '11px', 
          opacity: 0.6 
        }}>
          v2.0.0
        </span>
      </div>
    </div>
  </header>
));

// =====================================
// SECTION CONVERSATIONS LIVE
// =====================================

const LiveConversations = memo(({ calls }: any) => {
  const activeCalls = calls?.filter((c: any) => c.status === 'active') || [];

  return (
    <Card title="Conversations en direct">
      {activeCalls.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: DRAIN_FORTIN_COLORS.gray,
          background: DRAIN_FORTIN_COLORS.grayLight,
          borderRadius: '4px'
        }}>
          <PhoneCall size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontSize: '16px' }}>Aucun appel en cours</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeCalls.map((call: any) => (
            <div
              key={call.id}
              className="animate-slide-in-right"
              style={{
                padding: '16px',
                background: DRAIN_FORTIN_COLORS.grayLight,
                borderRadius: '4px',
                borderLeft: `4px solid ${DRAIN_FORTIN_COLORS.liveGreen}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <StatusBadge status="active" live />
                <div>
                  <p style={{ fontWeight: '600', color: DRAIN_FORTIN_COLORS.blueDark }}>
                    {call.customer_phone || 'Numéro masqué'}
                  </p>
                  <p style={{ fontSize: '12px', color: DRAIN_FORTIN_COLORS.gray }}>
                    Durée: {call.duration || '0'}s | Agent: Paul
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <ButtonPrimary icon={Volume2}>
                  Écouter
                </ButtonPrimary>
                <ButtonPrimary icon={Eye}>
                  Transcript
                </ButtonPrimary>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

// =====================================
// GRAPHIQUE DES APPELS
// =====================================

const BarChartComponent = memo(() => {
  // Données de démonstration
  const data = [
    { heure: '08h', appels: 4 },
    { heure: '09h', appels: 12 },
    { heure: '10h', appels: 18 },
    { heure: '11h', appels: 15 },
    { heure: '12h', appels: 8 },
    { heure: '13h', appels: 10 },
    { heure: '14h', appels: 22 },
    { heure: '15h', appels: 19 },
    { heure: '16h', appels: 14 },
    { heure: '17h', appels: 7 },
  ];

  const maxValue = Math.max(...data.map(d => d.appels));

  return (
    <Card title="Graphique des appels par heure">
      <div style={{ padding: '20px 0' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          justifyContent: 'space-between',
          height: '200px',
          marginBottom: '8px'
        }}>
          {data.map((item, index) => {
            const height = (item.appels / maxValue) * 100;
            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ 
                  fontSize: '10px', 
                  color: DRAIN_FORTIN_COLORS.gray,
                  fontWeight: '600'
                }}>
                  {item.appels}
                </span>
                <div
                  style={{
                    width: '80%',
                    height: `${height}%`,
                    background: DRAIN_FORTIN_COLORS.blueDark,
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = DRAIN_FORTIN_COLORS.orange;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = DRAIN_FORTIN_COLORS.blueDark;
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          borderTop: `2px solid ${DRAIN_FORTIN_COLORS.grayLight}`,
          paddingTop: '8px'
        }}>
          {data.map((item, index) => (
            <div key={index} style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: DRAIN_FORTIN_COLORS.gray }}>
                {item.heure}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
});

// =====================================
// TABLEAU HISTORIQUE DES APPELS
// =====================================

const CallHistoryTable = memo(({ calls }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCall, setSelectedCall] = useState<any>(null);

  const filteredCalls = calls?.filter((call: any) => 
    call.customer_phone?.includes(searchTerm) ||
    call.status?.includes(searchTerm)
  ) || [];

  return (
    <>
      <Card title="Historique des appels">
        {/* Barre de recherche */}
        <div style={{ 
          marginBottom: '20px',
          display: 'flex',
          gap: '12px'
        }}>
          <div style={{
            flex: 1,
            position: 'relative'
          }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: DRAIN_FORTIN_COLORS.gray
            }} />
            <input
              type="text"
              placeholder="Rechercher par numéro ou statut..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: `1px solid ${DRAIN_FORTIN_COLORS.grayLight}`,
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = DRAIN_FORTIN_COLORS.orange}
              onBlur={(e) => e.currentTarget.style.borderColor = DRAIN_FORTIN_COLORS.grayLight}
            />
          </div>
          <ButtonPrimary icon={RefreshCw}>
            Actualiser
          </ButtonPrimary>
          <ButtonPrimary icon={Download}>
            Exporter
          </ButtonPrimary>
        </div>

        {/* Tableau */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: DRAIN_FORTIN_COLORS.blueDark }}>
                <th style={{ padding: '12px', textAlign: 'left', color: DRAIN_FORTIN_COLORS.white, fontWeight: '600' }}>
                  Date
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: DRAIN_FORTIN_COLORS.white, fontWeight: '600' }}>
                  Statut
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: DRAIN_FORTIN_COLORS.white, fontWeight: '600' }}>
                  Numéro
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: DRAIN_FORTIN_COLORS.white, fontWeight: '600' }}>
                  Durée
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: DRAIN_FORTIN_COLORS.white, fontWeight: '600' }}>
                  Motif
                </th>
                <th style={{ padding: '12px', textAlign: 'center', color: DRAIN_FORTIN_COLORS.white, fontWeight: '600' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ 
                    padding: '40px', 
                    textAlign: 'center',
                    color: DRAIN_FORTIN_COLORS.gray 
                  }}>
                    Aucun appel trouvé
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call: any, index: number) => (
                  <tr 
                    key={call.id || index}
                    style={{ 
                      borderBottom: `1px solid ${DRAIN_FORTIN_COLORS.grayLight}`,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = DRAIN_FORTIN_COLORS.blueLightBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {new Date(call.created_at).toLocaleString('fr-CA')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <StatusBadge status={call.status} />
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {call.customer_phone || 'Non disponible'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {call.duration || 0}s
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        background: DRAIN_FORTIN_COLORS.grayLight,
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {call.reason || 'Général'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <ButtonPrimary 
                        onClick={() => setSelectedCall(call)}
                        icon={Eye}
                      >
                        Voir transcript
                      </ButtonPrimary>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Transcript */}
      {selectedCall && (
        <TranscriptModal 
          call={selectedCall} 
          onClose={() => setSelectedCall(null)} 
        />
      )}
    </>
  );
});

// =====================================
// MODAL TRANSCRIPT
// =====================================

const TranscriptModal = memo(({ call, onClose }: any) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px'
  }} onClick={onClose}>
    <div 
      className="animate-fade-in"
      style={{
        background: DRAIN_FORTIN_COLORS.white,
        borderRadius: '8px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${DRAIN_FORTIN_COLORS.grayLight}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: DRAIN_FORTIN_COLORS.blueDark,
        color: DRAIN_FORTIN_COLORS.white
      }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>
          Transcript - {call.customer_phone}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: DRAIN_FORTIN_COLORS.white,
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div style={{
        padding: '20px',
        overflowY: 'auto',
        flex: 1
      }}>
        <div style={{ marginBottom: '20px' }}>
          <p><strong>Date:</strong> {new Date(call.created_at).toLocaleString('fr-CA')}</p>
          <p><strong>Durée:</strong> {call.duration || 0} secondes</p>
          <p><strong>Statut:</strong> <StatusBadge status={call.status} /></p>
        </div>

        <div style={{
          background: DRAIN_FORTIN_COLORS.grayLight,
          padding: '16px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.8'
        }}>
          {call.transcript || 'Transcript non disponible'}
        </div>

        {/* Actions */}
        <div style={{
          marginTop: '20px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <ButtonPrimary icon={ThumbsUp}>
            Feedback positif
          </ButtonPrimary>
          <ButtonPrimary icon={ThumbsDown}>
            Feedback négatif
          </ButtonPrimary>
          <ButtonPrimary icon={Download}>
            Télécharger
          </ButtonPrimary>
        </div>
      </div>
    </div>
  </div>
));

// =====================================
// PANNEAU D'ALERTES
// =====================================

const AlertsPanel = memo(({ alerts }: any) => (
  <Card title="Alertes système">
    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
      {alerts?.length === 0 ? (
        <p style={{ color: DRAIN_FORTIN_COLORS.gray, textAlign: 'center', padding: '20px' }}>
          Aucune alerte
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts?.map((alert: any, index: number) => (
            <div
              key={index}
              className="animate-slide-in-right"
              style={{
                padding: '12px',
                background: alert.type === 'error' ? 
                  `${DRAIN_FORTIN_COLORS.danger}10` : 
                  `${DRAIN_FORTIN_COLORS.warning}10`,
                borderLeft: `4px solid ${
                  alert.type === 'error' ? DRAIN_FORTIN_COLORS.danger : DRAIN_FORTIN_COLORS.warning
                }`,
                borderRadius: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <AlertTriangle size={18} color={
                  alert.type === 'error' ? DRAIN_FORTIN_COLORS.danger : DRAIN_FORTIN_COLORS.warning
                } />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {alert.title}
                  </p>
                  <p style={{ fontSize: '12px', color: DRAIN_FORTIN_COLORS.gray }}>
                    {alert.message}
                  </p>
                  <p style={{ fontSize: '11px', color: DRAIN_FORTIN_COLORS.gray, marginTop: '4px' }}>
                    {new Date(alert.created_at).toLocaleTimeString('fr-CA')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </Card>
));

// =====================================
// STATISTIQUES RAPIDES
// =====================================

const QuickStats = memo(({ stats }: any) => {
  const statCards = [
    { 
      label: 'Appels aujourd\'hui', 
      value: stats?.todayCalls || 0, 
      icon: PhoneCall,
      color: DRAIN_FORTIN_COLORS.info
    },
    { 
      label: 'Appels réussis', 
      value: stats?.successCalls || 0, 
      icon: CheckCircle,
      color: DRAIN_FORTIN_COLORS.success
    },
    { 
      label: 'Appels échoués', 
      value: stats?.failedCalls || 0, 
      icon: XCircle,
      color: DRAIN_FORTIN_COLORS.danger
    },
    { 
      label: 'Temps moyen', 
      value: `${stats?.avgDuration || 0}s`, 
      icon: Clock,
      color: DRAIN_FORTIN_COLORS.orange
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '20px'
    }}>
      {statCards.map((stat, index) => (
        <Card key={index} style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ 
                fontSize: '12px', 
                color: DRAIN_FORTIN_COLORS.gray,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {stat.label}
              </p>
              <p style={{ 
                fontSize: '32px', 
                fontWeight: '700',
                color: DRAIN_FORTIN_COLORS.blueDark,
                margin: 0
              }}>
                {stat.value}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              background: `${stat.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <stat.icon size={24} color={stat.color} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
});

// =====================================
// COMPOSANT PRINCIPAL APP
// =====================================

const Dashboard = memo(() => {
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [alerts, setAlerts] = useState<any[]>([]);

  // Fetch des données
  const { data: calls, refetch: refetchCalls } = useQuery({
    queryKey: ['vapi-calls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000 // Refetch toutes les 5 secondes
  });

  // Stats calculées
  const stats = {
    todayCalls: calls?.filter(c => {
      const today = new Date().toDateString();
      return new Date(c.created_at).toDateString() === today;
    }).length || 0,
    successCalls: calls?.filter(c => c.status === 'completed').length || 0,
    failedCalls: calls?.filter(c => c.status === 'failed').length || 0,
    avgDuration: calls?.length ? 
      Math.round(calls.reduce((acc, c) => acc + (c.duration || 0), 0) / calls.length) : 0
  };

  // WebSocket pour le temps réel
  useEffect(() => {
    const channel = supabase
      .channel('vapi-monitoring')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'call_logs' }, 
        (payload) => {
          console.log('Changement détecté:', payload);
          refetchCalls();
          
          // Ajouter une alerte pour les nouveaux appels
          if (payload.eventType === 'INSERT') {
            setAlerts(prev => [{
              type: 'info',
              title: 'Nouvel appel',
              message: `Appel entrant de ${payload.new.customer_phone}`,
              created_at: new Date().toISOString()
            }, ...prev].slice(0, 10));
          }
        }
      )
      .subscribe((status) => {
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchCalls]);

  // Gestion des erreurs de connexion
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      setAlerts(prev => [{
        type: 'error',
        title: 'Erreur de connexion',
        message: 'Connexion perdue avec VAPI. Tentative de reconnexion...',
        created_at: new Date().toISOString()
      }, ...prev].slice(0, 10));
    }
  }, [connectionStatus]);

  return (
    <div style={{ minHeight: '100vh', background: DRAIN_FORTIN_COLORS.grayLight }}>
      {/* Header */}
      <Header connectionStatus={connectionStatus} alertCount={alerts.length} />

      {/* Contenu principal */}
      <main style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '24px'
      }}>
        {/* Stats rapides */}
        <QuickStats stats={stats} />

        {/* Grid principal */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: '20px'
        }}>
          {/* Colonne principale */}
          <div>
            {/* Conversations live */}
            <LiveConversations calls={calls} />

            {/* Graphique */}
            <Suspense fallback={
              <Card title="Graphique des appels par heure">
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="animate-pulse">Chargement...</div>
                </div>
              </Card>
            }>
              <Charts />
            </Suspense>

            {/* Historique */}
            <CallHistoryTable calls={calls} />
          </div>

          {/* Colonne latérale */}
          <div>
            {/* Alertes */}
            <AlertsPanel alerts={alerts} />

            {/* Actions rapides */}
            <Card title="Actions rapides">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <ButtonPrimary icon={PhoneCall}>
                  Tester un appel
                </ButtonPrimary>
                <ButtonPrimary icon={Settings}>
                  Configuration VAPI
                </ButtonPrimary>
                <ButtonPrimary icon={Download}>
                  Exporter rapport
                </ButtonPrimary>
              </div>
            </Card>

            {/* Feedback */}
            <Card title="Feedback système">
              <p style={{ fontSize: '14px', marginBottom: '16px', color: DRAIN_FORTIN_COLORS.gray }}>
                Comment évaluez-vous le système aujourd'hui?
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <ButtonPrimary icon={ThumbsUp}>
                  Bon
                </ButtonPrimary>
                <ButtonPrimary icon={ThumbsDown}>
                  À améliorer
                </ButtonPrimary>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Banner d'erreur si déconnecté */}
      {connectionStatus === 'disconnected' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: DRAIN_FORTIN_COLORS.orange,
          color: DRAIN_FORTIN_COLORS.white,
          padding: '16px 20px',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '400px',
          zIndex: 3000
        }} className="animate-slide-in-right">
          <AlertTriangle size={24} />
          <div>
            <p style={{ fontWeight: '600', marginBottom: '4px' }}>
              Erreur de connexion à VAPI
            </p>
            <p style={{ fontSize: '12px' }}>
              Tentative de reconnexion en cours...
            </p>
          </div>
          <ButtonPrimary onClick={() => window.location.reload()}>
            Réessayer
          </ButtonPrimary>
        </div>
      )}
    </div>
  );
});

// Error Boundary
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
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          background: DRAIN_FORTIN_COLORS.grayLight
        }}>
          <AlertCircle size={48} color={DRAIN_FORTIN_COLORS.danger} />
          <h2 style={{ marginTop: '16px', color: DRAIN_FORTIN_COLORS.blueDark }}>
            Une erreur est survenue
          </h2>
          <p style={{ color: DRAIN_FORTIN_COLORS.gray, marginTop: '8px' }}>
            Le système de monitoring a rencontré un problème.
          </p>
          <ButtonPrimary 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px' }}
          >
            Rafraîchir la page
          </ButtonPrimary>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export principal
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}