/**
 * Mobile Performance Hook - Isabella Chen
 * Detects device capabilities and optimizes accordingly
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

interface MobileConfig {
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
  isSlowNetwork: boolean;
  isLowEndDevice: boolean;
  prefersReducedMotion: boolean;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
}

interface PerformanceHints {
  enableAnimations: boolean;
  enableTransitions: boolean;
  enableShadows: boolean;
  enableBlur: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  dataFetchStrategy: 'aggressive' | 'lazy' | 'on-demand';
  chunkLoadPriority: 'immediate' | 'idle' | 'lazy';
}

export function useMobileOptimized(): [MobileConfig, PerformanceHints] {
  const [config, setConfig] = useState<MobileConfig>({
    isMobile: false,
    isTablet: false,
    isTouch: false,
    isSlowNetwork: false,
    isLowEndDevice: false,
    prefersReducedMotion: false,
    screenSize: 'md',
    connectionType: 'unknown'
  });

  // Detect device capabilities
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const ua = navigator.userAgent.toLowerCase();
      
      // Screen size detection
      let screenSize: MobileConfig['screenSize'] = 'md';
      if (width < 640) screenSize = 'xs';
      else if (width < 768) screenSize = 'sm';
      else if (width < 1024) screenSize = 'md';
      else if (width < 1280) screenSize = 'lg';
      else screenSize = 'xl';

      // Device type detection
      const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua) || width < 768;
      const isTablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua) || (width >= 768 && width < 1024);
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // Performance detection
      const memory = (navigator as any).deviceMemory;
      const cores = navigator.hardwareConcurrency;
      const isLowEndDevice = (memory && memory < 4) || (cores && cores < 4);

      // Motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Network detection
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      let connectionType: MobileConfig['connectionType'] = 'unknown';
      let isSlowNetwork = false;

      if (connection) {
        const effectiveType = connection.effectiveType;
        connectionType = effectiveType || 'unknown';
        isSlowNetwork = ['slow-2g', '2g'].includes(effectiveType);
        
        // Also check RTT and downlink
        if (connection.rtt > 300 || connection.downlink < 1) {
          isSlowNetwork = true;
        }
      }

      setConfig({
        isMobile,
        isTablet,
        isTouch,
        isSlowNetwork,
        isLowEndDevice,
        prefersReducedMotion,
        screenSize,
        connectionType
      });
    };

    detectDevice();

    // Listen for resize and network changes
    const handleResize = debounce(detectDevice, 300);
    window.addEventListener('resize', handleResize);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', detectDevice);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (connection) {
        connection.removeEventListener('change', detectDevice);
      }
    };
  }, []);

  // Generate performance hints based on device capabilities
  const performanceHints = useMemo<PerformanceHints>(() => {
    const { isMobile, isSlowNetwork, isLowEndDevice, prefersReducedMotion, screenSize } = config;

    // Low-end device or slow network: maximum performance mode
    if (isLowEndDevice || isSlowNetwork) {
      return {
        enableAnimations: false,
        enableTransitions: !prefersReducedMotion,
        enableShadows: false,
        enableBlur: false,
        imageQuality: 'low',
        dataFetchStrategy: 'lazy',
        chunkLoadPriority: 'lazy'
      };
    }

    // Mobile device: balanced mode
    if (isMobile) {
      return {
        enableAnimations: !prefersReducedMotion,
        enableTransitions: true,
        enableShadows: screenSize !== 'xs',
        enableBlur: false,
        imageQuality: 'medium',
        dataFetchStrategy: 'lazy',
        chunkLoadPriority: 'idle'
      };
    }

    // Desktop/tablet: full features
    return {
      enableAnimations: !prefersReducedMotion,
      enableTransitions: true,
      enableShadows: true,
      enableBlur: true,
      imageQuality: 'high',
      dataFetchStrategy: 'aggressive',
      chunkLoadPriority: 'immediate'
    };
  }, [config]);

  return [config, performanceHints];
}

// Optimized debounce utility
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Hook for responsive images with lazy loading
export function useResponsiveImage(
  src: string,
  options?: {
    sizes?: string;
    loading?: 'lazy' | 'eager';
    quality?: 'low' | 'medium' | 'high';
  }
) {
  const [, performanceHints] = useMobileOptimized();
  
  const quality = options?.quality || performanceHints.imageQuality;
  const loading = options?.loading || (performanceHints.dataFetchStrategy === 'lazy' ? 'lazy' : 'eager');

  // Generate optimized srcset
  const srcSet = useMemo(() => {
    if (!src) return '';
    
    const baseUrl = src.replace(/\.[^.]+$/, '');
    const ext = src.match(/\.[^.]+$/)?.[0] || '.jpg';
    
    const qualityMap = {
      low: [640, 768],
      medium: [640, 768, 1024],
      high: [640, 768, 1024, 1280, 1920]
    };
    
    const widths = qualityMap[quality];
    
    return widths
      .map(w => `${baseUrl}-${w}w${ext} ${w}w`)
      .join(', ');
  }, [src, quality]);

  return {
    src,
    srcSet,
    loading,
    sizes: options?.sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
  };
}

// Hook for intersection observer with performance awareness
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [, performanceHints] = useMobileOptimized();

  useEffect(() => {
    if (!ref.current) return;

    // Skip intersection observer on low-end devices for performance
    if (performanceHints.chunkLoadPriority === 'lazy') {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      {
        rootMargin: '50px',
        threshold: 0.01,
        ...options
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, performanceHints.chunkLoadPriority]);

  return isIntersecting;
}