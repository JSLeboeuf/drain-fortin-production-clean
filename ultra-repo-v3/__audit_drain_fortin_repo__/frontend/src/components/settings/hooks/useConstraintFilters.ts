import { useState, useMemo, useCallback } from "react";
import { logger } from "@/lib/logger";
import { EnhancedConstraint } from "@/services/constraintService";

interface FilterState {
  searchTerm: string;
  selectedCategory: string;
  selectedPriority: string;
}

interface UseConstraintFiltersOptions {
  initialFilters?: Partial<FilterState>;
  enableUrlSync?: boolean;
}

interface UseConstraintFiltersReturn extends FilterState {
  filteredConstraints: EnhancedConstraint[];
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedPriority: (priority: string) => void;
  clearFilters: () => void;
  getActiveFiltersCount: () => number;
  isFiltering: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  searchTerm: "",
  selectedCategory: "all",
  selectedPriority: "all",
};

export function useConstraintFilters(
  constraints: EnhancedConstraint[],
  options: UseConstraintFiltersOptions = {}
): UseConstraintFiltersReturn {
  const { initialFilters = {}, enableUrlSync = false } = options;

  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const { searchTerm, selectedCategory, selectedPriority } = filters;

  // Optimized filtering with validation
  const filteredConstraints = useMemo(() => {
    if (!Array.isArray(constraints)) {
      logger.warn('Invalid constraints array provided to useConstraintFilters');
      return [];
    }

    return constraints.filter(constraint => {
      if (!constraint || typeof constraint !== 'object') {
        return false;
      }

      try {
        const matchesSearch = !searchTerm || 
          (constraint.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           constraint.condition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           constraint.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           constraint.description?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = selectedCategory === "all" || constraint.category === selectedCategory;
        const matchesPriority = selectedPriority === "all" || constraint.priority === selectedPriority;
        
        return matchesSearch && matchesCategory && matchesPriority;
      } catch (error) {
        logger.warn('Error filtering constraint:', constraint.id, error);
        return false;
      }
    });
  }, [constraints, searchTerm, selectedCategory, selectedPriority]);

  const setSearchTerm = useCallback((term: string) => {
    if (typeof term !== 'string') {
      logger.warn('Invalid search term provided:', term);
      return;
    }
    setFilters(prev => ({ ...prev, searchTerm: term.slice(0, 100) })); // Limit search term length
  }, []);

  const setSelectedCategory = useCallback((category: string) => {
    if (typeof category !== 'string') {
      logger.warn('Invalid category provided:', category);
      return;
    }
    setFilters(prev => ({ ...prev, selectedCategory: category }));
  }, []);

  const setSelectedPriority = useCallback((priority: string) => {
    if (typeof priority !== 'string') {
      logger.warn('Invalid priority provided:', priority);
      return;
    }
    setFilters(prev => ({ ...prev, selectedPriority: priority }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (searchTerm && searchTerm.trim() !== "") count++;
    if (selectedCategory !== "all") count++;
    if (selectedPriority !== "all") count++;
    return count;
  }, [searchTerm, selectedCategory, selectedPriority]);

  const isFiltering = useMemo(() => {
    return getActiveFiltersCount() > 0;
  }, [getActiveFiltersCount]);

  return {
    searchTerm,
    selectedCategory,
    selectedPriority,
    filteredConstraints,
    setSearchTerm,
    setSelectedCategory,
    setSelectedPriority,
    clearFilters,
    getActiveFiltersCount,
    isFiltering,
  };
}