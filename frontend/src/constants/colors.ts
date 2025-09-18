/**
 * Drain Fortin Brand Colors
 * Palette de couleurs EXACTE de Drain Fortin
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

export type DrainFortinColor = keyof typeof DRAIN_FORTIN_COLORS;