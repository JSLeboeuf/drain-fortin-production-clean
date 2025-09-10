import React, { memo, useCallback, useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

// ============================================
// MOBILE BUTTON - WCAG AAA COMPLIANT
// ============================================

interface MobileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  hapticFeedback?: boolean;
  ariaLabel?: string;
}

export const MobileButton = memo<MobileButtonProps>(({
  children,
  onClick,
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled = false,
  hapticFeedback = true,
  ariaLabel
}) => {
  const handleClick = useCallback(() => {
    if (disabled || loading) return;
    
    // Haptic feedback for mobile
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    onClick?.();
  }, [onClick, disabled, loading, hapticFeedback]);

  const classNames = [
    'btn-mobile-primary',
    variant === 'secondary' && 'btn-mobile-secondary',
    variant === 'danger' && 'btn-mobile-danger',
    fullWidth && 'w-full',
    (disabled || loading) && 'opacity-50 cursor-not-allowed'
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classNames}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      type="button"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Chargement...
        </span>
      ) : children}
    </button>
  );
});

MobileButton.displayName = 'MobileButton';

// ============================================
// MOBILE CARD - SWIPEABLE & INTERACTIVE
// ============================================

interface MobileCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
  lazyLoad?: boolean;
}

export const MobileCard = memo<MobileCardProps>(({
  children,
  onClick,
  onSwipeLeft,
  onSwipeRight,
  className = '',
  lazyLoad = true
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isVisible, setIsVisible] = useState(!lazyLoad);

  // Lazy loading with Intersection Observer
  const { hasIntersected } = useIntersectionObserver(cardRef, {
    rootMargin: '50px',
    threshold: 0.01
  });

  useEffect(() => {
    if (hasIntersected && lazyLoad) {
      setIsVisible(true);
    }
  }, [hasIntersected, lazyLoad]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return (
    <div
      ref={cardRef}
      className={`swipeable-card ${className}`}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="article"
      tabIndex={onClick ? 0 : undefined}
    >
      {isVisible ? children : <div className="skeleton-mobile h-32" />}
    </div>
  );
});

MobileCard.displayName = 'MobileCard';

// ============================================
// MOBILE BOTTOM SHEET - MODAL REPLACEMENT
// ============================================

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: 'auto' | 'full' | 'half';
}

export const MobileBottomSheet = memo<MobileBottomSheetProps>(({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto'
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDragStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragY(e.touches[0].clientY);
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragY;
    
    if (diff > 100) {
      onClose();
      setIsDragging(false);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  const heightClass = {
    auto: 'max-h-[90vh]',
    full: 'h-full',
    half: 'h-[50vh]'
  }[height];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`bottom-sheet open ${heightClass}`}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
      >
        {/* Drag handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full" />
        
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-4 pt-4">
            <h2 id="sheet-title" className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="Fermer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
});

MobileBottomSheet.displayName = 'MobileBottomSheet';

// ============================================
// MOBILE NAV - BOTTOM NAVIGATION
// ============================================

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface MobileNavProps {
  items: NavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
}

export const MobileNav = memo<MobileNavProps>(({
  items,
  activeId,
  onNavigate
}) => {
  return (
    <nav className="mobile-nav" role="navigation" aria-label="Navigation principale">
      {items.map(item => (
        <button
          key={item.id}
          className={`mobile-nav-item ${activeId === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
          aria-label={item.label}
          aria-current={activeId === item.id ? 'page' : undefined}
        >
          <div className="relative">
            {item.icon}
            {item.badge && item.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </div>
          <span className="text-xs mt-1">{item.label}</span>
        </button>
      ))}
    </nav>
  );
});

MobileNav.displayName = 'MobileNav';

// ============================================
// MOBILE INPUT - OPTIMIZED FOR TOUCH
// ============================================

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
}

export const MobileInput = memo<MobileInputProps>(({
  label,
  error,
  helper,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <input
          id={inputId}
          className={`
            w-full min-h-[56px] px-4 ${icon ? 'pl-12' : ''}
            text-base border-2 rounded-lg
            ${error ? 'border-red-500' : 'border-gray-300'}
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          {...props}
        />
      </div>
      
      {error && (
        <p id={`${inputId}-error`} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p id={`${inputId}-helper`} className="mt-2 text-sm text-gray-500">
          {helper}
        </p>
      )}
    </div>
  );
});

MobileInput.displayName = 'MobileInput';

// ============================================
// MOBILE LIST - VIRTUALIZED FOR PERFORMANCE
// ============================================

interface MobileListItem {
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  badge?: string;
  onClick?: () => void;
}

interface MobileListProps {
  items: MobileListItem[];
  onItemClick?: (item: MobileListItem) => void;
  virtualized?: boolean;
}

export const MobileList = memo<MobileListProps>(({
  items,
  onItemClick,
  virtualized = true
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

  // Simple virtualization for performance
  useEffect(() => {
    if (!virtualized) {
      setVisibleItems(new Set(items.map(item => item.id)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const id = entry.target.getAttribute('data-id');
          if (id) {
            setVisibleItems(prev => {
              const newSet = new Set(prev);
              if (entry.isIntersecting) {
                newSet.add(id);
              }
              return newSet;
            });
          }
        });
      },
      { rootMargin: '100px' }
    );

    const elements = listRef.current?.querySelectorAll('[data-id]');
    elements?.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [items, virtualized]);

  return (
    <div ref={listRef} className="divide-y divide-gray-200">
      {items.map(item => (
        <div
          key={item.id}
          data-id={item.id}
          className="mobile-list-item"
          onClick={() => (item.onClick || onItemClick)?.(item)}
          role="button"
          tabIndex={0}
        >
          {visibleItems.has(item.id) ? (
            <>
              {item.avatar && (
                <img 
                  src={item.avatar} 
                  alt="" 
                  className="w-12 h-12 rounded-full mr-4"
                  loading="lazy"
                />
              )}
              
              <div className="flex-1">
                <h3 className="font-medium">{item.title}</h3>
                {item.subtitle && (
                  <p className="text-sm text-gray-500">{item.subtitle}</p>
                )}
              </div>
              
              {item.badge && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {item.badge}
                </span>
              )}
              
              <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          ) : (
            <div className="skeleton-mobile w-full h-12" />
          )}
        </div>
      ))}
    </div>
  );
});

MobileList.displayName = 'MobileList';

// ============================================
// MOBILE PULL TO REFRESH
// ============================================

interface MobilePullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export const MobilePullToRefresh = memo<MobilePullToRefreshProps>(({
  children,
  onRefresh,
  threshold = 80
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    if (distance > 0 && distance < 150) {
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateY(${pullDistance * 0.5}px)` }}
      className="transition-transform"
    >
      {/* Pull to refresh indicator */}
      <div 
        className={`pull-to-refresh ${pullDistance > threshold ? 'visible' : ''}`}
        style={{ top: pullDistance > 0 ? '20px' : '-60px' }}
      >
        {isRefreshing ? (
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
      </div>
      
      {children}
    </div>
  );
});

MobilePullToRefresh.displayName = 'MobilePullToRefresh';