import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export const RealtimeConnection: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [callsCount, setCallsCount] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState(0);

  useEffect(() => {
    // Initialiser la connexion realtime
    const channel = supabase.channel('drain-fortin-realtime');

    // Écouter les changements sur call_logs
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'call_logs'
      }, (payload) => {
        console.log('📞 Nouvel appel:', payload);
        setLastUpdate(new Date());
        setCallsCount(prev => prev + 1);
        
        // Afficher une notification toast
        showToast('Nouvel appel reçu', 'info');
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts'
      }, (payload) => {
        console.log('🚨 Nouvelle alerte:', payload);
        setActiveAlerts(prev => prev + 1);
        
        // Notification pour urgence P1
        if (payload.new?.priority === 'P1') {
          showToast('⚠️ URGENCE P1 DÉTECTÉE!', 'error');
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads'
      }, (payload) => {
        console.log('👤 Nouveau lead:', payload);
        showToast('Nouveau prospect ajouté', 'success');
      })
      .subscribe((status) => {
        console.log('🔄 Statut Realtime:', status);
        
        if (status === 'SUBSCRIBED') {
          setStatus('connected');
          showToast('Connexion temps réel établie', 'success');
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('disconnected');
          showToast('Erreur de connexion', 'error');
        } else {
          setStatus('connecting');
        }
      });

    // Test de connexion périodique
    const pingInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('constraints')
          .select('count(*)', { count: 'exact', head: true });
        
        if (!error) {
          setStatus('connected');
        } else {
          setStatus('disconnected');
        }
      } catch (err) {
        setStatus('disconnected');
      }
    }, 30000); // Toutes les 30 secondes

    // Cleanup
    return () => {
      clearInterval(pingInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Fonction pour afficher les notifications toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type} fade-in`;
    toast.innerHTML = `
      <div class="toast-icon">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
      </div>
      <div class="toast-content">
        <strong>${message}</strong>
        <small>${new Date().toLocaleTimeString('fr-CA')}</small>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideInToast 0.3s reverse';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 5000);
  };

  return (
    <>
      {/* Indicateur de connexion */}
      <div className={`realtime-indicator ${status}`}>
        <div className={`realtime-dot ${status}`} />
        <span className="text-sm font-medium">
          {status === 'connected' ? 'Connecté' : 
           status === 'connecting' ? 'Connexion...' : 
           'Déconnecté'}
        </span>
        {lastUpdate && (
          <span className="text-xs text-gray-500 ml-2">
            {lastUpdate.toLocaleTimeString('fr-CA')}
          </span>
        )}
      </div>

      {/* Stats en temps réel (optionnel, pour debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 text-xs">
          <div className="font-semibold mb-2">📊 Temps Réel</div>
          <div>Appels: {callsCount}</div>
          <div>Alertes: {activeAlerts}</div>
          <div>Status: {status}</div>
        </div>
      )}
    </>
  );
};

// Hook pour utiliser la connexion temps réel
export const useRealtimeSubscription = <T extends Record<string, any>>(
  table: string,
  filter?: { column: string; value: any }
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Charger les données initiales
    const loadInitialData = async () => {
      try {
        let query = supabase.from(table).select('*');
        
        if (filter) {
          query = query.eq(filter.column, filter.value);
        }
        
        const { data: initialData, error: fetchError } = await query
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (fetchError) throw fetchError;
        
        setData(initialData || []);
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    loadInitialData();

    // S'abonner aux changements
    const channel = supabase
      .channel(`realtime-${table}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: table,
        filter: filter ? `${filter.column}=eq.${filter.value}` : undefined
      }, (payload) => {
        console.log(`✨ Nouveau dans ${table}:`, payload.new);
        setData(prev => [payload.new as T, ...prev]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: table,
        filter: filter ? `${filter.column}=eq.${filter.value}` : undefined
      }, (payload) => {
        console.log(`📝 Mise à jour dans ${table}:`, payload.new);
        setData(prev => prev.map(item => 
          item.id === payload.new.id ? payload.new as T : item
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: table
      }, (payload) => {
        console.log(`🗑️ Suppression dans ${table}:`, payload.old);
        setData(prev => prev.filter(item => item.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter?.column, filter?.value]);

  return { data, loading, error, refetch: () => window.location.reload() };
};

// Hook pour les métriques en temps réel
export const useRealtimeMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalCalls: 0,
    activeCalls: 0,
    avgDuration: 0,
    urgentAlerts: 0,
    newLeads: 0,
    conversionRate: 0
  });

  useEffect(() => {
    const updateMetrics = async () => {
      try {
        // Récupérer les métriques
        const today = new Date().toISOString().split('T')[0];
        
        const [calls, alerts, leads] = await Promise.all([
          supabase
            .from('call_logs')
            .select('duration', { count: 'exact' })
            .gte('created_at', today),
          supabase
            .from('alerts')
            .select('*', { count: 'exact' })
            .eq('status', 'active')
            .in('priority', ['P1', 'P2']),
          supabase
            .from('leads')
            .select('status', { count: 'exact' })
            .gte('created_at', today)
        ]);

        const totalCalls = calls.count || 0;
        const avgDuration = calls.data?.length 
          ? calls.data.reduce((acc, c) => acc + (c.duration || 0), 0) / calls.data.length 
          : 0;
        const urgentAlerts = alerts.count || 0;
        const newLeads = leads.count || 0;
        const convertedLeads = leads.data?.filter(l => l.status === 'converted').length || 0;
        const conversionRate = newLeads > 0 ? (convertedLeads / newLeads) * 100 : 0;

        setMetrics({
          totalCalls,
          activeCalls: 0, // À implémenter avec VAPI
          avgDuration: Math.round(avgDuration / 60), // En minutes
          urgentAlerts,
          newLeads,
          conversionRate: Math.round(conversionRate)
        });
      } catch (error) {
        console.error('Erreur métriques:', error);
      }
    };

    // Mise à jour initiale
    updateMetrics();

    // Mise à jour toutes les 30 secondes
    const interval = setInterval(updateMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  return metrics;
};