/**
 * Status Badge Component
 * Visual status indicator with consistent styling
 */

import React, { memo } from 'react';
import { Circle } from 'lucide-react';
import { DRAIN_FORTIN_COLORS } from '@/constants/colors';

export interface StatusBadgeProps {
  status: 'active' | 'completed' | 'failed' | 'pending';
  live?: boolean;
}

export const StatusBadge = memo<StatusBadgeProps>(({ status, live = false }) => {
  const colors = {
    active: DRAIN_FORTIN_COLORS.liveGreen,
    completed: DRAIN_FORTIN_COLORS.success,
    failed: DRAIN_FORTIN_COLORS.danger,
    pending: DRAIN_FORTIN_COLORS.warning,
  };

  const labels = {
    active: 'En cours',
    completed: 'Terminé',
    failed: 'Échec',
    pending: 'En attente',
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      background: `${colors[status]}20`,
      color: colors[status],
      animation: live && status === 'active' ? 'pulse 2s infinite' : undefined
    }}>
      <Circle size={8} fill="currentColor" />
      {labels[status]}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';