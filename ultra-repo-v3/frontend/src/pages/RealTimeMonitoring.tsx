import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Shield,
  Zap,
  Activity
} from "lucide-react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import DataSourceIndicator from "@/components/shared/DataSourceIndicator";

export default function RealTimeMonitoring() {
  const [wsConnected, setWsConnected] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState({
    activeCalls: 0,
    p1Urgencies: 0,
    smsAlertsSent: 0,
    constraintsViolated: 0
  });

  // Connexion WebSocket pour les updates temps réel
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setWsConnected(true);
      if (import.meta.env.DEV) {
        logger.info("WebSocket connecté - Monitoring en temps réel actif");
      }
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'metrics:update') {
        setLiveMetrics(data.metrics);
      }
    };

    socket.onclose = () => setWsConnected(false);

    return () => socket.close();
  }, []);

  // Métriques temps réel
  const { data: dashboardData } = useQuery({
    queryKey: ['/api/analytics/dashboard'],
    refetchInterval: 5000 // Actualisation toutes les 5 secondes
  });

  const { data: smsStats } = useQuery({
    queryKey: ['/api/sms/stats'],
    refetchInterval: 10000
  });

  const { data: activeCalls } = useQuery({
    queryKey: ['/api/vapi/calls/active'],
    refetchInterval: 2000
  });

  const { data: vapiMetrics } = useQuery({
    queryKey: ['/api/vapi/metrics'],
    refetchInterval: 5000
  });

  const { data: elevenLabsStatus } = useQuery({
    queryKey: ['/api/elevenlabs/status'],
    refetchInterval: 10000
  });

  const { data: alertsSLA } = useQuery({
    queryKey: ['/api/alerts/sla'],
    refetchInterval: 3000
  });

  const { data: alertsConstraints } = useQuery({
    queryKey: ['/api/alerts/constraints'],
    refetchInterval: 5000
  });

  // Test système de notifications
  const testSMSConnection = async () => {
    try {
      const response = await fetch('/api/sms/test-connection', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Test de notification envoyé avec succès !');
      } else {
        alert('❌ Erreur lors du test notification');
      }
    } catch (error) {
      alert('❌ Erreur de connexion notification');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Monitoring Paul" 
          subtitle="Surveillance temps réel de votre assistant vocal"
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Empty state */}
            {(!activeCalls?.length && !vapiMetrics) && (
              <Card>
                <CardContent className="py-10 text-center">
                  <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
                  <div className="text-sm text-muted-foreground mb-4">Aucune activité en temps réel pour l'instant.</div>
                  <a href="/dashboard" className="text-primary text-sm hover:underline">Retour au tableau de bord</a>
                </CardContent>
              </Card>
            )}
            
            {/* Statut système Paul */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card data-testid="card-paul-status">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium">
                      Paul {wsConnected ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-call-system-status">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Système d'appels</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {vapiMetrics ? '✅ Actif' : '⏸️ En attente'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-notification-system">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Notifications</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">✅ Actif</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-voice-quality-status">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Qualité vocale</span>
                    </div>
                    <Badge 
                      variant={elevenLabsStatus?.connected ? "secondary" : "outline"} 
                      className="text-xs"
                    >
                      {elevenLabsStatus?.connected ? '✅ Excellente' : '⏸️ Configuration'}
                    </Badge>
                  </div>
                  {elevenLabsStatus?.usage && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Utilisation vocale: {Math.round(elevenLabsStatus.usage.usage_percentage)}%
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Métriques Performance Paul */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card data-testid="card-active-calls">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Appels Actifs</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" aria-live="polite">{activeCalls?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {vapiMetrics?.totalCalls ? `Total aujourd'hui: ${vapiMetrics.totalCalls}` : 'En cours de traitement'}
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-p1-urgencies">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Urgences P1</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600" aria-live="polite">
                    {vapiMetrics?.p1Urgencies || dashboardData?.p1Urgencies || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Détection auto + SMS Guillaume
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-sms-sent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SMS Envoyés</CardTitle>
                  <MessageSquare className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" aria-live="polite">{smsStats?.totalSent || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Alertes automatiques
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-constraints-respected">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contraintes OK</CardTitle>
                  <Shield className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" aria-live="polite">
                    {dashboardData?.constraintsRespected || 0}/{dashboardData?.totalConstraints || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Conformité business
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Alertes SLA en temps réel */}
            {alertsSLA && alertsSLA.length > 0 && (
              <Card data-testid="card-sla-alerts">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Alertes SLA - Action Requise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alertsSLA.slice(0, 5).map((alert: any) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {alert.phoneNumber} • Priorité {alert.priority}
                          </p>
                        </div>
                        <Badge 
                          variant={alert.severity === "critical" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Violations de contraintes */}
            {alertsConstraints && alertsConstraints.length > 0 && (
              <Card data-testid="card-constraint-violations">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Violations Contraintes Business
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alertsConstraints.slice(0, 3).map((violation: any) => (
                      <div key={violation.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{violation.message}</p>
                          <p className="text-xs text-muted-foreground">{violation.action}</p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {violation.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Statistiques détaillées Système */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {smsStats && (
                <Card data-testid="card-notification-breakdown">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Notifications Auto
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">{smsStats.totalSent}</div>
                        <div className="text-xs text-muted-foreground">Total envoyés</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{smsStats.p1Alerts}</div>
                        <div className="text-xs text-muted-foreground">Alertes P1</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">{smsStats.slaViolations}</div>
                        <div className="text-xs text-muted-foreground">Violations SLA</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{smsStats.constraintViolations}</div>
                        <div className="text-xs text-muted-foreground">Contraintes violées</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {elevenLabsStatus && (
                <Card data-testid="card-voice-breakdown">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Qualité Vocale Paul
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Voix:</span>
                        <Badge variant="outline">{elevenLabsStatus.voice?.name || 'Paul'}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Usage:</span>
                        <Badge 
                          variant={elevenLabsStatus.usage?.usage_percentage < 80 ? 'secondary' : 'destructive'}
                        >
                          {Math.round(elevenLabsStatus.usage?.usage_percentage || 0)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Stabilité:</span>
                        <Badge variant="secondary">
                          {elevenLabsStatus.voice?.settings?.stability * 100 || 75}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Optimisation:</span>
                        <Badge 
                          variant={elevenLabsStatus.cost_optimization === 'good' ? 'secondary' : 'destructive'}
                        >
                          {elevenLabsStatus.cost_optimization === 'good' ? '✅ Bon' : '⚠️ Attention'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Statut intégration production */}
            <Card data-testid="card-production-status">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-500" />
                  Statut Système Paul
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">✅</div>
                    <div className="text-xs">Appels</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">✅</div>
                    <div className="text-xs">Notifications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">✅</div>
                    <div className="text-xs">Voix</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">✅</div>
                    <div className="text-xs">Webhooks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">✅</div>
                    <div className="text-xs">Configuration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{vapiMetrics?.emergenciesDetected || 0}</div>
                    <div className="text-xs">Urgences P1</div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex gap-2">
                  <Button 
                    onClick={testSMSConnection}
                    size="sm" 
                    variant="outline"
                    data-testid="button-test-sms"
                  >
                    🧪 Test Notification
                  </Button>
                  {vapiMetrics && (
                    <Badge variant="secondary" className="text-xs">
                      Appels traités: {vapiMetrics?.totalCalls || 0}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}
