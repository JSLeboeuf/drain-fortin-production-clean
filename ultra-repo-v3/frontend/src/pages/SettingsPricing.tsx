import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import PriceManager from "@/components/settings/PriceManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSetting, useUpdateSetting } from "@/hooks/useSettings";

export default function SettingsPricing() {
  const { data: pricingData, isLoading } = useSetting("pricing");
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async (pricing: any) => {
    try {
      await updateSetting.mutateAsync({ key: "pricing", value: pricing });
      setHasChanges(false);
      toast({
        title: "Prix mis à jour",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications.",
        variant: "destructive",
      });
    }
  };

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

  const pricing = pricingData?.value || {
    base: {},
    surcharges: {},
    discounts: {}
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Gestion des prix" 
          subtitle="Configuration des tarifs et surcharges" 
        />

        <div className="flex-1 overflow-y-auto p-6">
          {/* Navigation */}
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/settings">
              <Button variant="outline" size="sm" data-testid="button-back-to-settings">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux paramètres
              </Button>
            </Link>
            {hasChanges && (
              <div className="text-sm text-muted-foreground">
                Modifications non sauvegardées
              </div>
            )}
          </div>

          {/* Pricing Rules Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Règles de calcul</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Calcul de base:</h4>
                  <p className="text-sm text-muted-foreground">
                    Prix final = Prix de base + Surcharges - Remises
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <div>• Les surcharges sont en dollars fixes</div>
                    <div>• Les remises sont en pourcentage</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Zones spéciales:</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>• Rive-Sud: +100$ de surcharge</div>
                    <div>• Urgence P1: +75$ de surcharge</div>
                    <div>• Service de soir: +50$ de surcharge</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Manager */}
          <PriceManager 
            pricing={pricing} 
            onSave={handleSave}
          />

          {/* Price Calculator Preview */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Simulateur de prix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <div className="font-medium">Exemple: Débouchage urgent Rive-Sud</div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>Prix de base (débouchage): {pricing.base?.debouchage || 150}$</div>
                    <div>+ Surcharge Rive-Sud: {pricing.surcharges?.['rive-sud'] || 100}$</div>
                    <div>+ Surcharge urgence: {pricing.surcharges?.urgence || 75}$</div>
                    <div className="border-t pt-1 font-medium text-foreground">
                      Total: {(pricing.base?.debouchage || 150) + (pricing.surcharges?.['rive-sud'] || 100) + (pricing.surcharges?.urgence || 75)}$
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
