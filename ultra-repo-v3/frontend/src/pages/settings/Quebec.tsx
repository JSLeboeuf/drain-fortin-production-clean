import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, MapPin, Shield, MessageSquare, Globe } from "lucide-react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function QuebecSettings() {
  const [testText, setTestText] = useState("");
  const [testZone, setTestZone] = useState("");

  // Fetch Quebec-specific data
  const { data: greeting } = useQuery({
    queryKey: ['/api/quebec/greeting'],
  });

  const { data: loi25Compliance } = useQuery({
    queryKey: ['/api/quebec/loi25'],
  });

  const { data: languageValidation, refetch: validateLanguage } = useQuery({
    queryKey: ['/api/quebec/language/validate', testText],
    enabled: testText.length > 0,
  });

  const { data: riveSudCheck, refetch: checkRiveSud } = useQuery({
    queryKey: ['/api/quebec/rive-sud/check', testZone],
    enabled: testZone.length > 0,
  });

  const handleValidateText = () => {
    if (testText.trim()) {
      validateLanguage();
    }
  };

  const handleCheckZone = () => {
    if (testZone.trim()) {
      checkRiveSud();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Paramètres Québec" 
          subtitle="Configuration spécifique au Québec pour VAPI Paul"
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Greeting Configuration */}
            <Card data-testid="card-quebec-greeting">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Salutation Québécoise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Salutation standard configurée
                    </label>
                    <div className="mt-2 p-4 bg-muted rounded-lg">
                      <p className="text-sm" data-testid="text-greeting">
                        {greeting?.greeting || "Chargement..."}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-600">✓ Exigences respectées:</span>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        <li>• Mention "agent virtuel" au début</li>
                        <li>• Vouvoiement obligatoire</li>
                        <li>• Accent québécois authentique</li>
                      </ul>
                    </div>
                    <div>
                      <span className="font-medium text-red-600">✗ Éviter:</span>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        <li>• "Paul à l'appareil" sans "agent virtuel"</li>
                        <li>• Termes "bot", "assistant", "IA"</li>
                        <li>• "dot com" au lieu de "point com"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language Validation Tool */}
            <Card data-testid="card-language-validation">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Validation du Langage Québécois
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Tester un texte pour la conformité québécoise
                    </label>
                    <div className="flex gap-2 mt-2">
                      <Textarea
                        placeholder="Entrez du texte à valider (ex: Bonjour, je suis un bot assistant qui utilise dot com...)"
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        className="flex-1"
                        data-testid="input-test-text"
                      />
                      <Button 
                        onClick={handleValidateText}
                        disabled={!testText.trim()}
                        data-testid="button-validate-text"
                      >
                        Valider
                      </Button>
                    </div>
                  </div>

                  {languageValidation && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {languageValidation.isCompliant ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="font-medium text-green-700">Conforme</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-red-500" />
                            <span className="font-medium text-red-700">Non conforme</span>
                          </>
                        )}
                      </div>

                      {languageValidation.violations.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-red-700 mb-2">Violations détectées:</h4>
                          <ul className="space-y-1">
                            {languageValidation.violations.map((violation, index) => (
                              <li key={index} className="text-sm text-red-600" data-testid={`violation-${index}`}>
                                • {violation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {languageValidation.suggestions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-700 mb-2">Suggestions:</h4>
                          <ul className="space-y-1">
                            {languageValidation.suggestions.map((suggestion, index) => (
                              <li key={index} className="text-sm text-blue-600" data-testid={`suggestion-${index}`}>
                                • {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rive-Sud Zone Checker */}
            <Card data-testid="card-rive-sud-checker">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Vérificateur Zone Rive-Sud
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Vérifier si une zone est Rive-Sud (+100$ surcharge)
                    </label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Nom de ville ou code postal (ex: Brossard, J4W 1A1)"
                        value={testZone}
                        onChange={(e) => setTestZone(e.target.value)}
                        className="flex-1"
                        data-testid="input-test-zone"
                      />
                      <Button 
                        onClick={handleCheckZone}
                        disabled={!testZone.trim()}
                        data-testid="button-check-zone"
                      >
                        Vérifier
                      </Button>
                    </div>
                  </div>

                  {riveSudCheck && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {riveSudCheck.isRiveSud ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <span className="font-medium text-green-700">Zone Rive-Sud</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-gray-500" />
                              <span className="font-medium text-gray-700">Pas Rive-Sud</span>
                            </>
                          )}
                        </div>
                        {riveSudCheck.isRiveSud && (
                          <Badge variant="secondary" data-testid="badge-surcharge">
                            +{riveSudCheck.surcharge}$ CAD
                          </Badge>
                        )}
                      </div>

                      {riveSudCheck.matchedBy && (
                        <p className="text-sm text-muted-foreground mb-3">
                          Identifié par: {riveSudCheck.matchedBy === 'municipality' ? 'Nom de municipalité' : 'Code postal'}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <h5 className="font-medium mb-1">Municipalités Rive-Sud:</h5>
                          <p className="text-muted-foreground">
                            {riveSudCheck.availableZones?.slice(0, 6).join(", ")}
                            {riveSudCheck.availableZones?.length > 6 && "..."}
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium mb-1">Codes Postaux:</h5>
                          <p className="text-muted-foreground">
                            {riveSudCheck.availablePostalCodes?.join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Loi 25 Compliance */}
            <Card data-testid="card-loi25-compliance">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Conformité Loi 25 (Québec)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loi25Compliance ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Statut de conformité</span>
                      <Badge 
                        variant={loi25Compliance.active ? "default" : "destructive"}
                        data-testid="badge-loi25-status"
                      >
                        {loi25Compliance.status}
                      </Badge>
                    </div>

                    {loi25Compliance.active && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <h4 className="font-medium">Protection des données</h4>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• Chiffrement transit: {loi25Compliance.requirements.encryption_transit}</li>
                            <li>• Chiffrement repos: {loi25Compliance.requirements.encryption_rest}</li>
                            <li>• Minimisation: {loi25Compliance.requirements.minimization}</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Rétention et suppression</h4>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• Rétention: {loi25Compliance.requirements.data_retention}</li>
                            <li>• Suppression: {loi25Compliance.requirements.deletion_on_request}</li>
                            <li>• Journaux: {loi25Compliance.requirements.audit_logs}</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <LoadingSpinner />
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}