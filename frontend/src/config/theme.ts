/**
 * Drain Fortin Theme Configuration
 * Centralized color palette and design tokens
 */

export const DRAIN_FORTIN_COLORS = {
  blueDark: '#263559',      // Bleu-gris foncé (headers, menus)
  orange: '#FF9900',        // Orange brandé (CTAs, accents)
  white: '#FFFFFF',         // Blanc pur (fonds)
  grayLight: '#F4F4F4',     // Gris clair (sections secondaires)
  black: '#000000',         // Noir (textes importants)
  gray: '#666666',          // Gris (textes secondaires)
  success: '#4CAF50',       // Vert succès
  warning: '#FF9900',       // Orange warning (même que brand)
  danger: '#F44336',        // Rouge erreur
  info: '#2196F3',          // Bleu info
  liveGreen: '#00C851',     // Vert live
  hoverOrange: '#E68900',   // Orange hover (plus foncé)
  blueLightBg: '#F0F4FA',   // Bleu très clair pour hover rows
} as const;

export const DRAIN_FORTIN_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
} as const;

export const DRAIN_FORTIN_BREAKPOINTS = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1400px',
} as const;

export const DRAIN_FORTIN_SHADOWS = {
  sm: '0 1px 3px rgba(0,0,0,0.1)',
  md: '0 4px 6px rgba(0,0,0,0.1)',
  lg: '0 4px 12px rgba(0,0,0,0.2)',
  xl: '0 10px 25px rgba(0,0,0,0.2)',
} as const;

export type DrainFortinColors = typeof DRAIN_FORTIN_COLORS;
export type DrainFortinColorKey = keyof DrainFortinColors;