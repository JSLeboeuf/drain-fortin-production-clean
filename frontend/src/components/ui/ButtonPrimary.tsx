/**
 * Primary Button Component
 * Reusable button with proper TypeScript typing and accessibility
 */

import React, { memo } from 'react';

import { DRAIN_FORTIN_COLORS } from '@/config/theme';
import type { ButtonProps } from '@/types';

const ButtonPrimary = memo<ButtonProps>(({ 
  children, 
  onClick, 
  disabled = false, 
  icon: Icon, 
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props 
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'secondary':
        return {
          background: DRAIN_FORTIN_COLORS.white,
          color: DRAIN_FORTIN_COLORS.blueDark,
          border: `1px solid ${DRAIN_FORTIN_COLORS.blueDark}`,
        };
      case 'danger':
        return {
          background: DRAIN_FORTIN_COLORS.danger,
          color: DRAIN_FORTIN_COLORS.white,
          border: 'none',
        };
      default: // primary
        return {
          background: DRAIN_FORTIN_COLORS.orange,
          color: DRAIN_FORTIN_COLORS.white,
          border: 'none',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '8px 12px',
          fontSize: '12px',
          borderRadius: '3px',
        };
      case 'lg':
        return {
          padding: '16px 24px',
          fontSize: '16px',
          borderRadius: '6px',
        };
      default: // md
        return {
          padding: '12px 20px',
          fontSize: '14px',
          borderRadius: '4px',
        };
    }
  };

  const baseStyles: React.CSSProperties = {
    ...getVariantStyles(),
    ...getSizeStyles(),
    fontWeight: '600',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: disabled || loading ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
    outline: 'none',
  };

  const hoverStyles: React.CSSProperties = {
    transform: disabled || loading ? 'none' : 'translateY(-1px)',
    boxShadow: disabled || loading ? 'none' : '0 4px 8px rgba(0,0,0,0.15)',
    background: variant === 'primary' && !disabled && !loading 
      ? DRAIN_FORTIN_COLORS.hoverOrange 
      : baseStyles.background,
  };

  return (
    <button
      style={baseStyles}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      className={`button-primary ${className}`}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, baseStyles);
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = `2px solid ${DRAIN_FORTIN_COLORS.orange}`;
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
      aria-disabled={disabled}
      type="button"
      {...props}
    >
      {loading && (
        <div 
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: `2px solid ${variant === 'primary' ? DRAIN_FORTIN_COLORS.white : DRAIN_FORTIN_COLORS.orange}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}
      {Icon && !loading && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
      {children}
    </button>
  );
});

ButtonPrimary.displayName = 'ButtonPrimary';

export default ButtonPrimary;