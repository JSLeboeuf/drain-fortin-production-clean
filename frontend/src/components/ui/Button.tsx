/**
 * Primary Button Component
 * Brand-consistent button with Drain Fortin styling
 */

import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { DRAIN_FORTIN_COLORS } from '../../constants/colors';

export interface ButtonPrimaryProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  style?: React.CSSProperties;
  className?: string;
}

export const ButtonPrimary = memo<ButtonPrimaryProps>(({ 
  children, 
  onClick, 
  disabled = false, 
  icon: Icon, 
  style,
  className = '',
  ...props 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`button-primary ${className}`}
    style={{
      background: disabled 
        ? DRAIN_FORTIN_COLORS.gray 
        : DRAIN_FORTIN_COLORS.orange,
      color: DRAIN_FORTIN_COLORS.white,
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
      ...style
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.background = DRAIN_FORTIN_COLORS.hoverOrange;
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        e.currentTarget.style.background = DRAIN_FORTIN_COLORS.orange;
      }
    }}
    {...props}
  >
    {Icon && <Icon size={16} />}
    {children}
  </button>
));

ButtonPrimary.displayName = 'ButtonPrimary';