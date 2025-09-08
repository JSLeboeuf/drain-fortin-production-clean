/**
 * Command Palette - Interface de commandes rapides (Cmd+K)
 * Recherche globale et navigation rapide moderne
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { 
  Search, 
  Home, 
  Phone, 
  BarChart3, 
  Settings, 
  Users,
  FileText,
  Calendar,
  DollarSign,
  Zap,
  Moon,
  Sun,
  User,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useThemeMode } from '@/providers/ThemeProvider';
import { useKeyboard, useDebounce } from '@/hooks/useAdvancedHooks';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  shortcut?: string[];
  category: 'navigation' | 'actions' | 'settings' | 'theme';
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 150);
  
  const { 
    commandPaletteOpen, 
    toggleCommandPalette,
    addNotification,
    user,
    logout 
  } = useAppStore();
  
  const { theme, toggleTheme, setTheme } = useThemeMode();

  // Définition des commandes disponibles
  const commands: CommandAction[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Tableau de bord',
      subtitle: 'Vue d\'ensemble des métriques',
      icon: Home,
      shortcut: ['⌘', 'D'],
      category: 'navigation',
      action: () => setLocation('/dashboard'),
      keywords: ['accueil', 'home', 'overview'],
    },
    {
      id: 'nav-calls',
      title: 'Appels',
      subtitle: 'Historique et détails des appels',
      icon: Phone,
      category: 'navigation',
      action: () => setLocation('/calls'),
      keywords: ['téléphone', 'conversations'],
    },
    {
      id: 'nav-analytics',
      title: 'Analytics',
      subtitle: 'Rapports et statistiques',
      icon: BarChart3,
      category: 'navigation',
      action: () => setLocation('/analytics'),
      keywords: ['statistiques', 'rapports', 'métriques'],
    },
    {
      id: 'nav-crm',
      title: 'CRM',
      subtitle: 'Gestion des clients',
      icon: Users,
      category: 'navigation',
      action: () => setLocation('/crm'),
      keywords: ['clients', 'contacts', 'leads'],
    },
    {
      id: 'nav-settings',
      title: 'Paramètres',
      subtitle: 'Configuration système',
      icon: Settings,
      category: 'navigation',
      action: () => setLocation('/settings'),
      keywords: ['configuration', 'options'],
    },

    // Actions rapides
    {
      id: 'action-new-call',
      title: 'Nouveau test d\'appel',
      subtitle: 'Lancer un test de connexion',
      icon: Phone,
      shortcut: ['⌘', 'T'],
      category: 'actions',
      action: () => {
        setLocation('/test-connections');
        addNotification({
          type: 'info',
          title: 'Test d\'appel',
          message: 'Redirection vers la page de test',
        });
      },
      keywords: ['test', 'connexion', 'appel'],
    },
    {
      id: 'action-pricing',
      title: 'Outil de tarification',
      subtitle: 'Calculer un devis',
      icon: DollarSign,
      category: 'actions',
      action: () => setLocation('/pricing'),
      keywords: ['devis', 'prix', 'tarif', 'estimation'],
    },
    {
      id: 'action-templates',
      title: 'Modèles',
      subtitle: 'Gérer les templates',
      icon: FileText,
      category: 'actions',
      action: () => setLocation('/templates'),
      keywords: ['modèles', 'templates'],
    },

    // Paramètres de thème
    {
      id: 'theme-toggle',
      title: `Basculer vers le thème ${theme === 'light' ? 'sombre' : 'clair'}`,
      subtitle: 'Changer l\'apparence',
      icon: theme === 'light' ? Moon : Sun,
      shortcut: ['⌘', '⇧', 'T'],
      category: 'theme',
      action: toggleTheme,
      keywords: ['thème', 'apparence', 'dark', 'light'],
    },
    {
      id: 'theme-light',
      title: 'Thème clair',
      icon: Sun,
      category: 'theme',
      action: () => setTheme('light'),
    },
    {
      id: 'theme-dark',
      title: 'Thème sombre',
      icon: Moon,
      category: 'theme',
      action: () => setTheme('dark'),
    },

    // Paramètres utilisateur
    {
      id: 'user-profile',
      title: 'Mon profil',
      subtitle: user?.email || 'Gérer le profil utilisateur',
      icon: User,
      category: 'settings',
      action: () => {
        addNotification({
          type: 'info',
          title: 'Profil utilisateur',
          message: 'Fonctionnalité à venir',
        });
      },
      keywords: ['profil', 'compte', 'utilisateur'],
    },
    {
      id: 'user-logout',
      title: 'Déconnexion',
      subtitle: 'Se déconnecter du système',
      icon: LogOut,
      category: 'settings',
      action: logout,
      keywords: ['déconnexion', 'sortir', 'logout'],
    },
    {
      id: 'help',
      title: 'Aide',
      subtitle: 'Documentation et support',
      icon: HelpCircle,
      shortcut: ['⌘', '?'],
      category: 'settings',
      action: () => {
        addNotification({
          type: 'info',
          title: 'Aide',
          message: 'Documentation disponible prochainement',
        });
      },
      keywords: ['aide', 'help', 'support', 'documentation'],
    },
  ];

  // Filtrage des commandes basé sur la recherche
  const filteredCommands = commands.filter(command => {
    if (!debouncedSearch) return true;
    
    const searchLower = debouncedSearch.toLowerCase();
    const titleMatch = command.title.toLowerCase().includes(searchLower);
    const subtitleMatch = command.subtitle?.toLowerCase().includes(searchLower);
    const keywordMatch = command.keywords?.some(keyword => 
      keyword.toLowerCase().includes(searchLower)
    );
    
    return titleMatch || subtitleMatch || keywordMatch;
  });

  // Groupement des commandes par catégorie
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  // Labels des catégories
  const categoryLabels = {
    navigation: 'Navigation',
    actions: 'Actions rapides',
    settings: 'Paramètres',
    theme: 'Thème',
  };

  // Gestion des raccourcis clavier
  useKeyboard([
    {
      key: 'k',
      metaKey: true,
      callback: (e) => {
        e.preventDefault();
        toggleCommandPalette();
      },
    },
    {
      key: '/',
      callback: (e) => {
        if (e.target instanceof HTMLInputElement) return;
        e.preventDefault();
        toggleCommandPalette();
      },
    },
    {
      key: 'Escape',
      callback: () => {
        if (commandPaletteOpen) {
          toggleCommandPalette();
        }
      },
    },
  ]);

  // Exécuter une commande et fermer la palette
  const executeCommand = useCallback((command: CommandAction) => {
    command.action();
    toggleCommandPalette();
    setSearch('');
  }, [toggleCommandPalette]);

  // Réinitialiser la recherche à l'ouverture
  useEffect(() => {
    if (commandPaletteOpen) {
      setSearch('');
    }
  }, [commandPaletteOpen]);

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={toggleCommandPalette}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <CommandInput
          placeholder="Rechercher une commande..."
          value={search}
          onValueChange={setSearch}
          className="text-base"
        />
        
        <CommandList className="max-h-[400px]">
          <AnimatePresence mode="wait">
            {filteredCommands.length === 0 ? (
              <CommandEmpty>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-2 py-6"
                >
                  <Search className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aucune commande trouvée
                  </p>
                </motion.div>
              </CommandEmpty>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {Object.entries(groupedCommands).map(([category, categoryCommands], groupIndex) => (
                  <div key={category}>
                    <CommandGroup 
                      heading={categoryLabels[category as keyof typeof categoryLabels]}
                    >
                      {categoryCommands.map((command, index) => (
                        <motion.div
                          key={command.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: (groupIndex * 50 + index * 25) / 1000,
                            duration: 0.2,
                          }}
                        >
                          <CommandItem
                            value={command.id}
                            onSelect={() => executeCommand(command)}
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
                              <command.icon size={16} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">
                                {command.title}
                              </div>
                              {command.subtitle && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {command.subtitle}
                                </div>
                              )}
                            </div>
                            
                            {command.shortcut && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs px-2 py-0.5 font-mono"
                              >
                                {command.shortcut.join('')}
                              </Badge>
                            )}
                          </CommandItem>
                        </motion.div>
                      ))}
                    </CommandGroup>
                    
                    {groupIndex < Object.keys(groupedCommands).length - 1 && (
                      <CommandSeparator />
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </CommandList>
        
        {/* Footer avec astuce */}
        <div className="border-t p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded">Tab</kbd> pour naviguer
            </span>
            <span>
              <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded">↵</kbd> pour exécuter
            </span>
            <span>
              <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded">Esc</kbd> pour fermer
            </span>
          </div>
        </div>
      </motion.div>
    </CommandDialog>
  );
}

// Hook pour ouvrir la command palette depuis n'importe où
export function useCommandPalette() {
  const toggleCommandPalette = useAppStore(state => state.toggleCommandPalette);
  
  return {
    openCommandPalette: toggleCommandPalette,
    closeCommandPalette: toggleCommandPalette,
  };
}