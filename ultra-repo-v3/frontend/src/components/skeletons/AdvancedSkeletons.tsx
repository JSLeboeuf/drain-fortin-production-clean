import React from 'react';
import { cn } from '@/lib/utils';

// Base Skeleton avec animation améliorée
export const Skeleton = ({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'text' | 'circular' | 'rectangular' | 'wave';
}) => {
  const variants = {
    default: 'rounded-md',
    text: 'rounded h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    wave: 'rounded-md skeleton-wave',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-r from-muted to-muted/50',
        'before:absolute before:inset-0',
        'before:-translate-x-full',
        'before:animate-[shimmer_2s_infinite]',
        'before:bg-gradient-to-r',
        'before:from-transparent before:via-white/10 before:to-transparent',
        'dark:before:via-white/5',
        variants[variant],
        className
      )}
      aria-busy="true"
      aria-live="polite"
      role="status"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

// Skeleton pour les cartes
export const CardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn('space-y-3 p-6 rounded-lg border bg-card', className)}>
    <Skeleton className="h-6 w-2/3" variant="text" />
    <Skeleton className="h-4 w-full" variant="text" />
    <Skeleton className="h-4 w-4/5" variant="text" />
    <div className="flex gap-2 mt-4">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

// Skeleton pour les tableaux
export const TableRowSkeleton = ({ columns = 5 }: { columns?: number }) => (
  <tr className="border-b">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="p-4">
        <Skeleton className="h-4 w-full" variant="text" />
      </td>
    ))}
  </tr>
);

// Skeleton pour les listes
export const ListItemSkeleton = () => (
  <div className="flex items-center space-x-4 p-4">
    <Skeleton className="h-12 w-12" variant="circular" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" variant="text" />
      <Skeleton className="h-3 w-1/2" variant="text" />
    </div>
  </div>
);

// Skeleton pour les métriques
export const MetricSkeleton = () => (
  <div className="p-6 rounded-lg border bg-card space-y-2">
    <Skeleton className="h-4 w-24" variant="text" />
    <Skeleton className="h-8 w-32" variant="text" />
    <Skeleton className="h-3 w-16" variant="text" />
  </div>
);

// Skeleton pour les graphiques
export const ChartSkeleton = ({ height = 300 }: { height?: number }) => (
  <div className="p-6 rounded-lg border bg-card">
    <Skeleton className="h-6 w-32 mb-4" variant="text" />
    <Skeleton 
      className="w-full" 
      style={{ height: `${height}px` }}
      variant="rectangular"
    />
  </div>
);

// Skeleton pour formulaires
export const FormSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" variant="text" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" variant="text" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-28" variant="text" />
      <Skeleton className="h-24 w-full" />
    </div>
    <Skeleton className="h-10 w-32" />
  </div>
);

// Skeleton pour le dashboard complet
export const DashboardSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-48" variant="text" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>

    {/* Metrics Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <MetricSkeleton key={i} />
      ))}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>

    {/* Table */}
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="h-6 w-32 mb-4" variant="text" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" variant="text" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Hook pour gérer le loading avec skeleton
export const useSkeletonLoader = (isLoading: boolean, delay = 200) => {
  const [showSkeleton, setShowSkeleton] = React.useState(false);

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isLoading) {
      // Délai avant d'afficher le skeleton pour éviter le flash
      timeout = setTimeout(() => setShowSkeleton(true), delay);
    } else {
      setShowSkeleton(false);
    }

    return () => clearTimeout(timeout);
  }, [isLoading, delay]);

  return showSkeleton;
};