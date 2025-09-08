import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock, DollarSign } from "lucide-react";
import { EnhancedMetrics } from "@/hooks/useAlerts";

interface EnhancedMetricsCardProps {
  metrics: EnhancedMetrics;
}

export default function EnhancedMetricsCard({ metrics }: EnhancedMetricsCardProps) {
  const { priorityDistribution, slaCompliance, revenueByPriority, constraintsCompliance } = metrics;
  
  const totalCalls = Object.values(priorityDistribution).reduce((a, b) => a + b, 0);
  const totalSLACompliant = Object.values(slaCompliance).reduce((a, b) => a + b, 0);
  const slaComplianceRate = totalCalls > 0 ? (totalSLACompliant / totalCalls) * 100 : 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Priority Distribution */}
      <Card data-testid="card-priority-distribution" className="card-premium quebec-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-primary">
            <AlertTriangle className="h-5 w-5" />
            Distribution des Priorités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(priorityDistribution).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={priority === "P1" ? "destructive" : priority === "P2" ? "secondary" : "outline"}
                    className={
                      priority === "P1" ? "bg-red-600 text-white" :
                      priority === "P2" ? "bg-orange-600 text-white" :
                      priority === "P3" ? "bg-yellow-600 text-white" :
                      "bg-green-600 text-white"
                    }
                    data-testid={`badge-priority-${priority}`}
                  >
                    {priority}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {priority === "P1" ? "Urgences" :
                     priority === "P2" ? "Municipal" :
                     priority === "P3" ? "Gainage" : "Standard"}
                  </span>
                </div>
                <span className="font-medium" data-testid={`count-${priority}`}>{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SLA Compliance */}
      <Card data-testid="card-sla-compliance" className="card-premium quebec-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-primary">
            <Clock className="h-5 w-5" />
            Conformité SLA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taux global</span>
              <span className="font-medium text-lg" data-testid="text-sla-rate">
                {slaComplianceRate.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={slaComplianceRate} 
              className={`h-2 ${slaComplianceRate >= 95 ? 'text-green-500' : slaComplianceRate >= 80 ? 'text-yellow-500' : 'text-red-500'}`}
              data-testid="progress-sla"
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(slaCompliance).map(([priority, compliant]) => {
                const total = priorityDistribution[priority as keyof typeof priorityDistribution];
                const rate = total > 0 ? (compliant / total) * 100 : 100;
                return (
                  <div key={priority} className="flex justify-between">
                    <span className="text-muted-foreground">{priority}:</span>
                    <span className={rate >= 95 ? 'text-green-600' : rate >= 80 ? 'text-yellow-600' : 'text-red-600'}>
                      {rate.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <Card data-testid="card-revenue-breakdown" className="card-premium quebec-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-primary">
            <DollarSign className="h-5 w-5" />
            Revenus par Priorité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-lg font-semibold" data-testid="text-total-revenue">
              {metrics.totalRevenue.toLocaleString()}$ CAD
            </div>
            <div className="space-y-2 text-sm">
              {Object.entries(revenueByPriority).map(([priority, revenue]) => (
                <div key={priority} className="flex justify-between">
                  <span className="text-muted-foreground">{priority}:</span>
                  <span className="font-medium" data-testid={`revenue-${priority}`}>
                    {revenue.toLocaleString()}$
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Constraints Compliance */}
      <Card data-testid="card-constraints-compliance" className="md:col-span-2 lg:col-span-1 card-premium quebec-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-primary">
            <CheckCircle className="h-5 w-5" />
            Conformité Contraintes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Contraintes actives</span>
              <span className="font-medium" data-testid="text-active-constraints">
                {metrics.activeConstraints}/{metrics.totalConstraints}
              </span>
            </div>
            <Progress 
              value={constraintsCompliance} 
              className={`h-2 ${constraintsCompliance >= 95 ? 'text-green-500' : constraintsCompliance >= 80 ? 'text-yellow-500' : 'text-red-500'}`}
              data-testid="progress-constraints"
            />
            <div className="text-lg font-semibold text-center" data-testid="text-constraints-rate">
              {constraintsCompliance.toFixed(1)}%
            </div>
            <div className="text-xs text-center text-muted-foreground">
              Système de contraintes Drain Fortin
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}