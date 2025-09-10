import { X, AlertTriangle, Clock, Shield, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/hooks/useAlerts";

interface EnhancedAlertBannerProps {
  alerts: Alert[];
  onDismissAlert?: (alertId: string) => void;
  onCallAction?: (phoneNumber: string) => void;
}

export default function EnhancedAlertBanner({ 
  alerts, 
  onDismissAlert, 
  onCallAction 
}: EnhancedAlertBannerProps) {
  if (!alerts.length) return null;

  // Show only the most critical alert
  const criticalAlert = alerts.find(alert => alert.severity === 'critical') || alerts[0];
  
  if (!criticalAlert) return null;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'medium':
        return <Shield className="h-5 w-5 text-yellow-600" />;
      default:
        return <Shield className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800";
      case 'high':
        return "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800";
      case 'medium':
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800";
      default:
        return "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800";
    }
  };

  return (
    <div className={`border-l-4 p-4 mb-6 ${getSeverityStyles(criticalAlert.severity)}`} data-testid="alert-banner-enhanced">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getSeverityIcon(criticalAlert.severity)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge 
                variant={criticalAlert.severity === 'critical' ? 'destructive' : 'secondary'}
                data-testid={`badge-severity-${criticalAlert.severity}`}
              >
                {criticalAlert.severity.toUpperCase()}
              </Badge>
              {criticalAlert.priority && (
                <Badge 
                  variant="outline"
                  className={
                    criticalAlert.priority === "P1" ? "border-red-600 text-red-600" :
                    criticalAlert.priority === "P2" ? "border-orange-600 text-orange-600" :
                    criticalAlert.priority === "P3" ? "border-yellow-600 text-yellow-600" :
                    "border-green-600 text-green-600"
                  }
                  data-testid={`badge-priority-${criticalAlert.priority}`}
                >
                  {criticalAlert.priority}
                </Badge>
              )}
              {alerts.length > 1 && (
                <Badge variant="outline" data-testid="badge-alert-count">
                  +{alerts.length - 1} autres alertes
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100" data-testid="text-alert-message">
              {criticalAlert.message}
            </p>
            {criticalAlert.action && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1" data-testid="text-alert-action">
                Action recommandée: {criticalAlert.action}
              </p>
            )}
            {criticalAlert.phoneNumber && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCallAction?.(criticalAlert.phoneNumber!)}
                  className="text-xs"
                  data-testid="button-call-action"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Appeler {criticalAlert.phoneNumber}
                </Button>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismissAlert?.(criticalAlert.id)}
          className="text-gray-400 hover:text-gray-600"
          data-testid="button-dismiss-alert"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}