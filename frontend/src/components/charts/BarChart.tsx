/**
 * Bar Chart Component
 * Simple chart visualization for call data
 */

import React, { memo } from 'react';

import { DRAIN_FORTIN_COLORS } from '@/config/theme';
import Card from '../ui/Card';

const BarChart = memo(() => {
  // Demo data
  const data = [
    { heure: '08h', appels: 4 },
    { heure: '09h', appels: 12 },
    { heure: '10h', appels: 18 },
    { heure: '11h', appels: 15 },
    { heure: '12h', appels: 8 },
    { heure: '13h', appels: 22 },
    { heure: '14h', appels: 25 },
    { heure: '15h', appels: 19 },
  ];

  const maxValue = Math.max(...data.map(d => d.appels));

  const chartStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'end',
    gap: '8px',
    height: '200px',
    padding: '20px 0',
  };

  const barContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flex: 1,
    gap: '8px',
  };

  const getBarStyles = (value: number): React.CSSProperties => {
    const height = (value / maxValue) * 100;
    return {
      width: '100%',
      height: `${height}%`,
      background: `linear-gradient(135deg, ${DRAIN_FORTIN_COLORS.orange}, ${DRAIN_FORTIN_COLORS.hoverOrange})`,
      borderRadius: '4px 4px 0 0',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      minHeight: '4px',
    };
  };

  const labelStyles: React.CSSProperties = {
    fontSize: '12px',
    color: DRAIN_FORTIN_COLORS.gray,
    fontWeight: '600',
  };

  const valueStyles: React.CSSProperties = {
    fontSize: '12px',
    color: DRAIN_FORTIN_COLORS.blueDark,
    fontWeight: '600',
    minHeight: '16px',
  };

  return (
    <Card title="Appels par heure" style={{ marginBottom: '20px' }}>
      <div style={chartStyles}>
        {data.map((item, index) => (
          <div 
            key={index} 
            style={barContainerStyles}
            title={`${item.heure}: ${item.appels} appels`}
          >
            <div style={valueStyles}>
              {item.appels}
            </div>
            <div 
              style={getBarStyles(item.appels)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = `0 4px 8px ${DRAIN_FORTIN_COLORS.orange}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <div style={labelStyles}>
              {item.heure}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

BarChart.displayName = 'BarChart';

export default BarChart;