/**
 * Optimized Radix UI Components - Isabella Chen
 * Lazy loading + memoization for performance
 */

import { lazy, memo, Suspense, forwardRef } from 'react';
import type { ComponentProps } from 'react';

// ============= LAZY LOAD RADIX COMPONENTS =============
// Only load when actually used, reducing initial bundle

const DialogPrimitive = lazy(() => 
  import('@radix-ui/react-dialog').then(m => ({
    default: m.Root
  }))
);

const DialogTrigger = lazy(() =>
  import('@radix-ui/react-dialog').then(m => ({
    default: m.Trigger
  }))
);

const DialogContent = lazy(() =>
  import('@radix-ui/react-dialog').then(m => ({
    default: m.Content
  }))
);

const DropdownMenuPrimitive = lazy(() =>
  import('@radix-ui/react-dropdown-menu').then(m => ({
    default: m.Root
  }))
);

const SelectPrimitive = lazy(() =>
  import('@radix-ui/react-select').then(m => ({
    default: m.Root
  }))
);

// ============= OPTIMIZED DIALOG =============
interface OptimizedDialogProps extends ComponentProps<typeof DialogPrimitive> {
  loading?: React.ReactNode;
}

export const OptimizedDialog = memo(forwardRef<
  HTMLDivElement,
  OptimizedDialogProps
>(({ children, loading, ...props }, ref) => {
  return (
    <Suspense fallback={loading || <div className="animate-pulse h-8 w-24 bg-gray-200 rounded" />}>
      <DialogPrimitive {...props}>
        {children}
      </DialogPrimitive>
    </Suspense>
  );
}));

OptimizedDialog.displayName = 'OptimizedDialog';

// ============= OPTIMIZED DROPDOWN =============
interface OptimizedDropdownProps extends ComponentProps<typeof DropdownMenuPrimitive> {
  loading?: React.ReactNode;
  prefetch?: boolean;
}

export const OptimizedDropdown = memo(forwardRef<
  HTMLDivElement,
  OptimizedDropdownProps
>(({ children, loading, prefetch = false, ...props }, ref) => {
  // Prefetch on hover if enabled
  if (prefetch) {
    import('@radix-ui/react-dropdown-menu');
  }

  return (
    <Suspense fallback={loading || null}>
      <DropdownMenuPrimitive {...props}>
        {children}
      </DropdownMenuPrimitive>
    </Suspense>
  );
}));

OptimizedDropdown.displayName = 'OptimizedDropdown';

// ============= OPTIMIZED SELECT =============
interface OptimizedSelectProps extends ComponentProps<typeof SelectPrimitive> {
  loading?: React.ReactNode;
}

export const OptimizedSelect = memo(forwardRef<
  HTMLDivElement,
  OptimizedSelectProps
>(({ children, loading, ...props }, ref) => {
  return (
    <Suspense fallback={loading || <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />}>
      <SelectPrimitive {...props}>
        {children}
      </SelectPrimitive>
    </Suspense>
  );
}));

OptimizedSelect.displayName = 'OptimizedSelect';

// ============= VIRTUAL LIST FOR LARGE DROPDOWNS =============
interface VirtualListProps {
  items: any[];
  height: number;
  itemHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
}

export const VirtualList = memo(({ 
  items, 
  height, 
  itemHeight, 
  renderItem 
}: VirtualListProps) => {
  const [scrollTop, setScrollTop] = useState(0);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + height) / itemHeight)
  );

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          top: i * itemHeight,
          height: itemHeight,
          width: '100%'
        }}
      >
        {renderItem(items[i], i)}
      </div>
    );
  }

  return (
    <div
      style={{ height, overflow: 'auto', position: 'relative' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
});

VirtualList.displayName = 'VirtualList';

// ============= PERFORMANCE UTILITIES =============

// Debounced callback for search/filter inputs
export function useDebounceCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// Intersection observer for lazy rendering
export function useLazyRender(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// Import React hooks that were missing
import { useState, useRef, useEffect, useCallback } from 'react';

// ============= EXPORT OPTIMIZED COMPONENTS =============
export default {
  Dialog: OptimizedDialog,
  Dropdown: OptimizedDropdown,
  Select: OptimizedSelect,
  VirtualList,
  useDebounceCallback,
  useLazyRender
};