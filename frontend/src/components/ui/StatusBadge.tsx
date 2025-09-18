/**
 * Status Badge Component
 * Displays status with appropriate colors and icons
 */

import React, { memo } from 'react';
import { CheckCircle, XCircle, Clock, Circle } from 'lucide-react';

import { DRAIN_FORTIN_COLORS } from '@/config/theme';
import type { StatusBadgeProps } from '@/types';

const StatusBadge = memo<StatusBadgeProps>(({ 
  status, 
  live = false, 
  showIcon = true 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          color: DRAIN_FORTIN_COLORS.liveGreen,
          backgroundColor: `${DRAIN_FORTIN_COLORS.liveGreen}15`,
          icon: live ? Circle : CheckCircle,
          text: live ? 'EN DIRECT' : 'Actif',
        };
      case 'completed':
        return {
          color: DRAIN_FORTIN_COLORS.success,
          backgroundColor: `${DRAIN_FORTIN_COLORS.success}15`,
          icon: CheckCircle,
          text: 'Terminé',
        };
      case 'failed':
        return {
          color: DRAIN_FORTIN_COLORS.danger,
          backgroundColor: `${DRAIN_FORTIN_COLORS.danger}15`,
          icon: XCircle,
          text: 'Échec',
        };
      case 'queued':
        return {
          color: DRAIN_FORTIN_COLORS.warning,
          backgroundColor: `${DRAIN_FORTIN_COLORS.warning}15`,
          icon: Clock,
          text: 'En attente',
        };
      default:
        return {
          color: DRAIN_FORTIN_COLORS.gray,
          backgroundColor: `${DRAIN_FORTIN_COLORS.gray}15`,
          icon: Circle,
          text: 'Inconnu',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const badgeStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: config.color,
    backgroundColor: config.backgroundColor,
    border: `1px solid ${config.color}`,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  };

  const liveStyles: React.CSSProperties = live ? {
    animation: 'pulse 2s infinite',
  } : {};

  return (
    <span 
      style={{ ...badgeStyles, ...liveStyles }} 
      className={`status-badge status-${status} ${live ? 'status-live' : ''}`}
      role="status"
      aria-label={`Status: ${config.text}`}
    >
      {showIcon && <Icon size={12} />}
      {config.text}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;