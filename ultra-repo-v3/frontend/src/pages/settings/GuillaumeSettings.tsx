import { useState } from "react";
import { logger } from "@/lib/logger";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  CheckCircle, 
  XCircle, 
  Phone, 
  DollarSign,
  Clock,
  MessageSquare,
  AlertTriangle,
  FileText,
  User
} from "lucide-react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";

export default function GuillaumeSettings() {
  const [validationResult, setValidationResult] = useState(null);

  // Configuration assistant Paul
  const { data: assistantConfig } = useQuery({
    queryKey: ['/api/assistant/config']
  });

  const { data: constraints } = useQuery({
    queryKey: ['/api/constraints'],
    refetchInterval: 10000
  });

  // Test validation contraintes Guillaume
  const testGuillaumeConstraints = async () => {
    const testCallData = {
      customerType: 'client',
      serviceType: 'debouchage',
      zone: 'rive-sud',
      description: 'problème débouchage urgent',
      trackingQuestionAsked: false
    };

    try {
      const response = await fetch('/api/constraints/validate-guillaume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callData: testCallData })
      });
      const result = await response.json();
      setValidationResult(result);
    } catch (error) {
      logger.error('Erreur validation:', error);
    }
  };

  // Contraintes Guillaume spécifiques
  const guillaumeConstraints = constraints?.filter(c => 
    c.id.startsWith('TRANSFER-') || 
    c.id.startsWith('REFUSE-') || 
    c.id.startsWith('PRICE-') ||
    c.id.startsWith('CALLBACK-') ||
    c.id.startsWith('TRACK-')
  ) || [];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Configuration Guillaume" 
          subtitle="Spécifications détaillées extraites du PDF de Guillaume"
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Statut configuration Paul */}
            {assistantConfig && (
              <Card data-testid="card-paul-config">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Configuration Assistant Paul
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Règles Fondamentales</h4>
                      <ul className="space-y-2 text-sm">
                        {assistantConfig.core_rules?.map((rule, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Services Acceptés</h4>
                      <div className="space-y-1">
                        {assistantConfig.services_accepted?.map((service, index) => (
                          <Badge key={index} variant="outline" className="text-xs mr-1 mb-1">
                            ✅ {service}
                          </Badge>
                        ))}
                      </div>
                      <h4 className="font-medium mb-3 mt-4">Services Refusés</h4>
                      <div className="space-y-1">
                        {assistantConfig.services_refused?.map((service, index) => (
                          <Badge key={index} variant="destructive" className="text-xs mr-1 mb-1">
                            ❌ {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contraintes Guillaume par catégorie */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Transferts d'appels */}
              <Card data-testid="card-transfers">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Règles de Transfert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>JAMAIS de transfert client standard</strong><br/>
                        Si Paul répond, c'est que Guillaume est indisponible
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Famille/Ami:</span>
                        <Badge variant="secondary">→ "Je suis Etienne..."</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Plomberie traditionnelle:</span>
                        <Badge variant="secondary">→ Maxime 514-617-5425</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Gainage/Racines:</span>
                        <Badge variant="outline">→ Callback moins 1h</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tarification */}
              <Card data-testid="card-pricing">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Tarification Guillaume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <strong>Débouchage:</strong> 350$+tx<br/>
                        <span className="text-xs text-muted-foreground">+ inspection caméra incluse</span>
                      </div>
                      <div>
                        <strong>Drain français:</strong> 500$+tx<br/>
                        <span className="text-xs text-muted-foreground">Si cheminées d'accès</span>
                      </div>
                      <div>
                        <strong>Alésage racines:</strong> 450-750$+tx<br/>
                        <span className="text-xs text-muted-foreground">Selon complexité</span>
                      </div>
                      <div>
                        <strong>Gainage:</strong> Variable<br/>
                        <span className="text-xs text-muted-foreground">Visite 350-750$+tx</span>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <Alert>
                      <DollarSign className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Rive-Sud: +100$ automatique</strong><br/>
                        Supplément fixe ajouté à tous les services
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>

              {/* Horaires */}
              <Card data-testid="card-schedule">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Gestion Horaire
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span><strong>Heures d'ouverture:</strong></span>
                        <Badge variant="outline">6h-15h Lun-Ven</Badge>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span><strong>Drain français:</strong></span>
                        <Badge variant="secondary">1-3 semaines</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span><strong>Autres services:</strong></span>
                        <Badge variant="outline">Suivi serré</Badge>
                      </div>
                    </div>
                    
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        Guillaume contacte quand place disponible.<br/>
                        Demander particularités horaire client.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>

              {/* Tracking et CRM */}
              <Card data-testid="card-tracking">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Tracking & CRM
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Alert>
                      <MessageSquare className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Question obligatoire:</strong><br/>
                        "Comment avez-vous obtenu nos coordonnées ?"
                      </AlertDescription>
                    </Alert>
                    
                    <div className="text-sm space-y-2">
                      <div><strong>Objectif:</strong> Zéro appel manqué</div>
                      <div><strong>CRM:</strong> Fiche Outlook automatique</div>
                      <div><strong>Données:</strong> Nom, adresse, tél, service</div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={testGuillaumeConstraints}
                        size="sm" 
                        variant="outline"
                        data-testid="button-test-constraints"
                      >
                        🧪 Test Contraintes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Résultat validation test */}
            {validationResult && (
              <Card data-testid="card-validation-result">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Résultat Test Contraintes Guillaume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Contraintes testées:</span>
                      <Badge variant="outline">{validationResult.totalChecked}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Violations détectées:</span>
                      <Badge variant={validationResult.violations?.length > 0 ? "destructive" : "secondary"}>
                        {validationResult.violations?.length || 0}
                      </Badge>
                    </div>
                    
                    {validationResult.violations?.length > 0 && (
                      <div className="space-y-2">
                        <Separator />
                        <h4 className="font-medium text-sm">Violations Détectées:</h4>
                        {validationResult.violations.map((violation, index) => (
                          <div key={index} className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                            <div className="font-medium text-sm">{violation.name}</div>
                            <div className="text-xs text-muted-foreground">{violation.action}</div>
                            <Badge variant="destructive" className="text-xs mt-1">{violation.priority}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Liste contraintes Guillaume actives */}
            <Card data-testid="card-guillaume-constraints">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Contraintes Guillaume Actives ({guillaumeConstraints.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {guillaumeConstraints.map((constraint) => (
                    <div key={constraint.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{constraint.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ID: {constraint.id}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={constraint.active ? "secondary" : "outline"} className="text-xs">
                          {constraint.active ? "✅ Actif" : "⏸️ Inactif"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {guillaumeConstraints.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Contraintes Guillaume en cours de chargement...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}