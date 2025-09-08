import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye } from "lucide-react";

interface PromptEditorProps {
  prompts: {
    greeting: string;
    services: Record<string, string>;
    closing: string;
  };
  onSave: (prompts: any) => void;
}

export default function PromptEditor({ prompts, onSave }: PromptEditorProps) {
  const [currentPrompts, setCurrentPrompts] = useState(prompts);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSave = () => {
    onSave(currentPrompts);
  };

  const updatePrompt = (category: string, value: string) => {
    setCurrentPrompts(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const updateService = (service: string, value: string) => {
    setCurrentPrompts(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [service]: value
      }
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Éditeur de prompts
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              data-testid="button-toggle-preview"
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? "Éditer" : "Aperçu"}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              data-testid="button-save-prompts"
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="greeting">
          <TabsList>
            <TabsTrigger value="greeting">Accueil</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="closing">Fermeture</TabsTrigger>
          </TabsList>

          <TabsContent value="greeting" className="space-y-4">
            <div>
              <Label htmlFor="greeting-prompt">Message d'accueil</Label>
              {previewMode ? (
                <div className="mt-2 p-3 bg-muted rounded-md" data-testid="text-greeting-preview">
                  {currentPrompts.greeting}
                </div>
              ) : (
                <Textarea
                  id="greeting-prompt"
                  value={currentPrompts.greeting}
                  onChange={(e) => updatePrompt("greeting", e.target.value)}
                  className="mt-2"
                  rows={4}
                  data-testid="textarea-greeting"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            {Object.entries(currentPrompts.services).map(([service, prompt]) => (
              <div key={service}>
                <Label htmlFor={`service-${service}`}>
                  {service.charAt(0).toUpperCase() + service.slice(1)}
                </Label>
                {previewMode ? (
                  <div className="mt-2 p-3 bg-muted rounded-md" data-testid={`text-service-preview-${service}`}>
                    {prompt}
                  </div>
                ) : (
                  <Textarea
                    id={`service-${service}`}
                    value={prompt}
                    onChange={(e) => updateService(service, e.target.value)}
                    className="mt-2"
                    rows={3}
                    data-testid={`textarea-service-${service}`}
                  />
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="closing" className="space-y-4">
            <div>
              <Label htmlFor="closing-prompt">Message de fermeture</Label>
              {previewMode ? (
                <div className="mt-2 p-3 bg-muted rounded-md" data-testid="text-closing-preview">
                  {currentPrompts.closing}
                </div>
              ) : (
                <Textarea
                  id="closing-prompt"
                  value={currentPrompts.closing}
                  onChange={(e) => updatePrompt("closing", e.target.value)}
                  className="mt-2"
                  rows={4}
                  data-testid="textarea-closing"
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
