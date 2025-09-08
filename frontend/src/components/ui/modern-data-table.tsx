/**
 * Modern DataTable - Table de données avancée
 * Avec tri, filtrage, pagination, et actions
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtual } from '@tanstack/react-virtual';
import { 
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce } from '@/hooks/useAdvancedHooks';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T = any> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (props: { row: T; value: any }) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableAction<T = any> {
  id: string;
  label: string;
  icon?: React.ElementType;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  onClick: (row: T) => void;
  disabled?: (row: T) => boolean;
  hidden?: (row: T) => boolean;
}

interface DataTableProps<T = any> {
  data: T[];
  columns: DataTableColumn<T>[];
  actions?: DataTableAction<T>[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  virtualScrolling?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
  onRefresh?: () => void;
  emptyMessage?: string;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function ModernDataTable<T = any>({
  data,
  columns,
  actions = [],
  loading = false,
  searchable = true,
  filterable = false,
  selectable = false,
  pagination = true,
  pageSize = 50,
  virtualScrolling = false,
  onSelectionChange,
  onRefresh,
  emptyMessage = 'Aucune donnée disponible',
  className,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filtrage et tri des données
  const processedData = useMemo(() => {
    let result = [...data];

    // Filtrage par recherche
    if (debouncedSearchTerm) {
      result = result.filter(row =>
        columns.some(column => {
          const value = column.accessorFn 
            ? column.accessorFn(row)
            : column.accessorKey 
            ? row[column.accessorKey]
            : '';
          return String(value).toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        })
      );
    }

    // Filtrage par colonnes
    Object.entries(filters).forEach(([columnId, filterValue]) => {
      if (filterValue) {
        result = result.filter(row => {
          const column = columns.find(col => col.id === columnId);
          if (!column) return true;
          
          const value = column.accessorFn 
            ? column.accessorFn(row)
            : column.accessorKey 
            ? row[column.accessorKey]
            : '';
          return String(value).toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    // Tri
    if (sortState.column && sortState.direction) {
      const column = columns.find(col => col.id === sortState.column);
      if (column) {
        result.sort((a, b) => {
          const aValue = column.accessorFn 
            ? column.accessorFn(a)
            : column.accessorKey 
            ? a[column.accessorKey]
            : '';
          const bValue = column.accessorFn 
            ? column.accessorFn(b)
            : column.accessorKey 
            ? b[column.accessorKey]
            : '';

          if (aValue < bValue) return sortState.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortState.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }, [data, columns, debouncedSearchTerm, sortState, filters]);

  // Pagination
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return processedData.slice(start, end);
  }, [processedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  // Virtual scrolling setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtual({
    size: virtualScrolling ? paginatedData.length : 0,
    parentRef,
    estimateSize: () => 60,
  });

  // Gestion du tri
  const handleSort = (columnId: string) => {
    setSortState(prev => {
      if (prev.column === columnId) {
        const newDirection = prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc';
        return { column: newDirection ? columnId : null, direction: newDirection };
      }
      return { column: columnId, direction: 'asc' };
    });
  };

  // Gestion de la sélection
  const handleRowSelection = (index: number) => {
    if (!selectable) return;
    
    setSelectedRows(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      
      if (onSelectionChange) {
        const selectedData = Array.from(newSelected).map(idx => paginatedData[idx]);
        onSelectionChange(selectedData);
      }
      
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (!selectable) return;
    
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allIndices = new Set(paginatedData.map((_, index) => index));
      setSelectedRows(allIndices);
      onSelectionChange?.(paginatedData);
    }
  };

  // Rendu d'une ligne
  const TableRow = ({ row, index }: { row: T; index: number }) => (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        "border-b border-border hover:bg-accent/50 transition-colors",
        selectedRows.has(index) && "bg-primary/5"
      )}
    >
      {selectable && (
        <td className="p-4 w-12">
          <Checkbox
            checked={selectedRows.has(index)}
            onCheckedChange={() => handleRowSelection(index)}
          />
        </td>
      )}
      
      {columns.map(column => {
        const value = column.accessorFn 
          ? column.accessorFn(row)
          : column.accessorKey 
          ? row[column.accessorKey]
          : '';

        return (
          <td
            key={column.id}
            className={cn(
              "p-4 text-sm",
              column.align === 'center' && "text-center",
              column.align === 'right' && "text-right"
            )}
            style={{
              width: column.width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth,
            }}
          >
            {column.cell ? column.cell({ row, value }) : String(value)}
          </td>
        );
      })}
      
      {actions.length > 0 && (
        <td className="p-4 w-16">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions
                .filter(action => !action.hidden?.(row))
                .map(action => {
                  const IconComponent = action.icon;
                  return (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={() => action.onClick(row)}
                      disabled={action.disabled?.(row)}
                      className={cn(
                        "flex items-center gap-2",
                        action.variant === 'destructive' && "text-destructive"
                      )}
                    >
                      {IconComponent && <IconComponent size={16} />}
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}
    </motion.tr>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          )}
          
          {filterable && (
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Actualiser
            </Button>
          )}
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div
          ref={virtualScrolling ? parentRef : undefined}
          className={cn("overflow-auto", virtualScrolling && "h-96")}
        >
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                {selectable && (
                  <th className="p-4 w-12">
                    <Checkbox
                      checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                      indeterminate={selectedRows.size > 0 && selectedRows.size < paginatedData.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                )}
                
                {columns.map(column => (
                  <th
                    key={column.id}
                    className={cn(
                      "p-4 text-left font-medium text-sm",
                      column.align === 'center' && "text-center",
                      column.align === 'right' && "text-right",
                      column.sortable && "cursor-pointer hover:bg-accent/50"
                    )}
                    onClick={() => column.sortable && handleSort(column.id)}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable && (
                        <div className="flex flex-col">
                          {sortState.column === column.id ? (
                            sortState.direction === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                
                {actions.length > 0 && (
                  <th className="p-4 w-16"></th>
                )}
              </tr>
            </thead>
            
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Chargement...
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} className="p-8 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : virtualScrolling ? (
                rowVirtualizer.virtualItems.map(virtualRow => {
                  const row = paginatedData[virtualRow.index];
                  return (
                    <TableRow
                      key={virtualRow.index}
                      row={row}
                      index={virtualRow.index}
                    />
                  );
                })
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow key={index} row={row} index={index} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Affichage de {((currentPage - 1) * pageSize) + 1} à {Math.min(currentPage * pageSize, processedData.length)} sur {processedData.length} résultats
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + Math.max(1, currentPage - 2);
                if (page > totalPages) return null;
                
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}