import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Phone,
  Clock,
  Users,
  AlertTriangle,
  PhoneCall,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useDashboardData, useRealtimeCalls } from '@/hooks/useSupabase';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import LiveCallCard from '@/components/dashboard/LiveCallCard';
import CallsTable from '@/components/dashboard/CallsTable';

export default function Monitoring() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Real-time call monitoring hooks
  const { 
    calls: recentCalls, 
    metrics, 
    connectionStatus,
    isLoading 
  } = useDashboardData();
  
  const { activeCalls } = useWebSocket();

  useEffect(() => {
    // Enable realtime updates
    const subscription = useRealtimeCalls();
    return () => subscription;
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Trigger refetch of dashboard data
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCallAction = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`);
  };

  const getConnectionStatus = () => {
    if (connectionStatus === 'connected') {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        badge: <Badge className="bg-green-100 text-green-800">En ligne</Badge>,
        text: 'Connexion active'
      };
    } else if (connectionStatus === 'connecting') {
      return {
        icon: <Clock className="h-5 w-5 text-yellow-500" />,
        badge: <Badge className="bg-yellow-100 text-yellow-800">Connexion...</Badge>,
        text: 'Connexion en cours'
      };
    } else {
      return {
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        badge: <Badge className="bg-red-100 text-red-800">Hors ligne</Badge>,
        text: 'Connexion perdue'
      };
    }
  };

  const urgentCalls = activeCalls?.filter(call => call.priority === 'P1') || [];
  const status = getConnectionStatus();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Chargement du monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monitoring en Temps Réel</h1>
            <p className="text-gray-600 mt-2">
              Surveillance des appels actifs et métriques système
            </p>
          </div>
          <Button 
            onClick={refreshData} 
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        {/* Connection Status & Urgent Calls Alert */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Statut Connexion</CardTitle>
                {status.badge}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {status.icon}
                <div>
                  <p className="font-medium">{status.text}</p>
                  <p className="text-sm text-gray-600">
                    Dernière mise à jour: {new Date().toLocaleTimeString('fr-CA')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {urgentCalls.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-lg font-semibold text-red-800">
                    Urgences P1
                  </CardTitle>
                  <Badge className="bg-red-600 text-white">
                    {urgentCalls.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 font-medium">
                  {urgentCalls.length} appel{urgentCalls.length > 1 ? 's' : ''} urgent{urgentCalls.length > 1 ? 's' : ''} nécessitent une attention immédiate
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-sm font-medium">Appels Actifs</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {activeCalls?.length || 0}
              </div>
              <p className="text-sm text-gray-600 mt-1">En cours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-green-600" />
                <CardTitle className="text-sm font-medium">Appels Aujourd'hui</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics?.totalCalls || 0}
              </div>
              <p className="text-sm text-gray-600 mt-1">Total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-sm font-medium">Durée Moyenne</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(metrics?.avgDuration || 0)}s
              </div>
              <p className="text-sm text-gray-600 mt-1">Par appel</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-sm font-medium">Urgences P1</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {urgentCalls.length}
              </div>
              <p className="text-sm text-gray-600 mt-1">Critiques</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Calls Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Appels en Direct ({activeCalls?.length || 0})
              </CardTitle>
              <CardDescription>
                Surveillance temps réel des appels actifs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeCalls && activeCalls.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activeCalls.slice(0, 10).map((call) => (
                    <LiveCallCard
                      key={call.id}
                      call={call}
                      onAction={handleCallAction}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Phone className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">Aucun appel actif</p>
                  <p className="text-sm">Les appels entrants apparaîtront ici en temps réel</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Performance Système
              </CardTitle>
              <CardDescription>
                Statut et métriques du système en temps réel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-800">Système</p>
                  <p className="text-xs text-green-600">Opérationnel</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-blue-800">API</p>
                  <p className="text-xs text-blue-600">Connecté</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-purple-800">WebSocket</p>
                  <p className="text-xs text-purple-600">{status.text}</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-yellow-800">Latence</p>
                  <p className="text-xs text-yellow-600">&lt; 100ms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Calls Table */}
        <CallsTable 
          calls={recentCalls || []} 
          loading={isLoading}
        />
      </div>
    </div>
  );
}