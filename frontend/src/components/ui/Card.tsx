/**
 * Card Component
 * Consistent card layout with Drain Fortin styling
 */

import React, { memo } from 'react';
import { DRAIN_FORTIN_COLORS } from '../../constants/colors';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Card = memo<CardProps>(({ children, title, className = '', style = {} }) => (
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

Card.displayName = 'Card';