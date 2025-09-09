import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, Search, Home, Settings, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Shortcut {
  key: string;
  label: string;
  action: () => void;
  description: string;
  category: 'navigation' | 'action' | 'search' | 'help';
}

const defaultShortcuts: Shortcut[] = [
  {
    key: '/',
    label: 'Recherche',
    action: () => document.getElementById('search')?.focus(),
    description: 'Ouvrir la recherche',
    category: 'search',
  },
  {
    key: 'g h',
    label: 'Accueil',
    action: () => window.location.href = '/',
    description: 'Aller à l\'accueil',
    category: 'navigation',
  },
  {
    key: 'g i',
    label: 'Interventions',
    action: () => window.location.href = '/interventions',
    description: 'Voir les interventions',
    category: 'navigation',
  },
  {
    key: 'g s',
    label: 'Paramètres',
    action: () => window.location.href = '/settings',
    description: 'Ouvrir les paramètres',
    category: 'navigation',
  },
  {
    key: '?',
    label: 'Aide',
    action: () => {}, // Will be handled by the component
    description: 'Afficher l\'aide des raccourcis',
    category: 'help',
  },
  {
    key: 'Escape',
    label: 'Fermer',
    action: () => {}, // Will be handled by the component
    description: 'Fermer les modales/menus',
    category: 'action',
  },
];

export function KeyboardShortcutsProvider({ 
  children,
  shortcuts = defaultShortcuts 
}: { 
  children: React.ReactNode;
  shortcuts?: Shortcut[];
}) {
  const [showHelp, setShowHelp] = React.useState(false);
  const [lastKey, setLastKey] = React.useState('');
  const [combo, setCombo] = React.useState('');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement) {
        return;
      }

      const key = e.key.toLowerCase();
      const modifiers = [];
      if (e.ctrlKey || e.metaKey) modifiers.push('cmd');
      if (e.shiftKey) modifiers.push('shift');
      if (e.altKey) modifiers.push('alt');

      // Build the key combination
      const currentKey = [...modifiers, key].join('+');

      // Handle help modal
      if (key === '?') {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      if (key === 'escape') {
        if (showHelp) {
          setShowHelp(false);
          return;
        }
      }

      // Handle two-key combinations (like 'g h')
      if (lastKey && `${lastKey} ${key}` in shortcuts.map(s => s.key).join('|')) {
        const shortcut = shortcuts.find(s => s.key === `${lastKey} ${key}`);
        if (shortcut) {
          e.preventDefault();
          shortcut.action();
          setLastKey('');
          setCombo('');
          return;
        }
      }

      // Handle single key shortcuts
      const shortcut = shortcuts.find(s => s.key === currentKey || s.key === key);
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }

      // Store last key for combo detection
      if (key === 'g') {
        setLastKey(key);
        setCombo('g...');
        setTimeout(() => {
          setLastKey('');
          setCombo('');
        }, 2000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, lastKey, showHelp]);

  return (
    <>
      {children}
      
      {/* Combo indicator */}
      <AnimatePresence>
        {combo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-4 px-3 py-2 bg-primary text-white rounded-lg shadow-lg z-50"
          >
            <span className="font-mono text-sm">{combo}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <KeyboardShortcutsHelp 
            shortcuts={shortcuts}
            onClose={() => setShowHelp(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function KeyboardShortcutsHelp({ 
  shortcuts, 
  onClose 
}: { 
  shortcuts: Shortcut[];
  onClose: () => void;
}) {
  const categories = {
    navigation: { label: 'Navigation', icon: Home },
    action: { label: 'Actions', icon: Command },
    search: { label: 'Recherche', icon: Search },
    help: { label: 'Aide', icon: HelpCircle },
  };

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-background rounded-xl shadow-2xl z-[101] max-h-[80vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 id="shortcuts-title" className="text-xl font-bold flex items-center gap-2">
            <Command className="h-5 w-5" />
            Raccourcis Clavier
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {Object.entries(categories).map(([key, category]) => {
            const categoryShortcuts = shortcuts.filter(s => s.category === key);
            if (categoryShortcuts.length === 0) return null;

            const Icon = category.icon;

            return (
              <div key={key} className="mb-8 last:mb-0">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {category.label}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className={cn(
                        "px-2 py-1 text-xs font-mono",
                        "bg-muted rounded border border-border",
                        "shadow-sm"
                      )}>
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">
            Appuyez sur <kbd className="px-1 py-0.5 text-xs bg-muted rounded border">?</kbd> à tout moment pour afficher cette aide
          </p>
        </div>
      </motion.div>
    </>
  );
}

// Hook pour ajouter des raccourcis personnalisés
export function useKeyboardShortcut(
  key: string,
  action: () => void,
  options?: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
    ignoreInputs?: boolean;
  }
) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in inputs (unless explicitly allowed)
      if (options?.ignoreInputs !== false) {
        if (e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            e.target instanceof HTMLSelectElement) {
          return;
        }
      }

      const pressedKey = e.key.toLowerCase();
      const targetKey = key.toLowerCase();

      if (pressedKey === targetKey) {
        if (options?.preventDefault !== false) {
          e.preventDefault();
        }
        if (options?.stopPropagation) {
          e.stopPropagation();
        }
        action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, action, options]);
}

// Composant pour afficher un raccourci dans l'UI
export function KeyboardShortcutBadge({ 
  shortcut,
  className 
}: { 
  shortcut: string;
  className?: string;
}) {
  const keys = shortcut.split('+');

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className={cn(
            "px-1.5 py-0.5 text-xs font-mono",
            "bg-muted rounded border border-border",
            "shadow-sm"
          )}>
            {key === 'cmd' ? '⌘' : key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-xs text-muted-foreground">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}