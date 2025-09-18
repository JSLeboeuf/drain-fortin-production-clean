/**
 * Alerts Panel Component
 * Displays system alerts and notifications
 */

import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';

import { DRAIN_FORTIN_COLORS } from '@/config/theme';
import type { AlertsPanelProps } from '@/types';
import Card from '../ui/Card';

const AlertsPanel = memo<AlertsPanelProps>(({ alerts, onDismissAlert }) => {
  const containerStyles: React.CSSProperties = {
    maxHeight: '300px',
    overflowY: 'auto' as const,
  };

  const emptyStateStyles: React.CSSProperties = {
    color: DRAIN_FORTIN_COLORS.gray,
    textAlign: 'center' as const,
    padding: '20px'
  };

  const alertsListStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  };

  const getAlertStyles = (alertType: string): React.CSSProperties => ({
    padding: '12px',
    background: alertType === 'error' 
      ? `${DRAIN_FORTIN_COLORS.danger}10` 
      : `${DRAIN_FORTIN_COLORS.warning}10`,
    borderLeft: `4px solid ${
      alertType === 'error' ? DRAIN_FORTIN_COLORS.danger : DRAIN_FORTIN_COLORS.warning
    }`,
    borderRadius: '4px',
    position: 'relative' as const,
  });

  const alertContentStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'start',
    gap: '12px'
  };

  const alertTextStyles: React.CSSProperties = {
    flex: 1
  };

  const alertTitleStyles: React.CSSProperties = {
    fontWeight: '600',
    marginBottom: '4px'
  };

  const alertMessageStyles: React.CSSProperties = {
    fontSize: '12px',
    color: DRAIN_FORTIN_COLORS.gray
  };

  const alertTimeStyles: React.CSSProperties = {
    fontSize: '11px',
    color: DRAIN_FORTIN_COLORS.gray,
    marginTop: '4px'
  };

  const dismissButtonStyles: React.CSSProperties = {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '2px',
    color: DRAIN_FORTIN_COLORS.gray,
    fontSize: '12px',
  };

  const getAlertIcon = (alertType: string) => {
    const color = alertType === 'error' ? DRAIN_FORTIN_COLORS.danger : DRAIN_FORTIN_COLORS.warning;
    return <AlertTriangle size={18} color={color} aria-hidden="true" />;
  };

  const formatAlertTime = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleTimeString('fr-CA');
    } catch {
      return 'Heure inconnue';
    }
  };

  if (!alerts || alerts.length === 0) {
    return (
      <Card title="Alertes système">
        <div style={containerStyles}>
          <p style={emptyStateStyles}>
            Aucune alerte
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Alertes système">
      <div style={containerStyles} className="custom-scrollbar">
        <div style={alertsListStyles}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="animate-slide-in-right"
              style={getAlertStyles(alert.type)}
              role="alert"
              aria-live="polite"
            >
              <div style={alertContentStyles}>
                {getAlertIcon(alert.type)}
                <div style={alertTextStyles}>
                  <p style={alertTitleStyles}>
                    {alert.message}
                  </p>
                  <p style={alertTimeStyles}>
                    {formatAlertTime(alert.timestamp)}
                  </p>
                </div>
                {onDismissAlert && (
                  <button
                    style={dismissButtonStyles}
                    onClick={() => onDismissAlert(alert.id)}
                    aria-label={`Dismiss alert: ${alert.message}`}
                    title="Dismiss alert"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${DRAIN_FORTIN_COLORS.gray}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
});

AlertsPanel.displayName = 'AlertsPanel';

export default AlertsPanel;