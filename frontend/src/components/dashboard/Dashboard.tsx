/**
 * Main Dashboard Component
 * Refactored dashboard with extracted components and hooks
 */

import React, { memo, useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { DRAIN_FORTIN_COLORS } from '../../constants/colors';
import { Header } from '../layout/Header';
import { ButtonPrimary } from '../ui/Button';
import { QuickStats } from './QuickStats';
import { useVapiCalls } from '../../hooks/useVapiCalls';
import { supabase } from '../../config/supabase';

export const Dashboard = memo(() => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const [alerts, setAlerts] = useState<any[]>([]);

  // Use our custom hook for data
  const { calls, stats, isLoading, error, refetch } = useVapiCalls();

  // WebSocket pour le temps réel
  useEffect(() => {
    const channel = supabase
      .channel('vapi-monitoring')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'call_logs' }, 
        (payload) => {
          console.log('Changement détecté:', payload);
          refetch();
          
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
  }, [refetch]);

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

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: DRAIN_FORTIN_COLORS.grayLight
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `4px solid ${DRAIN_FORTIN_COLORS.orange}`,
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: DRAIN_FORTIN_COLORS.grayLight,
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertTriangle size={48} color={DRAIN_FORTIN_COLORS.danger} />
          <h2 style={{ marginTop: '16px', color: DRAIN_FORTIN_COLORS.blueDark }}>
            Erreur de chargement
          </h2>
          <p style={{ color: DRAIN_FORTIN_COLORS.gray, marginTop: '8px' }}>
            Impossible de charger les données du dashboard.
          </p>
          <ButtonPrimary 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px' }}
          >
            Réessayer
          </ButtonPrimary>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: DRAIN_FORTIN_COLORS.grayLight }}>
      <Header 
        connectionStatus={connectionStatus} 
        alertCount={alerts.length} 
      />
      
      {/* Container principal */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px',
      }}>
        {/* Stats rapides */}
        <QuickStats stats={stats} />

        {/* TODO: Add more dashboard sections here */}
        <div style={{ 
          background: DRAIN_FORTIN_COLORS.white, 
          padding: '20px', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3>Dashboard en cours de refactorisation</h3>
          <p>Les autres sections seront ajoutées dans les prochaines étapes.</p>
          <p>Appels chargés: {calls.length}</p>
        </div>
      </div>

      {/* Bannière de reconnexion si déconnecté */}
      {connectionStatus === 'disconnected' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: DRAIN_FORTIN_COLORS.danger,
          color: DRAIN_FORTIN_COLORS.white,
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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

Dashboard.displayName = 'Dashboard';