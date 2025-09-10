import { useCallback, useEffect, useRef } from 'react';

interface UseKeyboardNavigationOptions {
  enableArrowKeys?: boolean;
  enableTabTrapping?: boolean;
  onEscape?: () => void;
  selector?: string;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const {
    enableArrowKeys = true,
    enableTabTrapping = false,
    onEscape,
    selector = 'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const focusableElements = useRef<HTMLElement[]>([]);
  const currentFocusIndex = useRef<number>(-1);

  // Update focusable elements list
  const updateFocusableElements = useCallback(() => {
    if (!containerRef.current) return;

    const elements = Array.from(
      containerRef.current.querySelectorAll(selector)
    ) as HTMLElement[];

    focusableElements.current = elements.filter(
      (el) => 
        !el.disabled &&
        !el.hasAttribute('disabled') &&
        el.tabIndex !== -1 &&
        getComputedStyle(el).display !== 'none' &&
        getComputedStyle(el).visibility !== 'hidden'
    );
  }, [selector]);

  // Focus element by index
  const focusElementByIndex = useCallback((index: number) => {
    const elements = focusableElements.current;
    if (elements.length === 0) return;

    const clampedIndex = Math.max(0, Math.min(index, elements.length - 1));
    const element = elements[clampedIndex];
    
    if (element) {
      element.focus();
      currentFocusIndex.current = clampedIndex;
    }
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, shiftKey, ctrlKey, altKey, metaKey } = event;

    // Don't interfere with modifier key combinations
    if (ctrlKey || altKey || metaKey) return;

    // Handle escape
    if (key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }

    // Only handle arrow keys if enabled
    if (!enableArrowKeys) return;

    updateFocusableElements();
    const elements = focusableElements.current;
    if (elements.length === 0) return;

    // Find current focused element index
    const activeElement = document.activeElement as HTMLElement;
    const currentIndex = elements.findIndex(el => el === activeElement);
    
    let newIndex = currentIndex;

    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = elements.length - 1;
        break;

      case 'Tab':
        // Handle tab trapping if enabled
        if (enableTabTrapping) {
          event.preventDefault();
          if (shiftKey) {
            newIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
          } else {
            newIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
          }
        }
        break;

      default:
        return;
    }

    if (newIndex !== currentIndex && newIndex >= 0) {
      focusElementByIndex(newIndex);
    }
  }, [enableArrowKeys, enableTabTrapping, onEscape, updateFocusableElements, focusElementByIndex]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateFocusableElements();
    container.addEventListener('keydown', handleKeyDown);

    // Update on DOM changes
    const observer = new MutationObserver(updateFocusableElements);
    observer.observe(container, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex', 'aria-hidden']
    });

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
    };
  }, [handleKeyDown, updateFocusableElements]);

  // Focus first element
  const focusFirst = useCallback(() => {
    updateFocusableElements();
    focusElementByIndex(0);
  }, [focusElementByIndex, updateFocusableElements]);

  // Focus last element
  const focusLast = useCallback(() => {
    updateFocusableElements();
    focusElementByIndex(focusableElements.current.length - 1);
  }, [focusElementByIndex, updateFocusableElements]);

  // Focus next element
  const focusNext = useCallback(() => {
    updateFocusableElements();
    const activeElement = document.activeElement as HTMLElement;
    const currentIndex = focusableElements.current.findIndex(el => el === activeElement);
    const nextIndex = currentIndex < focusableElements.current.length - 1 ? currentIndex + 1 : 0;
    focusElementByIndex(nextIndex);
  }, [focusElementByIndex, updateFocusableElements]);

  // Focus previous element
  const focusPrevious = useCallback(() => {
    updateFocusableElements();
    const activeElement = document.activeElement as HTMLElement;
    const currentIndex = focusableElements.current.findIndex(el => el === activeElement);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.current.length - 1;
    focusElementByIndex(previousIndex);
  }, [focusElementByIndex, updateFocusableElements]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusableElementsCount: focusableElements.current.length,
  };
}