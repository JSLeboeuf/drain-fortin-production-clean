/**
 * ThemeProvider - Context API pour gestion du thème
 * Support du Dark Mode avec transitions smooth
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useAppStore, useTheme } from '@/stores/useAppStore';
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
  const theme = useTheme();
  const { setTheme } = useAppStore();

  // Detect system theme preference
  const getSystemTheme = (): ThemeMode => {
    if (typeof window === 'undefined') return defaultTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Initialize theme
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    let finalTheme = theme;
    
    // If no theme is set and system detection is enabled
    if (!theme && enableSystem) {
      finalTheme = getSystemTheme();
      setTheme(finalTheme);
    }
    
    // Apply theme class to document
    root.classList.add(finalTheme);
    
    // Set CSS custom properties for smooth transitions
    root.style.setProperty('color-scheme', finalTheme);
    
    // Add transition class for smooth theme switching
    root.classList.add('theme-transition');
    
    // Remove transition class after animation completes
    setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
    
  }, [theme, setTheme, enableSystem]);

  // Listen to system theme changes
  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system' || !theme) {
        const systemTheme = e.matches ? 'dark' : 'light';
        setTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, setTheme, enableSystem]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
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