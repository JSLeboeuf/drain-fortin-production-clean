/**
 * Modern Layout - Layout principal avec sidebar moderne
 * Design responsive avec animations et thème unifié
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Phone, 
  BarChart3, 
  Settings, 
  Users,
  FileText,
  DollarSign,
  Wrench,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  User,
  Menu,
  X
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useThemeMode } from '@/providers/ThemeProvider';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useMediaQuery } from '@/hooks/useAdvancedHooks';
import { cn } from '@/lib/utils';

interface ModernLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string | number;
  active?: boolean;
  children?: NavigationItem[];
}

export function ModernLayout({ children }: ModernLayoutProps) {
  const [location, setLocation] = useLocation();
  const { 
    sidebarCollapsed, 
    toggleSidebar, 
    user, 
    unreadCount,
    toggleCommandPalette 
  } = useAppStore();
  
  const { isDark } = useThemeMode();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Navigation items
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: Home,
      href: '/dashboard',
    },
    {
      id: 'calls',
      label: 'Appels',
      icon: Phone,
      href: '/calls',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: '/analytics',
    },
    {
      id: 'crm',
      label: 'CRM',
      icon: Users,
      href: '/crm',
    },
    {
      id: 'pricing',
      label: 'Tarification',
      icon: DollarSign,
      href: '/pricing',
    },
    {
      id: 'templates',
      label: 'Modèles',
      icon: FileText,
      href: '/templates',
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: Monitor,
      href: '/monitoring',
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
      href: '/settings',
      children: [
        {
          id: 'settings-prompts',
          label: 'Prompts',
          icon: FileText,
          href: '/settings/prompts',
        },
        {
          id: 'settings-pricing',
          label: 'Tarifs',
          icon: DollarSign,
          href: '/settings/pricing',
        },
        {
          id: 'settings-constraints',
          label: 'Contraintes',
          icon: Wrench,
          href: '/settings/constraints',
        },
      ],
    },
  ];

  // Check if current route is active
  const isActiveRoute = (href: string) => {
    if (href === '/dashboard' && location === '/') return true;
    return location === href || location.startsWith(href + '/');
  };

  // Mark active items
  const itemsWithActive = navigationItems.map(item => ({
    ...item,
    active: isActiveRoute(item.href),
    children: item.children?.map(child => ({
      ...child,
      active: isActiveRoute(child.href),
    })),
  }));

  // Sidebar animation variants
  const sidebarVariants = {
    expanded: { 
      width: 280,
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    collapsed: { 
      width: 80,
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    mobile: {
      x: 0,
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    mobileHidden: {
      x: -280,
      transition: { duration: 0.3, ease: 'easeInOut' }
    }
  };

  const contentVariants = {
    expanded: { 
      marginLeft: isMobile ? 0 : 280,
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    collapsed: { 
      marginLeft: isMobile ? 0 : 80,
      transition: { duration: 0.3, ease: 'easeInOut' }
    }
  };

  const NavigationItem = ({ item, level = 0 }: { item: NavigationItem; level?: number }) => {
    const IconComponent = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const [expanded, setExpanded] = React.useState(item.active || false);
    
    return (
      <div>
        <motion.button
          onClick={() => {
            if (hasChildren) {
              setExpanded(!expanded);
            } else {
              setLocation(item.href);
              if (isMobile) setMobileMenuOpen(false);
            }
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
            "hover:bg-accent/50 hover:text-accent-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            item.active && "bg-primary/10 text-primary border-r-2 border-primary",
            level > 0 && "ml-6 pl-2"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-center w-5 h-5">
            <IconComponent size={18} />
          </div>
          
          <AnimatePresence mode="wait">
            {(!sidebarCollapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between flex-1 min-w-0"
              >
                <span className="font-medium text-sm truncate">
                  {item.label}
                </span>
                
                <div className="flex items-center gap-1">
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {item.badge}
                    </Badge>
                  )}
                  
                  {hasChildren && (
                    <motion.div
                      animate={{ rotate: expanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight size={14} />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        
        {/* Submenu */}
        <AnimatePresence>
          {hasChildren && expanded && (!sidebarCollapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="py-1 space-y-1">
                {item.children!.map(child => (
                  <NavigationItem key={child.id} item={child} level={level + 1} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        variants={sidebarVariants}
        animate={
          isMobile 
            ? (mobileMenuOpen ? 'mobile' : 'mobileHidden')
            : (sidebarCollapsed ? 'collapsed' : 'expanded')
        }
        className={cn(
          "fixed left-0 top-0 h-full bg-card border-r border-border z-50",
          "flex flex-col shadow-xl",
          isMobile && "w-[280px]"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">DF</span>
            </div>
            
            <AnimatePresence mode="wait">
              {(!sidebarCollapsed || isMobile) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h1 className="font-bold text-lg text-foreground">
                    Drain Fortin
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    CRM & Suivi des appels
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile close button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
                className="ml-auto"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {itemsWithActive.map(item => (
            <NavigationItem key={item.id} item={item} />
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          {/* User info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <AnimatePresence mode="wait">
              {(!sidebarCollapsed || isMobile) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0"
                >
                  <p className="font-medium text-sm truncate">
                    {user?.name || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || 'user@domain.com'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Collapse button */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="w-full justify-center"
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
          )}
        </div>
      </motion.aside>

      {/* Main content */}
      <motion.main
        variants={contentVariants}
        animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
        className="min-h-screen"
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu size={20} />
                </Button>
              )}
              
              {/* Search */}
              <Button
                variant="outline"
                onClick={toggleCommandPalette}
                className="w-72 justify-start text-muted-foreground"
              >
                <Search size={16} className="mr-2" />
                Rechercher...
                <kbd className="ml-auto font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  ⌘K
                </kbd>
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                    variant="destructive"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>

              {/* Theme toggle */}
              <ThemeToggle />

              {/* Profile */}
              <Button variant="ghost" size="sm">
                <User size={18} />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {children}
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}