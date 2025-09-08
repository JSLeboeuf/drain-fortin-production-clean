import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, HelpCircle, Keyboard, Zap, Shield, Info, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpSection {
  title: string;
  icon: React.ElementType;
  items: string[];
}

export default function GlobalHelpOverlay() {
  const [open, setOpen] = useState(false);
  const [trapIndex, setTrapIndex] = useState(0);
  const [activeSection, setActiveSection] = useState('shortcuts');
  const [animateIn, setAnimateIn] = useState(false);

  const helpSections: Record<string, HelpSection> = {
    shortcuts: {
      title: 'Raccourcis Clavier',
      icon: Keyboard,
      items: [
        'Ctrl+K : Palette de commandes',
        'G+D : Aller au Dashboard',
        'G+C : Aller aux Appels',
        'G+S : Aller aux Paramètres',
        '/ : Recherche rapide',
        '? : Afficher cette aide',
        'ESC : Fermer les dialogues'
      ]
    },
    features: {
      title: 'Fonctionnalités',
      icon: Zap,
      items: [
        'Mises à jour temps réel via WebSocket',
        'Export CSV et PDF disponibles',
        'Mode sombre dans les paramètres',
        'Notifications en temps réel',
        'Sauvegarde automatique activée'
      ]
    },
    security: {
      title: 'Sécurité',
      icon: Shield,
      items: [
        'Connexion HTTPS sécurisée',
        'Protection XSS avec DOMPurify',
        'Données chiffrées au repos',
        'Session sécurisée HttpOnly',
        'Monitoring des performances'
      ]
    },
    tips: {
      title: 'Conseils',
      icon: Info,
      items: [
        'Utilisez le FAB pour les actions rapides',
        'Le bandeau P1 pour les urgences',
        'Double-cliquez pour éditer',
        'Glissez-déposez pour réorganiser',
        'F1 pour l\'aide contextuelle'
      ]
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' || (e.shiftKey && e.key === '/') || e.key === 'F1') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setAnimateIn(true);
    } else {
      setAnimateIn(false);
    }
  }, [open]);

  const handleSectionClick = useCallback((section: string) => {
    setActiveSection(section);
  }, []);

  if (!open) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center",
        animateIn && "animate-in fade-in duration-200"
      )}
      role="dialog" 
      aria-modal="true"
      onClick={() => setOpen(false)}
    >
      <Card 
        className={cn(
          "w-[90vw] max-w-2xl max-h-[80vh] overflow-hidden",
          animateIn && "animate-in zoom-in-95 duration-200"
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Tab') {
            const focusables = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusables.length) {
              e.preventDefault();
              const next = (trapIndex + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
              setTrapIndex(next);
              focusables[next].focus();
            }
          }
        }}
      >
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Centre d'Aide</CardTitle>
                <p className="text-sm text-muted-foreground">Appuyez sur ? ou F1 pour ouvrir</p>
              </div>
            </div>
            <button 
              onClick={() => setOpen(false)} 
              aria-label="Fermer"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-48 border-r bg-muted/30 p-2">
            {Object.entries(helpSections).map(([key, section]) => {
              const Icon = section.icon;
              const isActive = activeSection === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSectionClick(key)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{section.title}</span>
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <CardContent className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-3">
              {helpSections[activeSection].items.map((item, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all",
                    "animate-in slide-in-from-right duration-200"
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <p className="text-sm">{item}</p>
                </div>
              ))}
            </div>

            {/* Footer tip */}
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Astuce:</strong> Utilisez le bouton flottant en bas à droite pour accéder rapidement aux fonctions principales.
              </p>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
