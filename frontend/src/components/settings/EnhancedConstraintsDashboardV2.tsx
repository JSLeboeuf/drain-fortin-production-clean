import { useMemo, useCallback } from "react";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { useConstraintsData } from "./hooks/useConstraintsData";
import { useConstraintFilters } from "./hooks/useConstraintFilters";
import ConstraintFilters from "./ConstraintFilters";
import ConstraintStatsCard from "./ConstraintStatsCard";
import ConstraintItem from "./ConstraintItem";

interface EnhancedConstraintsDashboardV2Props {
  onToggle?: (id: string, active: boolean) => void;
  pending?: Set<string>;
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export default function EnhancedConstraintsDashboardV2({ 
  onToggle, 
  pending,
  enableAutoRefresh = false,
  refreshInterval = 30000,
  className = ""
}: EnhancedConstraintsDashboardV2Props) {
  
  // Data management hook
  const {
    constraints,
    stats,
    isLoading,
    error,
    refreshData
  } = useConstraintsData({ enableAutoRefresh, refreshInterval });

  // Filtering logic hook
  const {
    searchTerm,
    selectedCategory,
    selectedPriority,
    filteredConstraints,
    setSearchTerm,
    setSelectedCategory,
    setSelectedPriority,
    clearFilters,
    getActiveFiltersCount,
    isFiltering
  } = useConstraintFilters(constraints);

  // Memoized pending set for performance
  const pendingSet = useMemo(() => pending ?? new Set<string>(), [pending]);

  // Validated toggle handler with error handling
  const handleToggle = useCallback((id: string, active: boolean) => {
    if (!id || typeof id !== 'string') {
      logger.error('Invalid constraint ID provided to handleToggle:', id);
      return;
    }
    
    if (typeof active !== 'boolean') {
      logger.error('Invalid active state provided to handleToggle:', active);
      return;
    }

    try {
      onToggle?.(id, active);
    } catch (error) {
      logger.error('Error in constraint toggle handler:', error);
    }
  }, [onToggle]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await refreshData();
    } catch (error) {
      logger.error('Error refreshing constraints data:', error);
    }
  }, [refreshData]);

  return (
    <div className={`space-y-6 ${className}`.trim()} data-testid="enhanced-constraints-dashboard">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive" data-testid="error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Erreur: {error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
              data-testid="retry-button"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div data-testid="stats-section">
        <ConstraintStatsCard 
          stats={stats} 
          isLoading={isLoading}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Filters Section */}
      <div data-testid="filters-section">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtres</CardTitle>
              <div className="flex items-center space-x-2">
                {isFiltering && (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {getActiveFiltersCount()} filtre{getActiveFiltersCount() > 1 ? 's' : ''} actif{getActiveFiltersCount() > 1 ? 's' : ''}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearFilters}
                      data-testid="clear-filters-button"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Effacer
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isLoading}
                  data-testid="refresh-button"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ConstraintFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedPriority={selectedPriority}
              onPriorityChange={setSelectedPriority}
              stats={stats}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Constraints Table */}
      <Card data-testid="constraints-table">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Contraintes Drain Fortin 
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({filteredConstraints.length} résultat{filteredConstraints.length > 1 ? 's' : ''})
              </span>
            </span>
            {isLoading && (
              <div className="flex items-center text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                Chargement...
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4" data-testid="constraints-list">
            {filteredConstraints.map((constraint) => (
              <ConstraintItem
                key={constraint.id}
                constraint={constraint}
                onToggle={handleToggle}
                isPending={pendingSet.has(constraint.id)}
              />
            ))}
          </div>
          
          {/* Empty State */}
          {filteredConstraints.length === 0 && !isLoading && (
            <Alert data-testid="empty-state-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error ? (
                  "Impossible de charger les contraintes. Veuillez réessayer."
                ) : isFiltering ? (
                  <>
                    Aucune contrainte ne correspond aux critères de recherche.{" "}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-normal underline" 
                      onClick={clearFilters}
                    >
                      Effacer les filtres
                    </Button>
                  </>
                ) : (
                  "Aucune contrainte disponible."
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && filteredConstraints.length === 0 && (
            <div className="flex items-center justify-center py-8" data-testid="loading-state">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Chargement des contraintes...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}