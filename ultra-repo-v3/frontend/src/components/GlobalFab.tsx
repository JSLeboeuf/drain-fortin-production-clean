import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, ClipboardList, DollarSign, Wrench, MessageSquare, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

interface FabAction {
  href: string;
  icon: React.ElementType;
  label: string;
  color?: string;
  description?: string;
}

export default function GlobalFab() {
  const [open, setOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [sparkle, setSparkle] = useState(false);
  const [, navigate] = useLocation();
  const [focusIndex, setFocusIndex] = useState(0);
  const lastFocused = useRef<HTMLElement | null>(null);

  const actions: FabAction[] = [
    { 
      href: '/intake', 
      icon: ClipboardList, 
      label: 'Nouvelle demande',
      color: 'bg-blue-500',
      description: 'Créer une nouvelle demande client'
    },
    { 
      href: '/pricing', 
      icon: DollarSign, 
      label: 'Calculateur de prix',
      color: 'bg-green-500',
      description: 'Calculer un prix rapidement'
    },
    { 
      href: '/templates', 
      icon: MessageSquare, 
      label: 'Modèles rapides',
      color: 'bg-purple-500',
      description: 'SMS et emails pré-configurés'
    },
    { 
      href: '/services', 
      icon: Wrench, 
      label: 'Services Drain Fortin',
      color: 'bg-orange-500',
      description: 'Gérer les services'
    },
  ];

  // Sparkle effect periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (!open) {
        setSparkle(true);
        setTimeout(() => setSparkle(false), 1000);
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Manage focus: store trigger, focus first item when opening, restore on close
  useEffect(() => {
    if (open) {
      const container = document.querySelector<HTMLElement>('div[role="menu"]')?.parentElement;
      const first = container?.querySelector<HTMLElement>('button[role="menuitem"]');
      first?.focus();
    } else {
      lastFocused.current?.focus?.();
    }
  }, [open]);

  const handleAction = useCallback((href: string) => {
    navigate(href);
    setOpen(false);
  }, [navigate]);

  return (
    <>
      {/* Backdrop when open */}
      {open && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        />
      )}

      {/* FAB Container */}
      <div
        className="fixed right-6 z-40"
        style={{ bottom: 'calc(1.5rem + var(--banner-offset, 0px) + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Action Menu */}
        {open && (
          <div
            className="absolute bottom-16 right-0 min-w-[250px] animate-in slide-in-from-bottom-2 fade-in duration-200"
            role="menu"
            aria-label="Actions rapides"
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setOpen(false); return; }
              if (e.key === 'Tab') {
                const container = e.currentTarget as HTMLElement;
                const items = container.querySelectorAll<HTMLElement>('button[role="menuitem"]');
                if (items.length) {
                  e.preventDefault();
                  const next = (focusIndex + (e.shiftKey ? -1 : 1) + items.length) % items.length;
                  setFocusIndex(next);
                  items[next].focus();
                }
              }
            }}
          >
            <div className="bg-white/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-sm font-medium">Actions rapides</span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 rounded hover:bg-accent transition-colors"
                    aria-label="Fermer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  const isHovered = hoveredIndex === index;
                  
                  return (
                    <button
                      key={action.href}
                      onClick={() => handleAction(action.href)}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      role="menuitem"
                      tabIndex={index === 0 ? 0 : -1}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
                        "transition-all duration-200 group",
                        "hover:bg-accent hover:scale-[1.02]",
                        "animate-in slide-in-from-left fill-mode-both",
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={cn(
                        "p-2 rounded-lg transition-all duration-200",
                        isHovered ? action.color : "bg-muted",
                        isHovered && "text-white scale-110"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{action.label}</div>
                        {action.description && isHovered && (
                          <div className="text-xs text-muted-foreground animate-in fade-in duration-200">
                            {action.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* FAB Button */}
        <button
          onClick={(e) => { lastFocused.current = e.currentTarget as unknown as HTMLElement; setOpen(!open); }}
          aria-label={open ? "Fermer le menu" : "Ouvrir les actions rapides"}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            "relative group",
            "w-14 h-14 rounded-full",
            "bg-gradient-to-br from-primary to-primary/80",
            "text-white shadow-lg",
            "flex items-center justify-center",
            "transition-all duration-300",
            "hover:shadow-xl hover:scale-110",
            open && "rotate-45 bg-gradient-to-br from-red-500 to-red-600",
            sparkle && "animate-bounce"
          )}
        >
          {/* Sparkle effect */}
          {sparkle && !open && (
            <>
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping animation-delay-200" />
            </>
          )}
          
          {/* Icon */}
          <Plus className={cn(
            "w-6 h-6 transition-all duration-300",
            open && "rotate-45"
          )} />

          {/* Hover effect */}
          <span className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300" />
        </button>

        {/* Tooltip when closed */}
        {!open && (
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Actions rapides
            </div>
          </div>
        )}
      </div>
    </>
  );
}
