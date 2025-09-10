import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import PromptEditor from "@/components/settings/PromptEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSetting, useUpdateSetting } from "@/hooks/useSettings";

export default function SettingsPrompts() {
  const { data: promptsData, isLoading } = useSetting("prompts");
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async (prompts: any) => {
    try {
      await updateSetting.mutateAsync({ key: "prompts", value: prompts });
      setHasChanges(false);
      toast({
        title: "Prompts mis à jour",
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

  const prompts = promptsData?.value || {
    greeting: "",
    services: {},
    closing: ""
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Configuration des prompts" 
          subtitle="Gestion des messages et réponses de Paul" 
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

          {/* Help Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Variables disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-2">Variables client:</div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><code>{'{{nom}}'}</code> - Nom du client</li>
                    <li><code>{'{{telephone}}'}</code> - Numéro de téléphone</li>
                    <li><code>{'{{adresse}}'}</code> - Adresse du client</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-2">Variables service:</div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><code>{'{{service}}'}</code> - Type de service</li>
                    <li><code>{'{{prix}}'}</code> - Prix du service</li>
                    <li><code>{'{{urgence}}'}</code> - Niveau d'urgence</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-2">Variables système:</div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><code>{'{{heure}}'}</code> - Heure actuelle</li>
                    <li><code>{'{{date}}'}</code> - Date actuelle</li>
                    <li><code>{'{{technicien}}'}</code> - Technicien assigné</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Editor */}
          <PromptEditor 
            prompts={prompts} 
            onSave={handleSave}
          />
        </div>
      </main>
    </div>
  );
}
