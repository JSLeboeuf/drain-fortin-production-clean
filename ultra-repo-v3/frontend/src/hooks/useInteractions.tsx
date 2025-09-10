/**
 * Advanced Interaction Hooks
 * Smooth, delightful user interaction patterns
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { logger } from '@/lib/logger';

// Gesture detection hook
export function useGestures(element?: HTMLElement | null) {
  const [gesture, setGesture] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const target = element || document.body;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      touchEndRef.current = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        time: Date.now()
      };

      const deltaX = touchEndRef.current.x - touchStartRef.current.x;
      const deltaY = touchEndRef.current.y - touchStartRef.current.y;
      const deltaTime = touchEndRef.current.time - touchStartRef.current.time;
      const velocity = Math.sqrt(deltaX ** 2 + deltaY ** 2) / deltaTime;

      // Detect gesture type
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > 50 && velocity > 0.3) {
          setGesture(deltaX > 0 ? 'swipe-right' : 'swipe-left');
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > 50 && velocity > 0.3) {
          setGesture(deltaY > 0 ? 'swipe-down' : 'swipe-up');
        }
      }

      // Tap detection
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 200) {
        setGesture('tap');
      }

      // Long press detection
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime > 500) {
        setGesture('long-press');
      }

      // Reset after detection
      setTimeout(() => setGesture(null), 100);
    };

    target.addEventListener('touchstart', handleTouchStart);
    target.addEventListener('touchend', handleTouchEnd);

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchend', handleTouchEnd);
    };
  }, [element]);

  return gesture;
}

// Smooth scroll hook with easing
export function useSmoothScroll() {
  const scrollToElement = useCallback((
    element: HTMLElement | string,
    options?: {
      offset?: number;
      duration?: number;
      easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
    }
  ) => {
    const target = typeof element === 'string' 
      ? document.querySelector(element) as HTMLElement
      : element;

    if (!target) return;

    const offset = options?.offset || 0;
    const duration = options?.duration || 1000;
    const easing = options?.easing || 'ease-in-out';

    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    const easingFunctions = {
      linear: (t: number) => t,
      'ease-in': (t: number) => t * t,
      'ease-out': (t: number) => t * (2 - t),
      'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    };

    const animation = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easingFunctions[easing](progress);

      window.scrollTo(0, startPosition + distance * easedProgress);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  }, []);

  return { scrollToElement };
}

// Ripple effect hook
export function useRipple<T extends HTMLElement>() {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const containerRef = useRef<T>(null);

  const createRipple = useCallback((event: React.MouseEvent<T>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id));
    }, 600);
  }, []);

  const RippleContainer = useMemo(() => {
    return () => (
      <>
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 animate-ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}
      </>
    );
  }, [ripples]);

  return { containerRef, createRipple, RippleContainer };
}

// Parallax scrolling hook
export function useParallax(speed = 0.5) {
  const [offset, setOffset] = useState(0);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!elementRef.current) return;

      const rect = elementRef.current.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const windowCenterY = window.innerHeight / 2;
      const distance = centerY - windowCenterY;

      setOffset(distance * speed);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return { elementRef, offset };
}

// Hover intent hook (prevents accidental hovers)
export function useHoverIntent(
  onHoverStart?: () => void,
  onHoverEnd?: () => void,
  delay = 100
) {
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsHovering(true);
      onHoverStart?.();
    }, delay);
  }, [delay, onHoverStart]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovering(false);
    onHoverEnd?.();
  }, [onHoverEnd]);

  return {
    isHovering,
    hoverProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    }
  };
}

// Intersection animation hook
export function useInViewAnimation(
  options?: IntersectionObserverInit & { 
    animation?: string;
    delay?: number;
    once?: boolean;
  }
) {
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || (options?.once && hasAnimated)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsInView(inView);
        
        if (inView && !hasAnimated) {
          setHasAnimated(true);
          
          if (options?.animation) {
            element.style.animation = options.animation;
            
            if (options.delay) {
              element.style.animationDelay = `${options.delay}ms`;
            }
          }
        }
      },
      {
        threshold: options?.threshold || 0.1,
        rootMargin: options?.rootMargin || '0px'
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [hasAnimated, options]);

  return { elementRef, isInView, hasAnimated };
}

// Drag and drop hook
export function useDragDrop<T = any>() {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);

  const handleDragStart = useCallback((item: T, e: React.DragEvent) => {
    setIsDragging(true);
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
    setDraggedOver(null);
  }, []);

  const handleDragOver = useCallback((id: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOver(id);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDraggedOver(null);
  }, []);

  const handleDrop = useCallback((
    targetId: string,
    onDrop: (item: T, targetId: string) => void,
    e: React.DragEvent
  ) => {
    e.preventDefault();
    if (draggedItem) {
      onDrop(draggedItem, targetId);
    }
    handleDragEnd();
  }, [draggedItem, handleDragEnd]);

  return {
    isDragging,
    draggedItem,
    draggedOver,
    dragProps: {
      draggable: true,
      onDragStart: (e: React.DragEvent) => handleDragStart,
      onDragEnd: handleDragEnd
    },
    dropProps: {
      onDragOver: (e: React.DragEvent) => handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: (e: React.DragEvent) => handleDrop
    }
  };
}

// Focus trap for modals/dialogs
export function useFocusTrap(active = true) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore previous focus
      previousFocusRef.current?.focus();
    };
  }, [active]);

  return containerRef;
}

// Tooltip positioning hook
export function useTooltip(
  content: React.ReactNode,
  options?: {
    placement?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    offset?: number;
  }
) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const targetRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const placement = options?.placement || 'top';
  const delay = options?.delay || 500;
  const offset = options?.offset || 8;

  const calculatePosition = useCallback(() => {
    if (!targetRef.current || !tooltipRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let x = 0;
    let y = 0;

    switch (placement) {
      case 'top':
        x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        y = targetRect.top - tooltipRect.height - offset;
        break;
      case 'bottom':
        x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        y = targetRect.bottom + offset;
        break;
      case 'left':
        x = targetRect.left - tooltipRect.width - offset;
        y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        x = targetRect.right + offset;
        y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Ensure tooltip stays within viewport
    x = Math.max(0, Math.min(x, window.innerWidth - tooltipRect.width));
    y = Math.max(0, Math.min(y, window.innerHeight - tooltipRect.height));

    setPosition({ x, y });
  }, [placement, offset]);

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      calculatePosition();
    }, delay);
  }, [delay, calculatePosition]);

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  const Tooltip = useMemo(() => {
    return () => isVisible ? (
      <div
        ref={tooltipRef}
        className="fixed z-50 px-2 py-1 text-sm bg-black/80 text-white rounded pointer-events-none"
        style={{ left: position.x, top: position.y }}
      >
        {content}
      </div>
    ) : null;
  }, [isVisible, position, content]);

  return {
    targetRef,
    tooltipProps: {
      onMouseEnter: show,
      onMouseLeave: hide,
      onFocus: show,
      onBlur: hide
    },
    Tooltip
  };
}