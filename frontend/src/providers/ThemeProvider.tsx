/**
 * ThemeProvider - Context API pour gestion du thème
 * Support du Dark Mode avec transitions smooth
 */

import React, { createContext, useContext, useEffect } from 'react';
import type { ThemeMode } from '@/styles/theme';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'drain-fortin-theme',
  enableSystem = true,
  ...props
}: ThemeProviderProps) {
  // Use local state instead of store to avoid circular dependencies
  const [localTheme, setLocalTheme] = React.useState<ThemeMode>(() => {
    // Get initial theme from localStorage or system
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark') {
        return stored as ThemeMode;
      }
      if (enableSystem) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    }
    return defaultTheme;
  });

  // Initialize and update theme
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Apply theme class to document
    root.classList.add(localTheme);
    
    // Set CSS custom properties for smooth transitions
    root.style.setProperty('color-scheme', localTheme);
    
    // Save to localStorage
    localStorage.setItem(storageKey, localTheme);
    
    // Add transition class for smooth theme switching
    root.classList.add('theme-transition');
    
    // Remove transition class after animation completes
    const timer = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
    
    return () => clearTimeout(timer);
  }, [localTheme, storageKey]);

  // Listen to system theme changes
  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if explicitly set to follow system
      const systemTheme = e.matches ? 'dark' : 'light';
      setLocalTheme(systemTheme);
    };

    // Only add listener if system detection is enabled
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [enableSystem]);

  const toggleTheme = () => {
    setLocalTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const value: ThemeContextType = {
    theme: localTheme,
    setTheme: setLocalTheme,
    toggleTheme,
    isDark: localTheme === 'dark',
    isLight: localTheme === 'light',
  };

  return (
    <ThemeContext.Provider value={value} {...props}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  
  return context;
};

// Hook pour utiliser le thème avec TypeScript inference
export const useThemeMode = () => {
  const { theme, setTheme, toggleTheme, isDark, isLight } = useThemeContext();
  
  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    isLight,
    // Utility functions
    isCurrentTheme: (themeToCheck: ThemeMode) => theme === themeToCheck,
    getOppositeTheme: () => theme === 'dark' ? 'light' : 'dark',
  };
};