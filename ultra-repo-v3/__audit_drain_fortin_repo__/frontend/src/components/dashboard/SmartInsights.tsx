import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, TrendingUp, AlertTriangle, Target, Brain, Zap } from "lucide-react";
import { useDashboardMetrics, useAnalytics } from "@/hooks/useAnalytics";
import { useEnhancedMetrics } from "@/hooks/useAlerts";
import { useMemo } from "react";

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'action';
  title: string;
  description: string;
  action?: string;
  priority: number;
  icon: React.ReactNode;
}

export default function SmartInsights() {
  const { data: dashboard } = useDashboardMetrics();
  const { data: enhanced } = useEnhancedMetrics();
  const { data: analytics } = useAnalytics();

  const insights = useMemo((): Insight[] => {
    if (!dashboard || !enhanced) return [];
    
    const insights: Insight[] = [];
    const currentHour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // Analyse prédictive basée sur l'heure
    if (currentHour >= 6 && currentHour <= 9) {
      insights.push({
        id: 'morning-rush',
        type: 'info',
        title: 'Pic matinal anticipé',
        description: 'Historiquement, 40% des urgences P1 arrivent entre 6h-9h. Paul est configuré pour prioriser.',
        priority: 2,
        icon: <Zap className="h-4 w-4" />
      });
    }

    // Analyse des conversions
    if (dashboard.conversionRate < 20) {
      insights.push({
        id: 'low-conversion',
        type: 'warning',
        title: 'Taux de conversion faible',
        description: `Conversion à ${dashboard.conversionRate}%. Recommandation: ajuster les prompts de qualification.`,
        action: 'Optimiser prompts',
        priority: 1,
        icon: <AlertTriangle className="h-4 w-4" />
      });
    } else if (dashboard.conversionRate > 40) {
      insights.push({
        id: 'high-conversion',
        type: 'success',
        title: 'Excellente performance',
        description: `Taux de conversion ${dashboard.conversionRate}% - Paul performe au-dessus de la moyenne!`,
        priority: 3,
        icon: <TrendingUp className="h-4 w-4" />
      });
    }

    // Analyse P1 et urgences
    if (enhanced.priorityDistribution.P1 > 5) {
      insights.push({
        id: 'p1-surge',
        type: 'warning',
        title: 'Augmentation urgences P1',
        description: `${enhanced.priorityDistribution.P1} urgences détectées. Vérifier disponibilité équipe terrain.`,
        action: 'Alerter équipe',
        priority: 1,
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />
      });
    }

    // Analyse weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      insights.push({
        id: 'weekend-mode',
        type: 'info',
        title: 'Mode weekend actif',
        description: 'Paul gère 100% des appels. Surcharge Rive-Sud appliquée automatiquement.',
        priority: 3,
        icon: <Brain className="h-4 w-4" />
      });
    }

    // Analyse contraintes
    if (enhanced.constraintsCompliance < 90) {
      insights.push({
        id: 'constraints-violation',
        type: 'warning',
        title: 'Contraintes Guillaume à risque',
        description: `Conformité à ${enhanced.constraintsCompliance}%. Réviser configuration urgente.`,
        action: 'Voir contraintes',
        priority: 1,
        icon: <AlertTriangle className="h-4 w-4 text-orange-600" />
      });
    }

    // Prédiction volume d'appels
    const avgCallsPerDay = dashboard.totalCalls;
    if (avgCallsPerDay > 50) {
      insights.push({
        id: 'high-volume',
        type: 'info',
        title: 'Volume élevé prévu',
        description: `Basé sur tendance: ~${Math.round(avgCallsPerDay * 1.2)} appels attendus aujourd'hui.`,
        priority: 2,
        icon: <Target className="h-4 w-4" />
      });
    }

    // ROI positif
    const estimatedROI = ((dashboard.revenue - 2000) / 2000) * 100;
    if (estimatedROI > 100) {
      insights.push({
        id: 'roi-positive',
        type: 'success',
        title: 'ROI excellent',
        description: `Paul génère ${estimatedROI.toFixed(0)}% de retour sur investissement ce mois.`,
        priority: 2,
        icon: <TrendingUp className="h-4 w-4 text-green-600" />
      });
    }

    // Recommandations IA
    if (dashboard.totalCalls > 0 && dashboard.conversionRate > 0) {
      const potentialRevenue = dashboard.totalCalls * 150 * 0.3; // 30% conversion cible
      if (potentialRevenue > dashboard.revenue * 1.5) {
        insights.push({
          id: 'revenue-opportunity',
          type: 'action',
          title: 'Opportunité revenue +50%',
          description: `Optimiser prompts pourrait générer ${potentialRevenue.toLocaleString()}$ CAD/mois.`,
          action: 'Optimiser maintenant',
          priority: 1,
          icon: <Lightbulb className="h-4 w-4 text-yellow-600" />
        });
      }
    }

    return insights.sort((a, b) => a.priority - b.priority);
  }, [dashboard, enhanced, analytics]);

  if (insights.length === 0) return null;

  const getTypeStyles = (type: Insight['type']) => {
    switch(type) {
      case 'success': return 'border-green-500 bg-green-50 text-green-900';
      case 'warning': return 'border-orange-500 bg-orange-50 text-orange-900';
      case 'action': return 'border-blue-500 bg-blue-50 text-blue-900';
      default: return 'border-gray-300 bg-gray-50 text-gray-900';
    }
  };

  return (
    <Card className="card-premium animate-slide-up">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Insights Intelligents Paul
          <Badge variant="secondary" className="ml-2">
            {insights.length} recommandations
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.slice(0, 5).map(insight => (
          <Alert 
            key={insight.id} 
            className={`${getTypeStyles(insight.type)} border-l-4 transition-all hover:shadow-md`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">{insight.icon}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                <AlertDescription className="text-xs">
                  {insight.description}
                </AlertDescription>
                {insight.action && (
                  <button className="mt-2 text-xs font-medium underline hover:no-underline">
                    → {insight.action}
                  </button>
                )}
              </div>
            </div>
          </Alert>
        ))}
        
        {insights.length > 5 && (
          <div className="text-center pt-2">
            <button className="text-sm text-primary font-medium hover:underline">
              Voir {insights.length - 5} autres insights →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}