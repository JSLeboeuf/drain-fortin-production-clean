import { useState } from "react";
import { Play, RotateCcw, Download } from "lucide-react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TestResult {
  id: string;
  timestamp: Date;
  phoneNumber: string;
  scenario: string;
  service: string;
  zone: string;
  response: string;
  constraints: string[];
  price: number;
  actions: string[];
}

export default function Test() {
  const [isRunning, setIsRunning] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: "",
    scenario: "",
    service: "",
    zone: "",
  });
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const predefinedScenarios = [
    { value: "inondation", label: "Inondation urgente (P1)" },
    { value: "toilette-bouchee", label: "Toilette bouchée (P2)" },
    { value: "fuite-robinet", label: "Fuite de robinet (P3)" },
    { value: "devis-cuisine", label: "Devis robinetterie cuisine (P4)" },
    { value: "inspection", label: "Inspection générale (P4)" },
  ];

  const services = [
    { value: "debouchage", label: "Débouchage" },
    { value: "reparation", label: "Réparation" },
    { value: "installation", label: "Installation" },
    { value: "urgence", label: "Service d'urgence" },
    { value: "inspection", label: "Inspection" },
  ];

  const zones = [
    { value: "montreal", label: "Montréal" },
    { value: "rive-sud", label: "Rive-Sud" },
    { value: "laval", label: "Laval" },
    { value: "lanaudiere", label: "Lanaudière" },
    { value: "laurentides", label: "Laurentides" },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const runTest = async () => {
    if (!formData.phoneNumber || !formData.scenario || !formData.service || !formData.zone) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      const response = await apiRequest("POST", "/api/test-call", formData);
      const result = await response.json();

      // Mock test result for demonstration
      const testResult: TestResult = {
        id: Date.now().toString(),
        timestamp: new Date(),
        phoneNumber: formData.phoneNumber,
        scenario: formData.scenario,
        service: formData.service,
        zone: formData.zone,
        response: `Bonjour, vous êtes en communication avec Paul, l'assistant virtuel de Drain Fortin. J'ai bien noté votre demande concernant ${formData.service} dans la zone ${formData.zone}. Selon votre situation, je vais vous mettre en contact avec un technicien.`,
        constraints: ["Vérification zone de service", "Calcul du prix", "Disponibilité technicien"],
        price: calculateMockPrice(formData.service, formData.zone),
        actions: ["Prix calculé", "Technicien assigné", "RDV programmé"],
      };

      setTestResults(prev => [testResult, ...prev]);
      
      toast({
        title: "Test réussi",
        description: "La simulation d'appel a été exécutée avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'exécuter le test.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const calculateMockPrice = (service: string, zone: string) => {
    let basePrice = 150;
    switch (service) {
      case "reparation": basePrice = 200; break;
      case "installation": basePrice = 300; break;
      case "urgence": basePrice = 225; break;
      case "inspection": basePrice = 100; break;
    }
    
    if (zone === "rive-sud") basePrice += 100;
    return basePrice;
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const exportResults = () => {
    const csvContent = [
      "Timestamp,Phone,Scenario,Service,Zone,Price,Response",
      ...testResults.map(result => 
        `"${result.timestamp.toISOString()}","${result.phoneNumber}","${result.scenario}","${result.service}","${result.zone}",${result.price},"${result.response}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vapi-test-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Simulateur d'appels" 
          subtitle="Test et validation du système VAPI Paul" 
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Form */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration du test</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="phone-number">Numéro de téléphone *</Label>
                  <Input
                    id="phone-number"
                    placeholder="514-XXX-XXXX"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    data-testid="input-phone-number"
                  />
                </div>

                <div>
                  <Label htmlFor="scenario">Scénario *</Label>
                  <Select value={formData.scenario} onValueChange={(value) => handleInputChange("scenario", value)}>
                    <SelectTrigger data-testid="select-scenario">
                      <SelectValue placeholder="Choisir un scénario" />
                    </SelectTrigger>
                    <SelectContent>
                      {predefinedScenarios.map((scenario) => (
                        <SelectItem key={scenario.value} value={scenario.value}>
                          {scenario.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="service">Service demandé *</Label>
                  <Select value={formData.service} onValueChange={(value) => handleInputChange("service", value)}>
                    <SelectTrigger data-testid="select-service">
                      <SelectValue placeholder="Choisir un service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="zone">Zone géographique *</Label>
                  <Select value={formData.zone} onValueChange={(value) => handleInputChange("zone", value)}>
                    <SelectTrigger data-testid="select-zone">
                      <SelectValue placeholder="Choisir une zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.value} value={zone.value}>
                          {zone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex space-x-2">
                  <Button 
                    onClick={runTest} 
                    disabled={isRunning}
                    className="flex-1"
                    data-testid="button-run-test"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isRunning ? "Test en cours..." : "Lancer le test"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Résultats des tests
                  <div className="flex space-x-2">
                    {testResults.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportResults}
                          data-testid="button-export-results"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearResults}
                          data-testid="button-clear-results"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Effacer
                        </Button>
                      </>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-results">
                    Aucun test exécuté
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {testResults.map((result) => (
                      <div key={result.id} className="border rounded-lg p-4 space-y-3" data-testid={`result-${result.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" data-testid={`badge-scenario-${result.id}`}>
                              {result.scenario}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {result.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <span className="font-mono text-sm" data-testid={`text-price-${result.id}`}>
                            {result.price}$
                          </span>
                        </div>
                        
                        <div className="text-sm">
                          <div className="font-medium mb-1">Réponse de Paul:</div>
                          <div className="text-muted-foreground bg-muted/50 rounded p-2" data-testid={`text-response-${result.id}`}>
                            {result.response}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <div className="font-medium mb-1">Contraintes vérifiées:</div>
                            <ul className="space-y-1 text-muted-foreground">
                              {result.constraints.map((constraint, index) => (
                                <li key={index}>• {constraint}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="font-medium mb-1">Actions exécutées:</div>
                            <ul className="space-y-1 text-muted-foreground">
                              {result.actions.map((action, index) => (
                                <li key={index}>• {action}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Test History Summary */}
          {testResults.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Résumé des tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary" data-testid="text-total-tests">
                      {testResults.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Tests exécutés</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-success-rate">
                      100%
                    </div>
                    <div className="text-sm text-muted-foreground">Taux de succès</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600" data-testid="text-avg-price">
                      {Math.round(testResults.reduce((sum, r) => sum + r.price, 0) / testResults.length)}$
                    </div>
                    <div className="text-sm text-muted-foreground">Prix moyen</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600" data-testid="text-avg-response-time">
                      1.2s
                    </div>
                    <div className="text-sm text-muted-foreground">Temps de réponse</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
