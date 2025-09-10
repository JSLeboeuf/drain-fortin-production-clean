import React from 'react';
import { motion } from 'framer-motion';

// Context pour gérer les préférences d'accessibilité
interface AccessibilityContextType {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderMode: boolean;
  keyboardNavMode: boolean;
  focusIndicatorStyle: 'default' | 'high-visibility';
  setReducedMotion: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
  setKeyboardNavMode: (value: boolean) => void;
}

const AccessibilityContext = React.createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [highContrast, setHighContrast] = React.useState(false);
  const [screenReaderMode, setScreenReaderMode] = React.useState(false);
  const [keyboardNavMode, setKeyboardNavMode] = React.useState(false);
  const [focusIndicatorStyle, setFocusIndicatorStyle] = React.useState<'default' | 'high-visibility'>('default');

  // Détection des préférences système
  React.useEffect(() => {
    // Reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    motionQuery.addEventListener('change', handleMotionChange);

    // High contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(contrastQuery.matches);
    
    const handleContrastChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
      if (e.matches) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
    };
    contrastQuery.addEventListener('change', handleContrastChange);

    // Keyboard navigation detection
    const detectKeyboardNav = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setKeyboardNavMode(true);
        document.documentElement.classList.add('keyboard-nav');
      }
    };

    const detectMouseNav = () => {
      setKeyboardNavMode(false);
      document.documentElement.classList.remove('keyboard-nav');
    };

    window.addEventListener('keydown', detectKeyboardNav);
    window.addEventListener('mousedown', detectMouseNav);

    // Screen reader detection (heuristic)
    const isScreenReader = () => {
      return (
        // Check for common screen reader user agents
        /JAWS|NVDA|VoiceOver|TalkBack/i.test(navigator.userAgent) ||
        // Check for aria-live regions being actively used
        document.querySelectorAll('[aria-live]').length > 0
      );
    };
    setScreenReaderMode(isScreenReader());

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
      window.removeEventListener('keydown', detectKeyboardNav);
      window.removeEventListener('mousedown', detectMouseNav);
    };
  }, []);

  // Appliquer les classes CSS globales
  React.useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [reducedMotion]);

  React.useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
      setFocusIndicatorStyle('high-visibility');
    } else {
      document.documentElement.classList.remove('high-contrast');
      setFocusIndicatorStyle('default');
    }
  }, [highContrast]);

  return (
    <AccessibilityContext.Provider
      value={{
        reducedMotion,
        highContrast,
        screenReaderMode,
        keyboardNavMode,
        focusIndicatorStyle,
        setReducedMotion,
        setHighContrast,
        setKeyboardNavMode,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = React.useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

// HOC pour rendre les composants accessibles
export function withAccessibility<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & { ariaLabel?: string; ariaDescribedBy?: string }> {
  return (props) => {
    const { reducedMotion } = useAccessibility();
    
    // Si reduced motion est activé, désactiver les animations
    if (reducedMotion && 'animate' in props) {
      return <Component {...props} animate={false} />;
    }
    
    return <Component {...props} />;
  };
}

// Composant Skip Links pour navigation rapide
export function SkipLinks() {
  const links = [
    { href: '#main', label: 'Aller au contenu principal' },
    { href: '#navigation', label: 'Aller à la navigation' },
    { href: '#search', label: 'Aller à la recherche' },
    { href: '#footer', label: 'Aller au pied de page' },
  ];

  return (
    <div className="skip-links-container">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="skip-link"
          onFocus={(e) => {
            e.currentTarget.classList.add('focused');
          }}
          onBlur={(e) => {
            e.currentTarget.classList.remove('focused');
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

// Composant pour annoncer les changements aux lecteurs d'écran
export function LiveRegion({ 
  message, 
  priority = 'polite' 
}: { 
  message: string; 
  priority?: 'polite' | 'assertive' 
}) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Hook pour gérer le focus trap
export function useFocusTrap(ref: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref]);
}

// Hook pour annoncer les changements de route
export function useRouteAnnouncer(pathname: string) {
  const [announcement, setAnnouncement] = React.useState('');

  React.useEffect(() => {
    const pageTitle = document.title;
    setAnnouncement(`Navigation vers ${pageTitle}`);
  }, [pathname]);

  return (
    <LiveRegion message={announcement} priority="assertive" />
  );
}

// Composant Focus Indicator amélioré
export function FocusIndicator({ children }: { children: React.ReactNode }) {
  const { focusIndicatorStyle } = useAccessibility();

  return (
    <div 
      className={`focus-indicator-wrapper ${focusIndicatorStyle}`}
      onFocus={(e) => {
        e.currentTarget.classList.add('has-focus');
      }}
      onBlur={(e) => {
        e.currentTarget.classList.remove('has-focus');
      }}
    >
      {children}
    </div>
  );
}