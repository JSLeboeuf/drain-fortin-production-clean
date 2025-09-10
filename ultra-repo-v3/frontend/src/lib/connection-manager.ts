import { createClient } from '@supabase/supabase-js';

// Configuration avec retry automatique
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQ5ODEsImV4cCI6MjA2Mjc2MDk4MX0.-oqrPSdoc0XHBH496ffAgLhEcvzb5f552SDPWxrNAsg';

class ConnectionManager {
  private supabase: any;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private healthCheckInterval: any;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeConnection();
    this.startHealthCheck();
  }

  private initializeConnection() {
    try {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });

      this.setupRealtimeHandlers();
      this.reconnectAttempts = 0;
      this.emit('connected');
      console.log('✅ Connexion établie avec succès');
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      this.handleReconnection();
    }
  }

  private setupRealtimeHandlers() {
    // Gestion des événements de connexion
    this.supabase.channel('system')
      .on('system', { event: '*' }, (payload: any) => {
        if (payload.event === 'disconnect') {
          this.handleDisconnection();
        }
      })
      .subscribe();
  }

  private handleDisconnection() {
    console.warn('⚠️ Déconnexion détectée');
    this.emit('disconnected');
    this.handleReconnection();
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Impossible de se reconnecter après', this.maxReconnectAttempts, 'tentatives');
      this.emit('error', { type: 'MAX_RECONNECT_REACHED' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms`);
    
    setTimeout(() => {
      this.initializeConnection();
    }, delay);
  }

  private startHealthCheck() {
    // Vérification de santé toutes les 30 secondes
    this.healthCheckInterval = setInterval(async () => {
      try {
        const { data, error } = await this.supabase
          .from('health_check')
          .select('status')
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        this.emit('healthy');
      } catch (error) {
        console.warn('⚠️ Health check échoué:', error);
        this.handleDisconnection();
      }
    }, 30000);
  }

  // Méthodes publiques sécurisées
  async fetchWithRetry(query: Function, maxRetries = 3): Promise<any> {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await query();
        if (result.error) throw result.error;
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Tentative ${i + 1}/${maxRetries} échouée:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    throw lastError;
  }

  async subscribeToTable(
    table: string,
    callback: Function,
    filter?: any
  ) {
    try {
      const channel = this.supabase
        .channel(`${table}-changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter
          },
          (payload: any) => {
            try {
              callback(payload);
            } catch (error) {
              console.error('Erreur dans le callback:', error);
              this.emit('error', { type: 'CALLBACK_ERROR', error });
            }
          }
        )
        .subscribe();

      return () => {
        this.supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Erreur de souscription:', error);
      throw error;
    }
  }

  // Gestion des événements
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erreur dans le listener ${event}:`, error);
        }
      });
    }
  }

  // Nettoyage
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.listeners.clear();
    if (this.supabase) {
      this.supabase.removeAllChannels();
    }
  }

  // Accès au client Supabase
  getClient() {
    if (!this.supabase) {
      throw new Error('Client Supabase non initialisé');
    }
    return this.supabase;
  }
}

// Instance singleton
export const connectionManager = new ConnectionManager();

// Hook React pour utiliser le manager
export function useConnection() {
  return {
    client: connectionManager.getClient(),
    subscribe: connectionManager.subscribeToTable.bind(connectionManager),
    fetchWithRetry: connectionManager.fetchWithRetry.bind(connectionManager),
    on: connectionManager.on.bind(connectionManager),
    off: connectionManager.off.bind(connectionManager)
  };
}