import { Link, useLocation } from "wouter";
import { Wrench, BarChart3, Phone, Settings, FlaskConical, Gauge, Activity, ClipboardList, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useCallback, useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";
import { getCalls, getAnalyticsSummary } from "@/lib/services";

// Light prefetch map for route chunks (Vite lazy routes)
const prefetchMap: Record<string, () => Promise<any>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/calls": () => import("@/pages/Calls"),
  "/analytics": () => import("@/pages/Analytics"),
  "/settings": () => import("@/pages/Settings"),
  "/settings/prompts": () => import("@/pages/SettingsPrompts"),
  "/settings/pricing": () => import("@/pages/SettingsPricing"),
  "/settings/constraints": () => import("@/pages/SettingsConstraints"),
  "/settings/guillaume": () => import("@/pages/settings/GuillaumeSettings"),
  "/services": () => import("@/pages/services/DrainFortinServices"),
  "/intake": () => import("@/pages/ClientIntake"),
  "/pricing": () => import("@/pages/PricingTool"),
  "/templates": () => import("@/pages/Templates"),
  "/monitoring": () => import("@/pages/RealTimeMonitoring"),
  "/test": () => import("@/pages/Test"),
  "/test-connections": () => import("@/pages/TestConnections"),
};

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number | string;
  description?: string;
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Gauge,
    description: "Vue d'ensemble du système et métriques",
  },
  {
    name: "Appels",
    href: "/calls",
    icon: Phone,
    badge: 3,
    description: "Gestion des appels entrants et historique",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Analyses et rapports de performance",
  },
  {
    name: "Monitoring Live",
    href: "/monitoring",
    icon: Activity,
    badge: "LIVE",
    description: "Surveillance en temps réel des appels",
  },
  {
    name: "Services Drain Fortin",
    href: "/services",
    icon: Wrench,
    description: "Configuration des services de plomberie",
  },
  {
    name: "Nouvelle demande",
    href: "/intake",
    icon: ClipboardList,
    description: "Formulaire client (5 champs)",
  },
  {
    name: "Configuration",
    href: "/settings",
    icon: Settings,
    description: "Paramètres système et contraintes",
  },
  {
    name: "Simulateur",
    href: "/test",
    icon: FlaskConical,
    description: "Tests et simulations d'appels",
  },
  {
    name: "Prix (outil)",
    href: "/pricing",
    icon: DollarSign,
    description: "Calculateur de prix conforme",
  },
  {
    name: "Modèles",
    href: "/templates",
    icon: FlaskConical,
    description: "SMS/Email rapides",
  },
];

interface SidebarProps {
  className?: string;
  onNavigate?: (href: string) => void;
}

export default function Sidebar({ className, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  const mainContentRef = useRef<HTMLElement | null>(null);

  const { containerRef } = useKeyboardNavigation({ enableArrowKeys: true, selector: 'a[role="menuitem"]' });

  useEffect(() => {
    mainContentRef.current =
      document.querySelector('[role="main"]') || document.querySelector('main') || document.getElementById('main-content');
  }, []);

  const handleSkipToMain = useCallback((e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (mainContentRef.current) {
        mainContentRef.current.focus();
        mainContentRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  const handleNavigation = useCallback((href: string) => {
    onNavigate?.(href);
  }, [onNavigate]);

  return (
    <>
      <a
        ref={skipLinkRef}
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-drain-blue-600 text-white px-4 py-2 rounded-md shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
        onKeyDown={handleSkipToMain}
        data-testid="skip-to-main"
      >
        Aller au contenu principal
      </a>

      <aside
        ref={containerRef}
        className={cn(
          "w-64 bg-gradient-to-b from-white to-drain-steel-50 border-r border-drain-steel-200 flex flex-col shadow-xl",
          className,
        )}
        role="complementary"
        aria-label="Navigation principale"
        data-testid="main-sidebar"
      >
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 bg-gradient-to-br from-drain-blue-500 to-drain-blue-600 rounded-lg flex items-center justify-center shadow-md"
              role="img"
              aria-label="Logo Paul - Assistant vocal pour Drain Fortin"
            >
              <Wrench className="text-white text-lg" aria-hidden="true" focusable="false" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground" data-testid="text-logo-title" id="sidebar-title">
                Paul
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-logo-subtitle" aria-describedby="sidebar-title">
                Drain Fortin
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2" role="navigation" aria-label="Navigation principale du tableau de bord" data-testid="main-navigation">
          <ul className="space-y-2" role="menu">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;

              return (
                <li key={item.name} role="none">
                  <Link href={item.href}>
                    <a
                      role="menuitem"
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-drain-blue-500 focus-visible:ring-offset-2",
                        isActive
                          ? "bg-gradient-to-r from-drain-blue-500 to-drain-blue-600 text-white shadow-md"
                          : "text-drain-steel-600 hover:bg-drain-blue-50 hover:text-drain-blue-600 focus:bg-drain-blue-50 focus:text-drain-blue-600",
                      )}
                      aria-current={isActive ? "page" : undefined}
                      aria-describedby={`nav-desc-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      data-testid={`link-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => handleNavigation(item.href)}
                      onMouseEnter={() => { 
                        prefetchMap[item.href]?.(); 
                        if (item.href === '/calls') {
                          queryClient.prefetchQuery({ queryKey: ['calls'], queryFn: getCalls, staleTime: 60_000 });
                        } else if (item.href === '/analytics') {
                          queryClient.prefetchQuery({ queryKey: ['/api/analytics','30d'], queryFn: getAnalyticsSummary, staleTime: 60_000 });
                        }
                      }}
                      onFocus={() => { 
                        prefetchMap[item.href]?.(); 
                        if (item.href === '/calls') {
                          queryClient.prefetchQuery({ queryKey: ['calls'], queryFn: getCalls, staleTime: 60_000 });
                        } else if (item.href === '/analytics') {
                          queryClient.prefetchQuery({ queryKey: ['/api/analytics','30d'], queryFn: getAnalyticsSummary, staleTime: 60_000 });
                        }
                      }}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" focusable="false" />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "ml-auto text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0",
                            item.badge === "LIVE"
                              ? "bg-gradient-to-r from-drain-orange-500 to-drain-orange-600 text-white animate-pulse"
                              : "bg-priority-p2 text-white",
                          )}
                          aria-label={item.badge === "LIVE" ? "En direct" : `${item.badge} éléments non lus`}
                          role="status"
                        >
                          {item.badge}
                        </span>
                      )}
                      <span id={`nav-desc-${item.name.toLowerCase().replace(/\s+/g, '-')}`} className="sr-only">
                        {item.description}
                      </span>
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-sidebar-border" role="status" aria-live="polite" data-testid="system-status-section">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-drain-green-500 rounded-full animate-pulse" role="img" aria-label="Indicateur de statut: système opérationnel" />
            <span className="text-muted-foreground" data-testid="text-system-status" id="system-status-text">
              Système opérationnel
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
