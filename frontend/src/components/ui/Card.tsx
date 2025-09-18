/**
 * Card Component
 * Reusable card layout with optional title and actions
 */

import React, { memo } from 'react';

import { DRAIN_FORTIN_COLORS, DRAIN_FORTIN_SHADOWS } from '@/config/theme';
import type { CardProps } from '@/types';

const Card = memo<CardProps>(({ 
  children, 
  title, 
  className = '', 
  style = {},
  actions 
}) => {
  const cardStyles: React.CSSProperties = {
    backgroundColor: DRAIN_FORTIN_COLORS.white,
    borderRadius: '8px',
    boxShadow: DRAIN_FORTIN_SHADOWS.sm,
    overflow: 'hidden',
    border: `1px solid ${DRAIN_FORTIN_COLORS.grayLight}`,
    ...style,
  };

  const headerStyles: React.CSSProperties = {
    padding: '16px 20px',
    borderBottom: `1px solid ${DRAIN_FORTIN_COLORS.grayLight}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DRAIN_FORTIN_COLORS.white,
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: DRAIN_FORTIN_COLORS.blueDark,
    margin: 0,
  };

  const contentStyles: React.CSSProperties = {
    padding: '20px',
  };

  return (
    <div 
      className={`card ${className}`} 
      style={cardStyles}
      role="region"
      aria-label={title}
    >
      {title && (
        <div style={headerStyles}>
          <h3 style={titleStyles}>{title}</h3>
          {actions && (
            <div className="card-actions">
              {actions}
            </div>
          )}
        </div>
      )}
      <div style={contentStyles} className="card-content">
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';

export default Card;