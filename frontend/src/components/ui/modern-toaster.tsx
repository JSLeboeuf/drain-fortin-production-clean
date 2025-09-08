/**
 * Modern Toaster - Système de notifications avancé
 * Avec animations Framer Motion et gestion d'état avancée
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Bell
} from 'lucide-react';
import { useAppStore, useNotifications } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastColors = {
  success: {
    bg: 'bg-green-50 dark:bg-green-950/50',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-300',
    icon: 'text-green-600 dark:text-green-400',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/50',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-300',
    icon: 'text-blue-600 dark:text-blue-400',
  },
};

export function ModernToaster() {
  const { notifications } = useNotifications();
  const { removeNotification, markNotificationRead } = useAppStore();

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      }
    },
    exit: { opacity: 0 },
  };

  const toastVariants = {
    initial: { 
      opacity: 0, 
      y: 20, 
      scale: 0.9,
      x: 400,
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      }
    },
    exit: { 
      opacity: 0, 
      x: 400,
      scale: 0.9,
      transition: {
        duration: 0.2,
        ease: "easeInOut",
      }
    },
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence mode="popLayout">
        {notifications.slice(0, 5).map((notification) => {
          const IconComponent = toastIcons[notification.type];
          const colors = toastColors[notification.type];
          
          return (
            <motion.div
              key={notification.id}
              variants={toastVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              className={cn(
                "relative p-4 rounded-xl shadow-lg border backdrop-blur-sm",
                "hover:shadow-xl transition-shadow duration-300",
                colors.bg,
                colors.border
              )}
            >
              {/* Gradient border effect */}
              <motion.div
                className="absolute inset-0 rounded-xl opacity-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20"
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              <div className="relative flex items-start gap-3">
                {/* Icon avec animation */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    delay: 0.2, 
                    type: "spring",
                    stiffness: 200,
                    damping: 15 
                  }}
                  className={cn("flex-shrink-0 mt-0.5", colors.icon)}
                >
                  <IconComponent size={20} />
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <motion.h4
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={cn("font-semibold text-sm leading-5", colors.text)}
                  >
                    {notification.title}
                  </motion.h4>
                  
                  {notification.message && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className={cn("mt-1 text-sm opacity-90", colors.text)}
                    >
                      {notification.message}
                    </motion.p>
                  )}

                  {/* Timestamp */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 mt-2"
                  >
                    <span className={cn("text-xs opacity-70", colors.text)}>
                      {new Date(notification.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    
                    {notification.persistent && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs px-1.5 py-0.5"
                      >
                        Persistant
                      </Badge>
                    )}
                  </motion.div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  {!notification.read && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markNotificationRead(notification.id)}
                        className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        <Bell size={12} />
                      </Button>
                    </motion.div>
                  )}
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNotification(notification.id)}
                      className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10"
                    >
                      <X size={12} />
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Progress bar pour les notifications temporaires */}
              {!notification.persistent && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent rounded-b-xl origin-left"
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ 
                    duration: 5,
                    ease: "linear",
                    delay: 0.5 
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Compteur si plus de 5 notifications */}
      {notifications.length > 5 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-2"
        >
          <Badge variant="secondary" className="text-xs">
            +{notifications.length - 5} autres notifications
          </Badge>
        </motion.div>
      )}
    </div>
  );
}

// Hook pour utiliser les notifications avec animations
export function useModernNotification() {
  const addNotification = useAppStore(state => state.addNotification);

  const notify = {
    success: (title: string, message?: string) => {
      addNotification({ 
        type: 'success', 
        title, 
        message 
      });
    },
    
    error: (title: string, message?: string) => {
      addNotification({ 
        type: 'error', 
        title, 
        message, 
        persistent: true 
      });
    },
    
    warning: (title: string, message?: string) => {
      addNotification({ 
        type: 'warning', 
        title, 
        message 
      });
    },
    
    info: (title: string, message?: string) => {
      addNotification({ 
        type: 'info', 
        title, 
        message 
      });
    },
    
    // Notification personnalisée
    custom: (options: Parameters<typeof addNotification>[0]) => {
      addNotification(options);
    },
  };

  return notify;
}