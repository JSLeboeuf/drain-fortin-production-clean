import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { EnhancedConstraint } from '@/services/constraintService';

interface ConstraintFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedPriority: string;
  onPriorityChange: (priority: string) => void;
  stats: {
    byPriority: Record<string, number>;
  };
}

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

export default function ConstraintFilters({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedPriority,
  onPriorityChange,
  stats
}: ConstraintFiltersProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent, priority: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPriorityChange(selectedPriority === priority ? "all" : priority);
    }
  }, [selectedPriority, onPriorityChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtres et Recherche</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, condition ou ID..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Rechercher dans les contraintes"
            role="searchbox"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange("all")}
            aria-pressed={selectedCategory === "all"}
            role="button"
          >
            Toutes les catégories
          </Button>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(key)}
              className="text-xs"
              aria-pressed={selectedCategory === key}
              role="button"
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant={selectedPriority === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onPriorityChange("all")}
            aria-pressed={selectedPriority === "all"}
            role="button"
          >
            Toutes priorités
          </Button>
          {['P1', 'P2', 'P3', 'P4'].map((priority) => (
            <Badge
              key={priority}
              variant={getPriorityVariant(priority)}
              className="cursor-pointer"
              onClick={() => onPriorityChange(selectedPriority === priority ? "all" : priority)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, priority)}
              aria-pressed={selectedPriority === priority}
              aria-label={`Filtrer par priorité ${priority}, ${stats.byPriority[priority] || 0} contraintes`}
            >
              {priority} ({stats.byPriority[priority] || 0})
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}