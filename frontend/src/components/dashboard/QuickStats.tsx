/**
 * Quick Stats Component
 * Dashboard statistics cards display
 */

import React, { memo } from 'react';
import { PhoneCall, CheckCircle, XCircle, Clock, LucideIcon } from 'lucide-react';
import { DRAIN_FORTIN_COLORS } from '../../constants/colors';
import { Card } from '../ui/Card';

export interface StatsData {
  todayCalls: number;
  successCalls: number;
  failedCalls: number;
  avgDuration: number;
}

export interface QuickStatsProps {
  stats: StatsData;
}

interface StatCard {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export const QuickStats = memo<QuickStatsProps>(({ stats }) => {
  const statCards: StatCard[] = [
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

QuickStats.displayName = 'QuickStats';