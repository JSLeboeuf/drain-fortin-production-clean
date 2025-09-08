import { ArrowLeft, Save, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import ConstraintValidator from "@/components/settings/ConstraintValidator";
import EnhancedConstraintsDashboard from "@/components/settings/EnhancedConstraintsDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useConstraints, useUpdateConstraint } from "@/hooks/useConstraints";
import { transformConstraintsData, getConstraintStats } from "@/services/constraintService";
import { useState } from "react";
import React from "react";

export default function SettingsConstraints() {
  const { data: constraints, isLoading } = useConstraints();
  const updateConstraint = useUpdateConstraint();
  const { toast } = useToast();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [showDevTip, setShowDevTip] = useState(false);
  const [showEnhanced, setShowEnhanced] = useState(true);
  
  // Load enhanced constraints from JSON
  const enhancedConstraints = transformConstraintsData();
  const enhancedStats = getConstraintStats(enhancedConstraints);

  const handleToggleConstraint = async (id: string, active: boolean) => {
    try {
      setPending((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      await updateConstraint.mutateAsync({ id, updates: { active } });
      toast({
        title: active ? "Contrainte activée" : "Contrainte désactivée",
        description: "Modification appliquée avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier — réessayez.",
        variant: "destructive",
      });
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Mini tour guidé (DEV only), persiste en localStorage
  React.useEffect(() => {
    if (!import.meta.env.DEV) return;
    try {
      const seen = localStorage.getItem('dev_tour_constraints_seen');
      if (!seen) setShowDevTip(true);
    } catch {}
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-background">
        <Sidebar />
        <main id="main" role="main" className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </main>
      </div>
    );
  }

  const activeCount = showEnhanced ? enhancedStats.active : (constraints?.filter(c => c.active).length || 0);
  const totalCount = showEnhanced ? enhancedStats.total : (constraints?.length || 0);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Contraintes métier Drain Fortin" 
          subtitle={`${activeCount}/${totalCount} contraintes actives - ${showEnhanced ? 'Mode Complet' : 'Mode Simple'}`}
        />

        <div className="flex-1 overflow-y-auto p-6">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/settings">
              <Button variant="outline" size="sm" data-testid="button-back-to-settings">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux paramètres
              </Button>
            </Link>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={showEnhanced ? "default" : "outline"}
                size="sm"
                onClick={() => setShowEnhanced(true)}
              >
                Mode Complet (210+ contraintes)
              </Button>
              <Button
                variant={!showEnhanced ? "default" : "outline"}
                size="sm"
                onClick={() => setShowEnhanced(false)}
              >
                Mode Simple
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contraintes actives</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-active-constraints">
                      {activeCount}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contraintes inactives</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-inactive-constraints">
                      {totalCount - activeCount}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taux d'activation</p>
                    <p className="text-2xl font-bold text-primary" data-testid="text-activation-rate">
                      {totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0}%
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-primary font-bold">%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>À propos des contraintes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Les contraintes métier définissent les règles et limitations que Paul doit respecter lors des appels.
                </p>
                <p>
                  Chaque contrainte peut être activée ou désactivée individuellement selon les besoins opérationnels.
                </p>
                <p className="font-medium text-foreground">
                  Attention: La désactivation de certaines contraintes peut affecter la qualité du service.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced or Simple Constraints View */}
          <ErrorBoundary>
            {showEnhanced ? (
              <EnhancedConstraintsDashboard 
                onToggle={handleToggleConstraint}
                pending={pending}
              />
            ) : (
              constraints && (
                <div className="relative">
                  <ConstraintValidator 
                    constraints={constraints} 
                    onToggle={handleToggleConstraint}
                    pending={pending}
                  />
                  {showDevTip && import.meta.env.DEV && (
                    <div className="absolute -top-2 right-2 z-10 bg-background border rounded-md shadow p-3 w-64">
                      <div className="text-sm font-medium mb-1">Astuce (DEV)</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Un clic pour activer/désactiver une contrainte; définissez vos minimums par service.
                      </div>
                      <button
                        className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
                        onClick={() => { try { localStorage.setItem('dev_tour_constraints_seen','1'); } catch {}; setShowDevTip(false); }}
                      >
                        Compris
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
