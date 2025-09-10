/**
 * Accessibility Enhancement Hook
 * Provides utilities and helpers for WCAG 2.1 AA compliance
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';

interface AccessibilityOptions {
  enableKeyboardNav?: boolean;
  announceChanges?: boolean;
  focusTrap?: boolean;
  highContrast?: boolean;
  reduceMotion?: boolean;
}

export function useAccessibility(options: AccessibilityOptions = {}) {
  const {
    enableKeyboardNav = true,
    announceChanges = true,
    focusTrap = false,
    highContrast = false,
    reduceMotion = false,
  } = options;

  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);
  const announcerRef = useRef<HTMLDivElement | null>(null);
  const focusTrapRef = useRef<HTMLElement | null>(null);

  // Detect keyboard vs mouse user
  useEffect(() => {
    if (!enableKeyboardNav) return;

    const handleMouseDown = () => setIsKeyboardUser(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') setIsKeyboardUser(true);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboardNav]);

  // Check user preferences
  useEffect(() => {
    const checkMotionPreference = () => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches || reduceMotion);
    };

    const checkContrastPreference = () => {
      const mediaQuery = window.matchMedia('(prefers-contrast: high)');
      setPrefersHighContrast(mediaQuery.matches || highContrast);
    };

    checkMotionPreference();
    checkContrastPreference();

    // Listen for changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');

    motionQuery.addEventListener('change', checkMotionPreference);
    contrastQuery.addEventListener('change', checkContrastPreference);

    return () => {
      motionQuery.removeEventListener('change', checkMotionPreference);
      contrastQuery.removeEventListener('change', checkContrastPreference);
    };
  }, [reduceMotion, highContrast]);

  // Screen reader announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceChanges) return;

    if (!announcerRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    announcerRef.current.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      if (announcerRef.current) {
        announcerRef.current.textContent = '';
      }
    }, 1000);
  }, [announceChanges]);

  // Focus trap management
  const setupFocusTrap = useCallback((container: HTMLElement) => {
    if (!focusTrap) return;

    focusTrapRef.current = container;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusTrap]);

  // Skip links helper
  const skipToContent = useCallback((contentId: string) => {
    const element = document.getElementById(contentId);
    if (element) {
      element.setAttribute('tabindex', '-1');
      element.focus();
      element.scrollIntoView({ behavior: 'smooth' });
      announce('Navigated to main content');
    }
  }, [announce]);

  // Keyboard navigation helpers
  const handleArrowNavigation = useCallback((
    e: React.KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onNavigate: (index: number) => void
  ) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return;
    }

    e.preventDefault();
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = items.length - 1;
        break;
    }

    onNavigate(newIndex);
    items[newIndex]?.focus();
  }, []);

  // ARIA helpers
  const ariaProps = useCallback((role: string, label?: string, description?: string) => {
    const props: Record<string, any> = { role };
    
    if (label) props['aria-label'] = label;
    if (description) props['aria-describedby'] = description;
    
    if (role === 'button') {
      props['tabIndex'] = 0;
      props['onKeyDown'] = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          (e.target as HTMLElement).click();
        }
      };
    }

    return props;
  }, []);

  // Focus management
  const manageFocus = useCallback((selector: string, delay = 0) => {
    setTimeout(() => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.focus();
        announce(`Focused on ${element.getAttribute('aria-label') || element.textContent}`);
      }
    }, delay);
  }, [announce]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (announcerRef.current) {
        document.body.removeChild(announcerRef.current);
        announcerRef.current = null;
      }
    };
  }, []);

  return {
    // States
    isKeyboardUser,
    prefersReducedMotion,
    prefersHighContrast,
    
    // Functions
    announce,
    setupFocusTrap,
    skipToContent,
    handleArrowNavigation,
    ariaProps,
    manageFocus,
    
    // Classes
    motionSafeClass: prefersReducedMotion ? '' : 'transition-all duration-200',
    focusClass: 'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
    srOnly: 'absolute left-[-10000px] w-px h-px overflow-hidden',
  };
}

// Accessibility context provider
export function useAccessibilityAnnouncer() {
  const [announcement, setAnnouncement] = useState('');
  
  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    setTimeout(() => setAnnouncement(''), 100);
  }, []);

  return { announcement, announce };
}

// Focus visible polyfill
export function useFocusVisible() {
  useEffect(() => {
    // Add focus-visible class to body when keyboard navigation is detected
    const handleFirstTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-nav');
    };

    window.addEventListener('keydown', handleFirstTab);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleFirstTab);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
}

// Live region hook for dynamic content
export function useLiveRegion(ariaLive: 'polite' | 'assertive' = 'polite') {
  const [message, setMessage] = useState('');
  
  const announce = useCallback((text: string) => {
    setMessage(text);
    // Auto-clear after announcement
    setTimeout(() => setMessage(''), 1000);
  }, []);

  const LiveRegion = useCallback(() => (
    <div
      aria-live={ariaLive}
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {message}
    </div>
  ), [message, ariaLive]);

  return { announce, LiveRegion };
}