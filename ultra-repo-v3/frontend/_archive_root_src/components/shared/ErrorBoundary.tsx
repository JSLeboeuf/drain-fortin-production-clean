import React from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  retry?: () => void;
}

// Composant de fallback par défaut
function DefaultErrorFallback({ error, resetError, retry }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Une erreur s'est produite
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Désolé, quelque chose s'est mal passé. Veuillez réessayer ou contacter le support.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <details className="mb-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2">
                Détails techniques (développement)
              </summary>
              <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-auto max-h-32">
                {error.stack}
              </pre>
            </details>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          {retry && (
            <Button onClick={retry} variant="outline" size="sm">
              Réessayer
            </Button>
          )}

          <Button onClick={resetError} size="sm">
            Recharger la page
          </Button>
        </div>
      </div>
    </div>
  );
}

// Boundary pour les erreurs au niveau de la page
export class PageErrorBoundary extends React.Component<
  ErrorBoundaryProps & { pageName?: string },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { pageName?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { pageName, onError } = this.props;

    // Log l'erreur
    logger.error(`Erreur dans la page ${pageName || 'inconnue'}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Callback personnalisé
    onError?.(error, errorInfo);

    this.setState({ error, errorInfo });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset automatique si les props changent
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (resetKey, idx) => resetKey !== prevProps.resetKeys?.[idx]
      );

      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback: Fallback = DefaultErrorFallback } = this.props;

    if (hasError && error) {
      return (
        <Fallback
          error={error}
          resetError={this.resetError}
          retry={() => window.location.reload()}
        />
      );
    }

    return children;
  }
}

// Boundary principal de l'application
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;

    // Log l'erreur critique
    logger.error('Erreur critique de l\'application', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Callback personnalisé
    onError?.(error, errorInfo);

    this.setState({ error, errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback: Fallback = DefaultErrorFallback } = this.props;

    if (hasError && error) {
      return (
        <Fallback
          error={error}
          resetError={this.resetError}
          retry={() => window.location.reload()}
        />
      );
    }

    return children;
  }
}

// Hook pour gérer les erreurs dans les composants fonctionnels
export function useErrorHandler() {
  return React.useCallback((error: Error, context?: string) => {
    logger.error(`Erreur dans ${context || 'composant'}:`, error);
    throw error; // Relance pour être capturé par ErrorBoundary
  }, []);
}

// Hook pour les erreurs asynchrones
export function useAsyncError() {
  const [, setError] = React.useState();

  return React.useCallback((error: Error) => {
    logger.error('Erreur asynchrone:', error);
    setError(() => {
      throw error;
    });
  }, []);
}

// Utilitaire pour créer des Error Boundaries spécialisés
export function createErrorBoundary(
  fallback: React.ComponentType<ErrorFallbackProps>,
  options: Omit<ErrorBoundaryProps, 'children' | 'fallback'> = {}
) {
  return class CustomErrorBoundary extends ErrorBoundary {
    render() {
      const { hasError, error } = this.state;
      const { children } = this.props;

      if (hasError && error) {
        return React.createElement(fallback, {
          error,
          resetError: this.resetError,
          retry: () => window.location.reload(),
        });
      }

      return children;
    }
  };
}
