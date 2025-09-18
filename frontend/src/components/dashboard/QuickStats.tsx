/**
 * Quick Stats Component
 * Displays key metrics in a card grid layout
 */

import React, { memo } from 'react';
import { PhoneCall, CheckCircle, XCircle, Clock } from 'lucide-react';

import { DRAIN_FORTIN_COLORS } from '@/config/theme';
import type { QuickStatsProps } from '@/types';
import Card from '../ui/Card';

const QuickStats = memo<QuickStatsProps>(({ stats }) => {
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

  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  };

  const cardContentStyles: React.CSSProperties = {
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between'
  };

  const labelStyles: React.CSSProperties = { 
    fontSize: '12px', 
    color: DRAIN_FORTIN_COLORS.gray,
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  };

  const valueStyles: React.CSSProperties = { 
    fontSize: '32px', 
    fontWeight: '700',
    color: DRAIN_FORTIN_COLORS.blueDark,
    margin: 0
  };

  const getIconContainerStyles = (color: string): React.CSSProperties => ({
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    background: `${color}15`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  return (
    <div style={gridStyles} role="region" aria-label="Quick statistics">
      {statCards.map((stat, index) => {
        const IconComponent = stat.icon;
        
        return (
          <Card 
            key={index} 
            style={{ padding: '20px' }}
            aria-label={`${stat.label}: ${stat.value}`}
          >
            <div style={cardContentStyles}>
              <div>
                <p style={labelStyles}>
                  {stat.label}
                </p>
                <p style={valueStyles}>
                  {stat.value}
                </p>
              </div>
              <div style={getIconContainerStyles(stat.color)}>
                <IconComponent size={24} color={stat.color} aria-hidden="true" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
});

QuickStats.displayName = 'QuickStats';

export default QuickStats;