import { useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Settings } from 'lucide-react';
import { EnhancedConstraint } from '@/services/constraintService';
import { cn } from '@/lib/utils';

interface ConstraintItemProps {
  constraint: EnhancedConstraint;
  onToggle: (id: string, active: boolean) => void;
  isPending: boolean;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  service: Settings,
  pricing: Settings,
  territory: Settings,
  priority: Settings,
  quality: Settings,
  security: Settings,
  data: Settings,
  communication: Settings,
  routing: Settings,
  scheduling: Settings,
  scripts: Settings,
  technical: Settings
};

const categoryColors: Record<string, string> = {
  service: "bg-drain-orange-500",
  pricing: "bg-drain-orange-500", 
  territory: "bg-drain-steel-500",
  priority: "bg-priority-p1",
  quality: "bg-drain-green-500",
  security: "bg-red-600",
  data: "bg-drain-orange-600",
  communication: "bg-purple-500",
  routing: "bg-indigo-500",
  scheduling: "bg-yellow-600",
  scripts: "bg-pink-500",
  technical: "bg-gray-600"
};

const categoryLabels: Record<string, string> = {
  service: "Services Opérationnels",
  pricing: "Tarification",
  territory: "Territoire",
  priority: "Priorités & Urgences",
  quality: "Qualité de Service",
  security: "Sécurité",
  data: "Collecte de Données",
  communication: "Communication",
  routing: "Routage des Appels",
  scheduling: "Planification",
  scripts: "Scripts & Réponses",
  technical: "Intégration Technique"
};

const getPriorityVariant = (priority: string) => {
  switch (priority) {
    case 'P1': return 'priority1' as const;
    case 'P2': return 'priority2' as const;
    case 'P3': return 'priority3' as const;
    case 'P4': return 'priority4' as const;
    default: return 'default' as const;
  }
};

export default function ConstraintItem({ constraint, onToggle, isPending }: ConstraintItemProps) {
  const CategoryIcon = categoryIcons[constraint.category] || Settings;
  const IconComponent = CategoryIcon as React.ComponentType<{ className: string }>;

  const handleToggle = useCallback((checked: boolean) => {
    onToggle(constraint.id, checked);
  }, [constraint.id, onToggle]);

  return (
    <div
      className={cn(
        "border rounded-lg p-4 transition-all duration-200",
        constraint.active ? "bg-drain-green-50 border-drain-green-200" : "bg-gray-50 border-gray-200"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className={cn(
            "p-2 rounded-lg text-white",
            categoryColors[constraint.category] || "bg-gray-500"
          )}>
            <IconComponent className="h-4 w-4" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm font-medium text-drain-orange-600">
                {constraint.id}
              </span>
              <Badge variant={getPriorityVariant(constraint.priority)}>
                {constraint.priority}
              </Badge>
              <Badge variant="outline">
                {categoryLabels[constraint.category]}
              </Badge>
              {constraint.violationCount > 0 && (
                <Badge variant="destructive">
                  {constraint.violationCount} violations
                </Badge>
              )}
            </div>
            
            <h4 className="font-medium text-foreground mb-1">
              {constraint.name}
            </h4>
            
            <p className="text-sm text-muted-foreground mb-2" id={`constraint-desc-${constraint.id}`}>
              <span className="font-medium">Condition:</span> {constraint.condition}
            </p>
            
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Action:</span> {constraint.action}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {constraint.active ? (
            <CheckCircle className="h-5 w-5 text-drain-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-drain-steel-500" />
          )}
          
          <Switch
            checked={constraint.active}
            onCheckedChange={handleToggle}
            disabled={isPending}
            aria-label={`${constraint.active ? 'Désactiver' : 'Activer'} la contrainte ${constraint.name}`}
            aria-describedby={`constraint-desc-${constraint.id}`}
          />
          
          {isPending && (
            <div className="h-4 w-4 border border-drain-orange-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>
    </div>
  );
}