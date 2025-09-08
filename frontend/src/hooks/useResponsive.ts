/**
 * Responsive Design Hooks
 * Adaptive UI patterns for all screen sizes
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// Breakpoint definitions
const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

// Media query hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Breakpoint hook
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= BREAKPOINTS['2xl']) setBreakpoint('2xl');
      else if (width >= BREAKPOINTS.xl) setBreakpoint('xl');
      else if (width >= BREAKPOINTS.lg) setBreakpoint('lg');
      else if (width >= BREAKPOINTS.md) setBreakpoint('md');
      else if (width >= BREAKPOINTS.sm) setBreakpoint('sm');
      else setBreakpoint('xs');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  const isAbove = useCallback((bp: Breakpoint) => {
    return window.innerWidth >= BREAKPOINTS[bp];
  }, []);

  const isBelow = useCallback((bp: Breakpoint) => {
    return window.innerWidth < BREAKPOINTS[bp];
  }, []);

  const isBetween = useCallback((min: Breakpoint, max: Breakpoint) => {
    const width = window.innerWidth;
    return width >= BREAKPOINTS[min] && width < BREAKPOINTS[max];
  }, []);

  return {
    current: breakpoint,
    isAbove,
    isBelow,
    isBetween,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md' || breakpoint === 'lg',
    isDesktop: breakpoint === 'xl' || breakpoint === '2xl'
  };
}

// Viewport dimensions hook
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio : 1
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const orientation = useMemo(() => {
    return viewport.width > viewport.height ? 'landscape' : 'portrait';
  }, [viewport.width, viewport.height]);

  const aspectRatio = useMemo(() => {
    return viewport.width / viewport.height;
  }, [viewport.width, viewport.height]);

  return {
    ...viewport,
    orientation,
    aspectRatio,
    isMobile: viewport.width < BREAKPOINTS.md,
    isTablet: viewport.width >= BREAKPOINTS.md && viewport.width < BREAKPOINTS.lg,
    isDesktop: viewport.width >= BREAKPOINTS.lg,
    isRetina: viewport.dpr > 1
  };
}

// Container query hook (element-based responsive)
export function useContainerQuery<T extends HTMLElement>(
  queries: Record<string, number>
) {
  const [matches, setMatches] = useState<Record<string, boolean>>({});
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const newMatches: Record<string, boolean> = {};
      
      Object.entries(queries).forEach(([name, minWidth]) => {
        newMatches[name] = width >= minWidth;
      });
      
      setMatches(newMatches);
    });

    observer.observe(elementRef.current);
    
    return () => observer.disconnect();
  }, [queries]);

  return { elementRef, matches };
}

// Responsive value hook
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>> & { default: T }
): T {
  const breakpoint = useBreakpoint();
  const [value, setValue] = useState<T>(values.default);

  useEffect(() => {
    const breakpoints: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpoints.indexOf(breakpoint.current);
    
    for (let i = currentIndex; i < breakpoints.length; i++) {
      const bp = breakpoints[i];
      if (bp in values) {
        setValue(values[bp] as T);
        return;
      }
    }
    
    setValue(values.default);
  }, [breakpoint, values]);

  return value;
}

// Touch device detection
export function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      );
    };

    checkTouch();
    
    // Also check on first touch
    const handleTouch = () => {
      setIsTouch(true);
      window.removeEventListener('touchstart', handleTouch);
    };
    
    window.addEventListener('touchstart', handleTouch);
    
    return () => window.removeEventListener('touchstart', handleTouch);
  }, []);

  return isTouch;
}

// Network status hook
export function useNetworkStatus() {
  const [status, setStatus] = useState({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: '',
    downlink: 0,
    rtt: 0,
    saveData: false
  });

  useEffect(() => {
    const updateStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      setStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType || '',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0,
        saveData: connection?.saveData || false
      });
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return {
    ...status,
    isOnline: status.online,
    isOffline: !status.online,
    isSlow: status.effectiveType === 'slow-2g' || status.effectiveType === '2g',
    isFast: status.effectiveType === '4g'
  };
}

// Adaptive loading hook
export function useAdaptiveLoading() {
  const network = useNetworkStatus();
  const viewport = useViewport();
  const [memory, setMemory] = useState<number | null>(null);
  const [cpuCores, setCpuCores] = useState<number>(1);

  useEffect(() => {
    // Check device memory
    const deviceMemory = (navigator as any).deviceMemory;
    if (deviceMemory) {
      setMemory(deviceMemory);
    }

    // Check CPU cores
    const hardwareConcurrency = navigator.hardwareConcurrency;
    if (hardwareConcurrency) {
      setCpuCores(hardwareConcurrency);
    }
  }, []);

  const quality = useMemo(() => {
    // Determine loading quality based on multiple factors
    if (network.saveData || network.isSlow) return 'low';
    if (!network.isOnline) return 'offline';
    
    const score = 
      (network.isFast ? 3 : network.effectiveType === '3g' ? 2 : 1) +
      (viewport.isDesktop ? 2 : viewport.isTablet ? 1 : 0) +
      (memory && memory > 4 ? 2 : memory && memory > 2 ? 1 : 0) +
      (cpuCores > 4 ? 2 : cpuCores > 2 ? 1 : 0);
    
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }, [network, viewport, memory, cpuCores]);

  return {
    quality,
    shouldReduceMotion: quality === 'low',
    shouldLazyLoad: quality !== 'high',
    imageQuality: quality === 'high' ? 100 : quality === 'medium' ? 75 : 50,
    videoQuality: quality === 'high' ? '1080p' : quality === 'medium' ? '720p' : '480p'
  };
}

// Responsive grid hook
export function useResponsiveGrid() {
  const viewport = useViewport();
  
  const columns = useMemo(() => {
    if (viewport.width < BREAKPOINTS.sm) return 1;
    if (viewport.width < BREAKPOINTS.md) return 2;
    if (viewport.width < BREAKPOINTS.lg) return 3;
    if (viewport.width < BREAKPOINTS.xl) return 4;
    return 6;
  }, [viewport.width]);

  const gap = useMemo(() => {
    if (viewport.width < BREAKPOINTS.sm) return 8;
    if (viewport.width < BREAKPOINTS.md) return 12;
    if (viewport.width < BREAKPOINTS.lg) return 16;
    return 24;
  }, [viewport.width]);

  const containerPadding = useMemo(() => {
    if (viewport.width < BREAKPOINTS.sm) return 16;
    if (viewport.width < BREAKPOINTS.md) return 24;
    if (viewport.width < BREAKPOINTS.lg) return 32;
    return 48;
  }, [viewport.width]);

  return {
    columns,
    gap,
    containerPadding,
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: `${gap}px`,
      padding: `${containerPadding}px`
    }
  };
}

// Responsive font size hook
export function useResponsiveFontSize(
  baseSizes: Partial<Record<Breakpoint, number>> & { default: number }
) {
  const fontSize = useResponsiveValue(baseSizes);
  const viewport = useViewport();
  
  // Apply fluid typography scaling
  const scaledFontSize = useMemo(() => {
    const minScale = 0.85;
    const maxScale = 1.15;
    const minWidth = BREAKPOINTS.sm;
    const maxWidth = BREAKPOINTS.xl;
    
    if (viewport.width <= minWidth) return fontSize * minScale;
    if (viewport.width >= maxWidth) return fontSize * maxScale;
    
    const scale = minScale + (maxScale - minScale) * 
      ((viewport.width - minWidth) / (maxWidth - minWidth));
    
    return Math.round(fontSize * scale);
  }, [fontSize, viewport.width]);

  return scaledFontSize;
}

// Safe area insets hook (for mobile devices)
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  useEffect(() => {
    const computedStyle = getComputedStyle(document.documentElement);
    
    const getInset = (property: string): number => {
      const value = computedStyle.getPropertyValue(property);
      return value ? parseInt(value) : 0;
    };

    setInsets({
      top: getInset('--sat') || getInset('env(safe-area-inset-top)'),
      right: getInset('--sar') || getInset('env(safe-area-inset-right)'),
      bottom: getInset('--sab') || getInset('env(safe-area-inset-bottom)'),
      left: getInset('--sal') || getInset('env(safe-area-inset-left)')
    });
  }, []);

  return insets;
}