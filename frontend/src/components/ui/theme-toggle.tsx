/**
 * ThemeToggle - Bouton moderne pour basculer entre thèmes
 * Avec animations fluides et icônes contextuelles
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeMode } from '@/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'default' | 'icon' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({
  variant = 'icon',
  size = 'md',
  showLabel = false,
  className,
}: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme, isDark, isLight } = useThemeMode();

  // Animation variants pour les icônes
  const iconVariants = {
    initial: { scale: 0, rotate: -180, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    exit: { scale: 0, rotate: 180, opacity: 0 },
  };

  // Animation du bouton
  const buttonVariants = {
    initial: { scale: 1 },
    tap: { scale: 0.95 },
    hover: { scale: 1.05 },
  };

  // Tailles des icônes selon la prop size
  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  const IconComponent = () => (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={theme}
        variants={iconVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex items-center justify-center"
      >
        {isDark ? (
          <Moon size={iconSizes[size]} />
        ) : (
          <Sun size={iconSizes[size]} />
        )}
      </motion.div>
    </AnimatePresence>
  );

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            className={cn("relative", className)}
            aria-label="Changer le thème"
          >
            <motion.div
              variants={buttonVariants}
              whileTap="tap"
              whileHover="hover"
              className="flex items-center gap-2"
            >
              <IconComponent />
              {showLabel && (
                <span className="hidden sm:inline">
                  {isDark ? 'Sombre' : 'Clair'}
                </span>
              )}
            </motion.div>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => setTheme('light')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Sun size={16} />
            <span>Thème Clair</span>
            {isLight && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-2 h-2 bg-primary rounded-full ml-auto"
              />
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => setTheme('dark')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Moon size={16} />
            <span>Thème Sombre</span>
            {isDark && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-2 h-2 bg-primary rounded-full ml-auto"
              />
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <motion.div variants={buttonVariants} whileTap="tap" whileHover="hover">
      <Button
        variant={variant === 'default' ? 'default' : 'ghost'}
        size={size}
        onClick={toggleTheme}
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:ring-2 focus-visible:ring-primary",
          className
        )}
        aria-label={`Basculer vers le thème ${isDark ? 'clair' : 'sombre'}`}
      >
        <div className="flex items-center gap-2">
          <IconComponent />
          {showLabel && (
            <AnimatePresence mode="wait">
              <motion.span
                key={theme}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="hidden sm:inline text-sm font-medium"
              >
                {isDark ? 'Sombre' : 'Clair'}
              </motion.span>
            </AnimatePresence>
          )}
        </div>

        {/* Effet de ripple subtil */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </Button>
    </motion.div>
  );
}

// Composant compact pour la barre d'outils
export function CompactThemeToggle({ className }: { className?: string }) {
  return (
    <ThemeToggle
      variant="icon"
      size="sm"
      className={cn("h-8 w-8 rounded-full", className)}
    />
  );
}

// Composant pour le header avec label
export function HeaderThemeToggle({ className }: { className?: string }) {
  return (
    <ThemeToggle
      variant="default"
      size="sm"
      showLabel
      className={cn("px-3 py-1.5", className)}
    />
  );
}

// Composant dropdown complet pour les paramètres
export function SettingsThemeToggle({ className }: { className?: string }) {
  return (
    <ThemeToggle
      variant="dropdown"
      size="md"
      showLabel
      className={className}
    />
  );
}