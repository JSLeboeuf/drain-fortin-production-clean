/**
 * ✨ Magic UI Data Table Component
 * High-performance virtualized table with Drain Fortin design system
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import {
  Phone,
  Clock,
  User,
  AlertTriangle,
  Filter,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Types
interface CallData {
  id: string;
  phoneNumber: string;
  customerName: string;
  duration: number;
  status: 'completed' | 'missed' | 'active' | 'failed';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  timestamp: Date;
  notes?: string;
  location?: string;
}

interface MagicDataTableProps {
  data: CallData[];
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  className?: string;
}

// Priority badge component
const PriorityBadge = memo(({ priority }: { priority: CallData['priority'] }) => {
  const variants = {
    P1: { bg: 'bg-red-100 text-red-800 border-red-200', icon: 'text-red-600' },
    P2: { bg: 'bg-orange-100 text-orange-800 border-orange-200', icon: 'text-orange-600' },
    P3: { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: 'text-yellow-600' },
    P4: { bg: 'bg-green-100 text-green-800 border-green-200', icon: 'text-green-600' },
  };

  const variant = variants[priority];

  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border", variant.bg)}
    >
      {priority === 'P1' && <AlertTriangle className={cn("h-3 w-3", variant.icon)} />}
      {priority}
    </motion.div>
  );
});

// Status badge component
const StatusBadge = memo(({ status }: { status: CallData['status'] }) => {
  const variants = {
    completed: { bg: 'bg-green-100 text-green-800 border-green-200', label: 'Complété' },
    missed: { bg: 'bg-red-100 text-red-800 border-red-200', label: 'Manqué' },
    active: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Actif' },
    failed: { bg: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Échoué' },
  };

  const variant = variants[status];

  return (
    <Badge className={cn("border", variant.bg)}>
      <div className="flex items-center gap-1">
        {status === 'active' && (
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
        {variant.label}
      </div>
    </Badge>
  );
});

// Table columns definition
const createColumns = (onCallAction?: (phoneNumber: string) => void): ColumnDef<CallData>[] => [
  {
    accessorKey: 'timestamp',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-8 px-2 lg:px-3 hover:bg-[#2ea3f2]/5"
      >
        <Clock className="mr-2 h-4 w-4 text-[#666]" />
        Heure
        {column.getIsSorted() === 'asc' && <SortAsc className="ml-2 h-4 w-4" />}
        {column.getIsSorted() === 'desc' && <SortDesc className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm text-[#666]">
        {row.getValue<Date>('timestamp').toLocaleTimeString('fr-CA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </div>
    ),
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'phoneNumber',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-8 px-2 lg:px-3 hover:bg-[#2ea3f2]/5"
      >
        <Phone className="mr-2 h-4 w-4 text-[#666]" />
        Téléphone
        {column.getIsSorted() === 'asc' && <SortAsc className="ml-2 h-4 w-4" />}
        {column.getIsSorted() === 'desc' && <SortDesc className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }) => (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onCallAction?.(row.getValue('phoneNumber'))}
        className="flex items-center gap-2 font-mono text-sm text-[#2ea3f2] hover:text-[#1e90ff] hover:bg-[#2ea3f2]/5 px-2 py-1 rounded transition-colors"
      >
        <Phone className="h-3 w-3" />
        {row.getValue('phoneNumber')}
      </motion.button>
    ),
  },
  {
    accessorKey: 'customerName',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-8 px-2 lg:px-3 hover:bg-[#2ea3f2]/5"
      >
        <User className="mr-2 h-4 w-4 text-[#666]" />
        Client
        {column.getIsSorted() === 'asc' && <SortAsc className="ml-2 h-4 w-4" />}
        {column.getIsSorted() === 'desc' && <SortDesc className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium text-[#333]">
        {row.getValue('customerName') || 'Inconnu'}
      </div>
    ),
  },
  {
    accessorKey: 'duration',
    header: 'Durée',
    cell: ({ row }) => {
      const duration = row.getValue<number>('duration');
      return (
        <div className="text-sm text-[#666]">
          {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
    filterFn: 'equals',
  },
  {
    accessorKey: 'priority',
    header: 'Priorité',
    cell: ({ row }) => <PriorityBadge priority={row.getValue('priority')} />,
    filterFn: 'equals',
  },
];

// Main MagicDataTable component
export const MagicDataTable = memo<MagicDataTableProps>(({
  data = [],
  loading = false,
  onRefresh,
  onExport,
  className
}) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timestamp', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const handleCallAction = useCallback((phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`);
  }, []);

  const columns = useMemo(() => createColumns(handleCallAction), [handleCallAction]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Loading skeleton
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Journal des Appels</CardTitle>
              <CardDescription>Historique des appels en temps réel</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-[#333]">Journal des Appels</CardTitle>
              <CardDescription className="text-[#666]">
                {data.length} appel{data.length > 1 ? 's' : ''} • Mise à jour en temps réel
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button 
                  onClick={onRefresh}
                  size="sm"
                  variant="outline"
                  className="gap-2 hover:bg-[#2ea3f2]/5 hover:border-[#2ea3f2]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </Button>
              )}
              
              {onExport && (
                <Button 
                  onClick={onExport}
                  size="sm"
                  variant="outline"
                  className="gap-2 hover:bg-[#2ea3f2]/5 hover:border-[#2ea3f2]"
                >
                  <Download className="h-4 w-4" />
                  Exporter
                </Button>
              )}
            </div>
          </div>
          
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] h-4 w-4" />
              <Input
                placeholder="Rechercher dans les appels..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 border-[#e5e7eb] focus:border-[#2ea3f2] focus:ring-[#2ea3f2]/20"
              />
            </div>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Statut
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue('')}>
                    Tous
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue('active')}>
                    Actif
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue('completed')}>
                    Complété
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue('missed')}>
                    Manqué
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Priorité
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => table.getColumn('priority')?.setFilterValue('')}>
                    Toutes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => table.getColumn('priority')?.setFilterValue('P1')}>
                    P1 - Urgent
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => table.getColumn('priority')?.setFilterValue('P2')}>
                    P2 - Important
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => table.getColumn('priority')?.setFilterValue('P3')}>
                    P3 - Normal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => table.getColumn('priority')?.setFilterValue('P4')}>
                    P4 - Bas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Table */}
          <div className="border rounded-lg mx-6 mb-6 overflow-hidden">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-gray-50/80 hover:bg-gray-50">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="font-medium text-[#333]">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row, index) => (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="border-b transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-muted"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </motion.tr>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-[#666]">
                          <Phone className="h-12 w-12 text-gray-400" />
                          <p className="font-medium">Aucun appel trouvé</p>
                          <p className="text-sm">Les appels entrants apparaîtront ici</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between px-6 pb-6">
            <div className="flex-1 text-sm text-[#666]">
              {table.getFilteredSelectedRowModel().rows.length} sur{' '}
              {table.getFilteredRowModel().rows.length} ligne(s) sélectionnée(s)
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-[#666]">
                Page {table.getState().pagination.pageIndex + 1} sur{' '}
                {table.getPageCount()}
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="gap-1"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

MagicDataTable.displayName = 'MagicDataTable';