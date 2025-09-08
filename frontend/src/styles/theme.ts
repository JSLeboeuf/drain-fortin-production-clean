/**
 * Design System Theme - Drain Fortin CRM
 * Système de thème unifié avec support Dark Mode
 */

export const theme = {
  // Colors - Palette Drain Fortin Premium
  colors: {
    // Brand Colors
    brand: {
      primary: 'hsl(200 95% 45%)', // Bleu québécois premium
      secondary: 'hsl(25 95% 53%)', // Orange Drain Fortin
      accent: 'hsl(161 94% 30%)', // Vert succès
      muted: 'hsl(210 25% 97%)',
    },
    
    // Semantic Colors
    semantic: {
      success: 'hsl(161 94% 30%)',
      warning: 'hsl(25 95% 53%)', 
      error: 'hsl(0 84.2% 60.2%)',
      info: 'hsl(200 95% 45%)',
    },
    
    // Priority Colors
    priority: {
      p1: 'hsl(0 84.2% 60.2%)', // Critique
      p2: 'hsl(25 95% 53%)', // Haute
      p3: 'hsl(47.9 95.8% 53.1%)', // Normale
      p4: 'hsl(161 94% 30%)', // Basse
    },
    
    // Neutral Colors
    neutral: {
      50: 'hsl(210 20% 98%)',
      100: 'hsl(210 25% 97%)',
      200: 'hsl(214.3 31.8% 91.4%)',
      300: 'hsl(215.4 16.3% 76.9%)',
      400: 'hsl(215.4 16.3% 56.9%)',
      500: 'hsl(215.4 16.3% 46.9%)',
      600: 'hsl(215.4 16.3% 36.9%)',
      700: 'hsl(215.4 16.3% 26.9%)',
      800: 'hsl(222.2 84% 14.9%)',
      900: 'hsl(222.2 84% 4.9%)',
    }
  },
  
  // Typography
  typography: {
    fonts: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      serif: ['Playfair Display', 'Georgia', 'serif'],
      mono: ['JetBrains Mono', 'Menlo', 'monospace'],
    },
    
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem', // 60px
    },
    
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    
    lineHeights: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    }
  },
  
  // Spacing (4px base unit)
  spacing: {
    px: '1px',
    0.5: '0.125rem', // 2px
    1: '0.25rem',    // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem',     // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem',    // 12px
    3.5: '0.875rem', // 14px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    7: '1.75rem',    // 28px
    8: '2rem',       // 32px
    9: '2.25rem',    // 36px
    10: '2.5rem',    // 40px
    11: '2.75rem',   // 44px
    12: '3rem',      // 48px
    14: '3.5rem',    // 56px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
    28: '7rem',      // 112px
    32: '8rem',      // 128px
  },
  
  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    premium: '0 4px 20px hsla(222.2, 84%, 4.9%, 0.08)',
    premiumHover: '0 8px 30px hsla(222.2, 84%, 4.9%, 0.12)',
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',  
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Z-Index
  zIndex: {
    auto: 'auto',
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    modal: '1000',
    popover: '1010',
    overlay: '1020',
    tooltip: '1030',
  },
  
  // Animations & Transitions
  animations: {
    durations: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    
    easings: {
      linear: 'cubic-bezier(0, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    }
  }
} as const;

// Dark theme overrides
export const darkTheme = {
  colors: {
    brand: {
      primary: 'hsl(217 91% 60%)',
      secondary: 'hsl(25 95% 53%)',
      accent: 'hsl(161 94% 40%)',
      muted: 'hsl(0 0% 9.4%)',
    },
    
    neutral: {
      50: 'hsl(0 0% 9.4%)',
      100: 'hsl(228 9.8% 10%)',
      200: 'hsl(210 5.3% 14.9%)',
      300: 'hsl(210 3.4% 26.3%)',
      400: 'hsl(210 3.4% 46.3%)',
      500: 'hsl(210 3.4% 56.3%)',
      600: 'hsl(210 3.4% 66.3%)',
      700: 'hsl(210 3.4% 76.3%)',
      800: 'hsl(0 0% 85.1%)',
      900: 'hsl(200 6.7% 91.2%)',
    }
  }
} as const;

// Theme type
export type Theme = typeof theme;
export type ThemeMode = 'light' | 'dark';