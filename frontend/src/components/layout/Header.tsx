/**
 * Header Component
 * Main application header with connection status and navigation
 */

import React, { memo } from 'react';
import { Bell, Wifi, WifiOff, Menu, Zap } from 'lucide-react';

import { DRAIN_FORTIN_COLORS, DRAIN_FORTIN_SHADOWS } from '@/config/theme';
import type { HeaderProps } from '@/types';

const Header = memo<HeaderProps>(({ 
  connectionStatus, 
  alertCount,
  onMenuToggle 
}) => {
  const headerStyles: React.CSSProperties = {
    background: DRAIN_FORTIN_COLORS.blueDark,
    color: DRAIN_FORTIN_COLORS.white,
    padding: '16px 24px',
    boxShadow: DRAIN_FORTIN_SHADOWS.md,
    position: 'sticky' as const,
    top: 0,
    zIndex: 1000,
  };

  const containerStyles: React.CSSProperties = {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const logoStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '20px',
    fontWeight: '700',
    color: DRAIN_FORTIN_COLORS.white,
  };

  const navStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  };

  const connectionIconStyles: React.CSSProperties = {
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: connectionStatus === 'connected' 
      ? DRAIN_FORTIN_COLORS.success 
      : DRAIN_FORTIN_COLORS.danger,
    transition: 'all 0.3s ease',
  };

  const alertBadgeStyles: React.CSSProperties = {
    position: 'relative' as const,
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    backgroundColor: alertCount > 0 
      ? DRAIN_FORTIN_COLORS.orange 
      : 'transparent',
    transition: 'all 0.2s ease',
  };

  const alertCountStyles: React.CSSProperties = {
    position: 'absolute' as const,
    top: '-2px',
    right: '-2px',
    backgroundColor: DRAIN_FORTIN_COLORS.danger,
    color: DRAIN_FORTIN_COLORS.white,
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: '600',
    border: `2px solid ${DRAIN_FORTIN_COLORS.blueDark}`,
  };

  const menuButtonStyles: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: DRAIN_FORTIN_COLORS.white,
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.2s ease',
  };

  return (
    <header style={headerStyles} role="banner">
      <div style={containerStyles}>
        <div style={logoStyles}>
          <Zap size={24} color={DRAIN_FORTIN_COLORS.orange} />
          <span>Drain Fortin</span>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: '400',
            opacity: 0.8,
            backgroundColor: DRAIN_FORTIN_COLORS.orange,
            padding: '2px 6px',
            borderRadius: '3px',
          }}>
            MONITORING
          </span>
        </div>

        <nav style={navStyles} role="navigation" aria-label="Main navigation">
          {/* Connection Status */}
          <div 
            style={connectionIconStyles}
            title={connectionStatus === 'connected' ? 'Connecté à VAPI' : 'Déconnecté de VAPI'}
            aria-label={`Connection status: ${connectionStatus}`}
          >
            {connectionStatus === 'connected' ? (
              <Wifi size={16} color={DRAIN_FORTIN_COLORS.white} />
            ) : (
              <WifiOff size={16} color={DRAIN_FORTIN_COLORS.white} />
            )}
          </div>

          {/* Alerts */}
          <div 
            style={alertBadgeStyles}
            title={`${alertCount} alertes`}
            role="button"
            tabIndex={0}
            aria-label={`${alertCount} alerts`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                // Handle alerts panel toggle
              }
            }}
          >
            <Bell size={20} color={DRAIN_FORTIN_COLORS.white} />
            {alertCount > 0 && (
              <span style={alertCountStyles} aria-hidden="true">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </div>

          {/* Menu Toggle */}
          {onMenuToggle && (
            <button 
              style={menuButtonStyles}
              onClick={onMenuToggle}
              aria-label="Toggle menu"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${DRAIN_FORTIN_COLORS.white}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Menu size={20} />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;