/**
 * Header Component
 * Main application header with branding and status indicators
 */

import React, { memo } from 'react';
import { Droplets, Wifi, WifiOff, Bell } from 'lucide-react';
import { DRAIN_FORTIN_COLORS } from '../../constants/colors';

export interface HeaderProps {
  connectionStatus: 'connected' | 'disconnected';
  alertCount: number;
}

export const Header = memo<HeaderProps>(({ connectionStatus, alertCount }) => (
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

Header.displayName = 'Header';