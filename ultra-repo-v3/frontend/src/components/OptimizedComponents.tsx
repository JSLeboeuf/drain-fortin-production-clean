import React, { memo, useMemo, useCallback } from 'react';
import type { FC, ReactNode } from 'react';

// ============================================
// OPTIMIZED INTERVENTION LIST COMPONENT
// ============================================

interface InterventionItemProps {
  intervention: {
    id: string;
    client_name: string;
    service_type: string;
    urgency_level: string;
    status: string;
  };
  onStatusChange?: (id: string, status: string) => void;
}

export const InterventionItem = memo<InterventionItemProps>(
  ({ intervention, onStatusChange }) => {
    const handleStatusChange = useCallback(
      (newStatus: string) => {
        onStatusChange?.(intervention.id, newStatus);
      },
      [intervention.id, onStatusChange]
    );

    const urgencyColor = useMemo(() => {
      switch (intervention.urgency_level) {
        case 'urgent': return 'text-red-600 bg-red-50';
        case 'high': return 'text-orange-600 bg-orange-50';
        case 'medium': return 'text-yellow-600 bg-yellow-50';
        case 'low': return 'text-green-600 bg-green-50';
        default: return 'text-gray-600 bg-gray-50';
      }
    }, [intervention.urgency_level]);

    return (
      <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">{intervention.client_name}</h3>
            <p className="text-sm text-gray-600">{intervention.service_type}</p>
            <span className={`inline-block px-2 py-1 text-xs rounded ${urgencyColor}`}>
              {intervention.urgency_level}
            </span>
          </div>
          {onStatusChange && (
            <select
              value={intervention.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-1 border rounded"
            >
              <option value="pending">En attente</option>
              <option value="scheduled">Planifié</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
            </select>
          )}
        </div>
      </div>
    );
  },
  // Custom comparison function for optimization
  (prevProps, nextProps) => {
    return (
      prevProps.intervention.id === nextProps.intervention.id &&
      prevProps.intervention.status === nextProps.intervention.status &&
      prevProps.intervention.urgency_level === nextProps.intervention.urgency_level
    );
  }
);

InterventionItem.displayName = 'InterventionItem';

// ============================================
// OPTIMIZED METRIC CARD COMPONENT
// ============================================

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export const MetricCard = memo<MetricCardProps>(
  ({ title, value, subtitle, icon, trend, color = 'blue' }) => {
    const colorClasses = useMemo(() => {
      const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
        red: 'bg-red-50 text-red-600 border-red-200',
      };
      return colors[color];
    }, [color]);

    const trendIcon = useMemo(() => {
      if (!trend) return null;
      const isPositive = trend > 0;
      return (
        <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
          {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      );
    }, [trend]);

    return (
      <div className={`p-6 rounded-lg border ${colorClasses}`}>
        <div className="flex items-center justify-between mb-2">
          {icon && <div className="text-2xl">{icon}</div>}
          {trendIcon}
        </div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    );
  }
);

MetricCard.displayName = 'MetricCard';

// ============================================
// OPTIMIZED CHART WRAPPER
// ============================================

interface ChartWrapperProps {
  data: any[];
  type: 'line' | 'bar' | 'pie';
  dataKey: string;
  height?: number;
}

export const ChartWrapper = memo<ChartWrapperProps>(
  ({ data, type, dataKey, height = 300 }) => {
    const processedData = useMemo(() => {
      // Process data only when it changes
      return data.map((item, index) => ({
        ...item,
        index,
        value: item[dataKey] || 0,
      }));
    }, [data, dataKey]);

    const chartConfig = useMemo(() => ({
      height,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    }), [height]);

    return (
      <div className="w-full" style={{ height }}>
        {/* Lazy load chart library only when needed */}
        {processedData.length > 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            {/* Chart will be rendered here */}
            Chart: {type} - {processedData.length} points
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Aucune donnée disponible
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Deep comparison for data array
    return (
      prevProps.type === nextProps.type &&
      prevProps.dataKey === nextProps.dataKey &&
      prevProps.height === nextProps.height &&
      JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
    );
  }
);

ChartWrapper.displayName = 'ChartWrapper';

// ============================================
// OPTIMIZED TABLE COMPONENT
// ============================================

interface TableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: any, item: T) => ReactNode;
}

interface OptimizedTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onRowClick?: (item: T) => void;
  loading?: boolean;
}

export function OptimizedTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  loading = false,
}: OptimizedTableProps<T>) {
  const TableRow = memo<{ item: T }>(
    ({ item }) => {
      const handleClick = useCallback(() => {
        onRowClick?.(item);
      }, [item]);

      return (
        <tr
          onClick={handleClick}
          className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
        >
          {columns.map((column) => (
            <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap">
              {column.render
                ? column.render(item[column.key], item)
                : String(item[column.key])}
            </td>
          ))}
        </tr>
      );
    },
    (prevProps, nextProps) => prevProps.item.id === nextProps.item.id
  );

  TableRow.displayName = 'TableRow';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <TableRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// OPTIMIZED SEARCH INPUT
// ============================================

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const SearchInput = memo<SearchInputProps>(
  ({ value, onChange, placeholder = 'Rechercher...', debounceMs = 300 }) => {
    const [localValue, setLocalValue] = React.useState(value);

    React.useEffect(() => {
      const timeout = setTimeout(() => {
        if (localValue !== value) {
          onChange(localValue);
        }
      }, debounceMs);

      return () => clearTimeout(timeout);
    }, [localValue, debounceMs]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    }, []);

    return (
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// ============================================
// PERFORMANCE MONITORING HOC
// ============================================

export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return memo((props: P) => {
    React.useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        if (renderTime > 16.67) { // More than one frame (60fps)
          // Performance warning removed for production
        }
      };
    });

    return <Component {...props} />;
  });
}

// ============================================
// VIRTUAL LIST COMPONENT FOR LARGE DATASETS
// ============================================

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  containerHeight: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );

    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, scrollTop, itemHeight, containerHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      onScroll={handleScroll}
      style={{ height: containerHeight, overflow: 'auto' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              height: itemHeight,
              width: '100%',
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}