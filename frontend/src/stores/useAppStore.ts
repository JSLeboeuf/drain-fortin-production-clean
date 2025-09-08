/**
 * Store Global Zustand - Drain Fortin CRM
 * Gestion centralisée de l'état application
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ThemeMode } from '@/styles/theme';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
  persistent?: boolean;
}

interface AppSettings {
  compactMode: boolean;
  animationsEnabled: boolean;
  notificationsEnabled: boolean;
  autoSave: boolean;
  language: 'fr' | 'en';
}

interface AppState {
  // Theme & UI
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  helpOverlayOpen: boolean;
  
  // User & Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // App Settings
  settings: AppSettings;
  
  // Loading States
  isLoading: boolean;
  loadingMessage?: string;
  
  // Optimistic Updates Queue
  optimisticUpdates: Map<string, any>;
  
  // Actions
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleHelpOverlay: () => void;
  
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  setLoading: (loading: boolean, message?: string) => void;
  
  addOptimisticUpdate: (key: string, data: any) => void;
  removeOptimisticUpdate: (key: string) => void;
  clearOptimisticUpdates: () => void;
}

// Store par défaut
const defaultSettings: AppSettings = {
  compactMode: false,
  animationsEnabled: true,
  notificationsEnabled: true,
  autoSave: true,
  language: 'fr',
};

// Create Store
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        theme: 'light',
        sidebarCollapsed: false,
        commandPaletteOpen: false,
        helpOverlayOpen: false,
        
        user: null,
        isAuthenticated: false,
        
        notifications: [],
        unreadCount: 0,
        
        settings: defaultSettings,
        
        isLoading: false,
        loadingMessage: undefined,
        
        optimisticUpdates: new Map(),
        
        // Theme & UI Actions
        setTheme: (theme) => {
          set({ theme }, false, 'setTheme');
          // Mettre à jour le document pour CSS custom properties
          document.documentElement.className = theme === 'dark' ? 'dark' : '';
        },
        
        toggleSidebar: () => set(
          (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
          false,
          'toggleSidebar'
        ),
        
        toggleCommandPalette: () => set(
          (state) => ({ commandPaletteOpen: !state.commandPaletteOpen }),
          false,
          'toggleCommandPalette'
        ),
        
        toggleHelpOverlay: () => set(
          (state) => ({ helpOverlayOpen: !state.helpOverlayOpen }),
          false,
          'toggleHelpOverlay'
        ),
        
        // User & Auth Actions
        setUser: (user) => set({ user }, false, 'setUser'),
        
        login: (user) => set({
          user,
          isAuthenticated: true,
        }, false, 'login'),
        
        logout: () => set({
          user: null,
          isAuthenticated: false,
          notifications: [],
          unreadCount: 0,
        }, false, 'logout'),
        
        // Notifications Actions
        addNotification: (notification) => {
          const newNotification: Notification = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            read: false,
            ...notification,
          };
          
          set((state) => ({
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }), false, 'addNotification');
          
          // Auto-remove non-persistent notifications after 5 seconds
          if (!notification.persistent) {
            setTimeout(() => {
              get().removeNotification(newNotification.id);
            }, 5000);
          }
        },
        
        markNotificationRead: (id) => set((state) => {
          const notifications = state.notifications.map(n => 
            n.id === id ? { ...n, read: true } : n
          );
          const unreadCount = notifications.filter(n => !n.read).length;
          
          return { notifications, unreadCount };
        }, false, 'markNotificationRead'),
        
        removeNotification: (id) => set((state) => {
          const notifications = state.notifications.filter(n => n.id !== id);
          const unreadCount = notifications.filter(n => !n.read).length;
          
          return { notifications, unreadCount };
        }, false, 'removeNotification'),
        
        clearAllNotifications: () => set({
          notifications: [],
          unreadCount: 0,
        }, false, 'clearAllNotifications'),
        
        // Settings Actions
        updateSettings: (newSettings) => set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }), false, 'updateSettings'),
        
        // Loading Actions
        setLoading: (isLoading, loadingMessage) => set({
          isLoading,
          loadingMessage,
        }, false, 'setLoading'),
        
        // Optimistic Updates Actions
        addOptimisticUpdate: (key, data) => set((state) => {
          const optimisticUpdates = new Map(state.optimisticUpdates);
          optimisticUpdates.set(key, data);
          return { optimisticUpdates };
        }, false, 'addOptimisticUpdate'),
        
        removeOptimisticUpdate: (key) => set((state) => {
          const optimisticUpdates = new Map(state.optimisticUpdates);
          optimisticUpdates.delete(key);
          return { optimisticUpdates };
        }, false, 'removeOptimisticUpdate'),
        
        clearOptimisticUpdates: () => set({
          optimisticUpdates: new Map(),
        }, false, 'clearOptimisticUpdates'),
      }),
      {
        name: 'drain-fortin-app-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          settings: state.settings,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'DrainFortinAppStore' }
  )
);

// Selectors for performance optimization
export const useTheme = () => useAppStore(state => state.theme);
export const useUser = () => useAppStore(state => state.user);
export const useNotifications = () => useAppStore(state => ({
  notifications: state.notifications,
  unreadCount: state.unreadCount,
}));
export const useSettings = () => useAppStore(state => state.settings);
export const useLoading = () => useAppStore(state => ({
  isLoading: state.isLoading,
  loadingMessage: state.loadingMessage,
}));