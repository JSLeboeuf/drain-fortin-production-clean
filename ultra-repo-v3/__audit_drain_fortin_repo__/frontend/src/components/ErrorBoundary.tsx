import { Component, ReactNode } from "react";
import { logger } from "@/utils/logger";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static override getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: any) {
    // Log en DEV uniquement
    if (import.meta.env['DEV']) {
      logger.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Point d'extension pour Sentry (commenté pour Phase 2)
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }

    // Callback personnalisé
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      // Fallback personnalisé ou UI par défaut
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Une erreur est survenue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Désolé, quelque chose s'est mal passé. Veuillez réessayer ou contacter le support si le problème persiste.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="text-xs bg-muted p-2 rounded">
                  <summary className="cursor-pointer font-medium">Détails de l'erreur (DEV uniquement)</summary>
                  <pre className="mt-2 whitespace-pre-wrap">{this.state.error.stack}</pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleRetry} size="sm" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Réessayer
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                >
                  Recharger la page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Error Boundary spécialisé pour les pages
export function PageErrorBoundary({ children, pageName }: { children: ReactNode; pageName: string }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        if (import.meta.env.DEV) {
          logger.error(`Error in ${pageName} page:`, error, errorInfo);
        }
        // Point d'extension pour analytics
        // trackPageError(pageName, error);
      }}
      fallback={
        <div className="flex items-center justify-center min-h-96 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-medium">Erreur de chargement</h3>
                <p className="text-sm text-muted-foreground">
                  Impossible de charger la page {pageName}
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Recharger
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}