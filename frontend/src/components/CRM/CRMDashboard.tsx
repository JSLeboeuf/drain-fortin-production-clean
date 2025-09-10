import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import { statsService, alertService, interventionService, smsService, realtimeService } from '@/services/crmService';
import type { CRMStats, InternalAlert, Intervention, SMSMessage } from '@/types/crm';
import { ClientsView } from './ClientsView';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function CRMDashboard() {
  const [activeView, setActiveView] = useState<'dashboard' | 'clients' | 'sms' | 'interventions' | 'alerts'>('dashboard');
  const [realtimeAlerts, setRealtimeAlerts] = useState<InternalAlert[]>([]);

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['crm-stats'],
    queryFn: () => statsService.getStats(),
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch active alerts
  const { data: alerts = [], refetch: refetchAlerts } = useQuery({
    queryKey: ['active-alerts'],
    queryFn: () => alertService.getActiveAlerts(),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch today's interventions
  const { data: todayInterventions = [] } = useQuery({
    queryKey: ['today-interventions'],
    queryFn: () => interventionService.getTodayInterventions(),
    refetchInterval: 60000
  });

  // Fetch recent SMS
  const { data: recentSMS = [] } = useQuery({
    queryKey: ['recent-sms'],
    queryFn: () => smsService.getSMSMessages({ 
      dateFrom: new Date().toISOString().split('T')[0] 
    }),
    refetchInterval: 30000
  });

  // Setup real-time subscriptions
  useEffect(() => {
    // Subscribe to alerts
    const alertChannel = realtimeService.subscribeToAlerts((payload) => {
      if (payload.eventType === 'INSERT') {
        const newAlert = payload.new as InternalAlert;
        setRealtimeAlerts(prev => [newAlert, ...prev]);
        toast.error(`🚨 Nouvelle alerte ${newAlert.priority}!`, {
          description: newAlert.title,
          duration: 10000
        });
        refetchAlerts();
      }
    });

    // Subscribe to SMS
    const smsChannel = realtimeService.subscribeToSMS((payload) => {
      if (payload.eventType === 'INSERT') {
        toast.success('📱 SMS envoyé', {
          description: 'Un nouveau SMS a été envoyé à l\'équipe'
        });
      }
    });

    // Subscribe to interventions
    const interventionChannel = realtimeService.subscribeToInterventions((payload) => {
      if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
        toast.success('✅ Intervention complétée', {
          description: `Service complété pour ${payload.new.client_name}`
        });
      }
    });

    return () => {
      realtimeService.unsubscribe(alertChannel);
      realtimeService.unsubscribe(smsChannel);
      realtimeService.unsubscribe(interventionChannel);
    };
  }, [refetchAlerts]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await alertService.acknowledgeAlert(alertId, 'current-user');
      toast.success('Alerte confirmée');
      refetchAlerts();
    } catch (error) {
      toast.error('Erreur lors de la confirmation');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await alertService.resolveAlert(alertId, 'current-user');
      toast.success('Alerte résolue');
      refetchAlerts();
    } catch (error) {
      toast.error('Erreur lors de la résolution');
    }
  };

  const formatCurrency = (amount?: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount || 0);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'P1': return 'text-red-600 bg-red-100 border-red-200';
      case 'P2': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'P3': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'P4': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Navigation tabs
  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Activity },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'interventions', label: 'Interventions', icon: Calendar },
    { id: 'sms', label: 'Messages SMS', icon: MessageSquare },
    { id: 'alerts', label: 'Alertes', icon: AlertTriangle, badge: alerts.length }
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">CRM Drain Fortin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('fr-CA', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative",
                  activeView === tab.id 
                    ? "bg-blue-600 text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className={cn(
                    "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold rounded-full",
                    activeView === tab.id ? "bg-red-500 text-white" : "bg-red-600 text-white"
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && (
          <div className="p-6 space-y-6 overflow-y-auto h-full">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Clients actifs"
                value={stats?.activeClients || 0}
                total={stats?.totalClients || 0}
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Interventions aujourd'hui"
                value={stats?.todayInterventions || 0}
                total={stats?.totalInterventions || 0}
                icon={Calendar}
                color="green"
              />
              <StatCard
                title="SMS envoyés"
                value={stats?.todaySMS || 0}
                total={stats?.totalSMS || 0}
                icon={MessageSquare}
                color="purple"
              />
              <StatCard
                title="Revenus du mois"
                value={formatCurrency(stats?.monthRevenue)}
                subtitle={`Total: ${formatCurrency(stats?.totalRevenue)}`}
                icon={DollarSign}
                color="yellow"
              />
            </div>

            {/* Active Alerts */}
            {alerts.length > 0 && (
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Alertes actives ({alerts.length})
                  </h2>
                </div>
                <div className="divide-y max-h-64 overflow-y-auto">
                  {alerts.slice(0, 5).map((alert) => (
                    <AlertItem 
                      key={alert.id} 
                      alert={alert}
                      onAcknowledge={handleAcknowledgeAlert}
                      onResolve={handleResolveAlert}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Today's Interventions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Interventions du jour</h2>
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {todayInterventions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      Aucune intervention prévue aujourd'hui
                    </div>
                  ) : (
                    todayInterventions.map((intervention) => (
                      <InterventionItem key={intervention.id} intervention={intervention} />
                    ))
                  )}
                </div>
              </div>

              {/* Recent SMS */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">SMS récents</h2>
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {recentSMS.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      Aucun SMS envoyé aujourd'hui
                    </div>
                  ) : (
                    recentSMS.slice(0, 5).map((sms) => (
                      <SMSItem key={sms.id} sms={sms} />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Temps de réponse moyen"
                value={`${stats?.averageResponseTime || 15} min`}
                icon={Clock}
                trend="+5%"
                trendUp={false}
              />
              <MetricCard
                title="Satisfaction client"
                value={`${stats?.customerSatisfaction || 4.7}/5`}
                icon={TrendingUp}
                trend="+0.2"
                trendUp={true}
              />
              <MetricCard
                title="Alertes P1/P2"
                value={`${stats?.p1Alerts || 0} / ${stats?.p2Alerts || 0}`}
                icon={AlertTriangle}
                subtitle="Urgentes / Prioritaires"
              />
            </div>
          </div>
        )}

        {activeView === 'clients' && <ClientsView />}
        
        {/* Other views would be implemented similarly */}
        {activeView === 'interventions' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Gestion des interventions</h2>
            {/* InterventionsView component */}
          </div>
        )}
        
        {activeView === 'sms' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Historique SMS</h2>
            {/* SMSView component */}
          </div>
        )}
        
        {activeView === 'alerts' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Centre d'alertes</h2>
            {/* AlertsView component */}
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  total, 
  subtitle, 
  icon: Icon, 
  color 
}: any) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          {total && (
            <p className="text-sm text-gray-500 mt-1">
              sur {total} total
            </p>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-lg",
          colorClasses[color as keyof typeof colorClasses]
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, icon: Icon, trend, trendUp, subtitle }: any) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5 text-gray-400" />
        {trend && (
          <span className={cn(
            "text-sm font-medium",
            trendUp ? "text-green-600" : "text-red-600"
          )}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// Alert Item Component
function AlertItem({ alert, onAcknowledge, onResolve }: any) {
  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full border",
              getPriorityColor(alert.priority)
            )}>
              {alert.priority}
            </span>
            <h3 className="font-medium">{alert.title}</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Client: {alert.client_name} - {alert.client_phone}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Il y a {alert.minutes_since_created} minutes
          </p>
        </div>
        <div className="flex gap-2">
          {alert.status === 'pending' && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Confirmer
            </button>
          )}
          {alert.status === 'acknowledged' && (
            <button
              onClick={() => onResolve(alert.id)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Résoudre
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Intervention Item Component
function InterventionItem({ intervention }: { intervention: Intervention }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    scheduled: 'bg-blue-100 text-blue-600',
    in_progress: 'bg-yellow-100 text-yellow-600',
    completed: 'bg-green-100 text-green-600',
    cancelled: 'bg-red-100 text-red-600'
  };

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{intervention.service_type}</h3>
            <span className={cn(
              "px-2 py-0.5 text-xs rounded-full",
              statusColors[intervention.status || 'pending']
            )}>
              {intervention.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {intervention.client_name} - {intervention.client_phone}
          </p>
          <p className="text-sm text-gray-500">
            {intervention.service_address}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">
            {intervention.scheduled_time}
          </p>
          {intervention.technician_name && (
            <p className="text-xs text-gray-500">
              {intervention.technician_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// SMS Item Component
function SMSItem({ sms }: { sms: SMSMessage }) {
  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 text-xs rounded-full",
              sms.status === 'sent' ? 'bg-green-100 text-green-600' : 
              sms.status === 'failed' ? 'bg-red-100 text-red-600' : 
              'bg-gray-100 text-gray-600'
            )}>
              {sms.status}
            </span>
            {sms.priority && (
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full border",
                getPriorityColor(sms.priority)
              )}>
                {sms.priority}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {sms.message}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            À: {sms.to_number} • {new Date(sms.sent_at || '').toLocaleTimeString('fr-CA')}
          </p>
        </div>
      </div>
    </div>
  );
}

function getPriorityColor(priority?: string): string {
  switch (priority) {
    case 'P1': return 'text-red-600 bg-red-100 border-red-200';
    case 'P2': return 'text-orange-600 bg-orange-100 border-orange-200';
    case 'P3': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'P4': return 'text-green-600 bg-green-100 border-green-200';
    default: return 'text-gray-600 bg-gray-100 border-gray-200';
  }
}