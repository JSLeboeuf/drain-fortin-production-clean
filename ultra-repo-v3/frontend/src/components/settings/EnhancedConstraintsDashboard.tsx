import { useMemo, useCallback } from "react";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConstraintsData } from "./hooks/useConstraintsData";
import { useConstraintFilters } from "./hooks/useConstraintFilters";
import ConstraintFilters from "./ConstraintFilters";
import ConstraintStatsCard from "./ConstraintStatsCard";
import ConstraintItem from "./ConstraintItem";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";


interface EnhancedConstraintsDashboardProps {
  onToggle?: (id: string, active: boolean) => void;
  pending?: Set<string>;
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export default function EnhancedConstraintsDashboard({ 
  onToggle, 
  pending,
  enableAutoRefresh = false,
  refreshInterval = 30000,
  className = ""
}: EnhancedConstraintsDashboardProps) {
  
  // Data management hook with error handling and loading states
  const {
    constraints,
    stats,
    isLoading,
    error,
    refreshData,
    page,
    pageSize,
    total,
    setPage
  } = useConstraintsData({ enableAutoRefresh, refreshInterval });

  // Filtering logic hook with validation
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

      {/* Filters */}
      <div data-testid="filters-section">
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
      </div>

      {/* Constraints Table */}
      <Card data-testid="constraints-table">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Contraintes Drain Fortin 
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({filteredConstraints.length} résultat{filteredConstraints.length !== 1 ? 's' : ''})
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
          
          {/* Enhanced Empty State */}
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
      {total > pageSize && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                  aria-disabled={page === 1}
                  className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 py-2 text-sm text-muted-foreground" aria-live="polite">
                  Page {page} / {Math.ceil(total / pageSize)}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); if (page < Math.ceil(total / pageSize)) setPage(page + 1); }}
                  aria-disabled={page >= Math.ceil(total / pageSize)}
                  className={page >= Math.ceil(total / pageSize) ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
