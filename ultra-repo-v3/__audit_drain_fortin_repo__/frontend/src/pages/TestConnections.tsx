import { useState } from "react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Wifi, MessageSquare, Phone, Database, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function TestConnections() {
  const [testingVapi, setTestingVapi] = useState(false);
  const [testingTwilio, setTestingTwilio] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [twilioConnected, setTwilioConnected] = useState<boolean | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  
  // Test VAPI Call
  const testVapiCall = async () => {
    setTestingVapi(true);
    try {
      const response = await fetch("/api/vapi/test-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: "+1 514 555 0123",
          customerName: "Jean Tremblay",
          transcript: "J'ai une urgence, mon sous-sol est inondé!",
          priority: "P1",
          serviceType: "urgence"
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "✅ Test VAPI réussi",
          description: data.message,
          duration: 5000
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "❌ Erreur VAPI",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTestingVapi(false);
    }
  };
  
  // Test Twilio Connection
  const testTwilioConnection = async () => {
    setTestingTwilio(true);
    try {
      const response = await fetch("/api/twilio/test-connection");
      const data = await response.json();
      
      setTwilioConnected(data.connected);
      
      if (data.connected) {
        toast({
          title: "✅ Twilio connecté",
          description: `Compte: ${data.accountName}`,
          duration: 5000
        });
      } else {
        toast({
          title: "⚠️ Twilio non configuré",
          description: data.message || data.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setTwilioConnected(false);
      toast({
        title: "❌ Erreur connexion Twilio",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTestingTwilio(false);
    }
  };
  
  // Test SMS
  const testSms = async () => {
    setTestingTwilio(true);
    try {
      const response = await fetch("/api/twilio/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Test Dashboard Paul - " + new Date().toLocaleString('fr-CA')
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "✅ SMS envoyé",
          description: `Message envoyé à ${data.to}`,
          duration: 5000
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "❌ Erreur SMS",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTestingTwilio(false);
    }
  };
  
  // Test Database
  const testDatabase = async () => {
    setTestingDb(true);
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setDbConnected(true);
        toast({
          title: "✅ Base de données OK",
          description: "Connexion Supabase établie",
          duration: 5000
        });
      } else {
        throw new Error("Format de réponse invalide");
      }
    } catch (error: any) {
      setDbConnected(false);
      toast({
        title: "⚠️ Mode mémoire actif",
        description: "Base de données non connectée - utilisation du stockage mémoire",
        variant: "default"
      });
    } finally {
      setTestingDb(false);
    }
  };
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Test des Connexions" 
          subtitle="Vérifier l'intégration VAPI, Twilio et Supabase" 
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* VAPI Test */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    VAPI Webhook
                  </span>
                  <Badge variant="outline">POST /api/vapi/webhook</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Endpoint pour recevoir les appels de VAPI et les transcriptions en temps réel.
                </p>
                
                <div className="space-y-2">
                  <Label>URL Webhook VAPI</Label>
                  <Input 
                    value={`${window.location.origin}/api/vapi/webhook`}
                    readOnly
                    className="text-xs"
                  />
                </div>
                
                <Button 
                  onClick={testVapiCall}
                  disabled={testingVapi}
                  className="w-full"
                >
                  {testingVapi ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Test en cours...
                    </>
                  ) : (
                    "Simuler un appel P1 urgent"
                  )}
                </Button>
                
                <div className="text-xs text-muted-foreground">
                  Simule un appel d'urgence P1 avec transcription
                </div>
              </CardContent>
            </Card>
            
            {/* Twilio Test */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    Twilio SMS
                  </span>
                  {twilioConnected !== null && (
                    twilioConnected ? 
                      <CheckCircle className="h-5 w-5 text-green-600" /> :
                      <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Envoi de SMS à Guillaume selon les priorités P1-P4.
                </p>
                
                <div className="space-y-2">
                  <Label>Numéro Guillaume</Label>
                  <Input 
                    value="+1 514 529 6037"
                    readOnly
                    className="text-xs"
                  />
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={testTwilioConnection}
                    disabled={testingTwilio}
                    variant="outline"
                    className="w-full"
                  >
                    {testingTwilio ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      "Vérifier connexion"
                    )}
                  </Button>
                  
                  <Button 
                    onClick={testSms}
                    disabled={testingTwilio || !twilioConnected}
                    className="w-full"
                  >
                    {testingTwilio ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      "Envoyer SMS test"
                    )}
                  </Button>
                </div>
                
                {!twilioConnected && (
                  <div className="text-xs text-orange-600">
                    Ajoutez TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Database Test */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    Supabase DB
                  </span>
                  {dbConnected !== null && (
                    dbConnected ? 
                      <CheckCircle className="h-5 w-5 text-green-600" /> :
                      <Badge variant="secondary">Mode mémoire</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Stockage PostgreSQL pour appels, analytics et configuration.
                </p>
                
                <div className="space-y-2">
                  <Label>Tables créées</Label>
                  <div className="text-xs space-y-1">
                    <div>• calls (appels)</div>
                    <div>• analytics (métriques)</div>
                    <div>• settings (configuration)</div>
                    <div>• constraints (contraintes)</div>
                    <div>• users (utilisateurs)</div>
                  </div>
                </div>
                
                <Button 
                  onClick={testDatabase}
                  disabled={testingDb}
                  className="w-full"
                >
                  {testingDb ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Test en cours...
                    </>
                  ) : (
                    "Tester connexion DB"
                  )}
                </Button>
                
                {dbConnected === false && (
                  <div className="text-xs text-orange-600">
                    Utilisation du stockage mémoire (non persistant)
                  </div>
                )}
              </CardContent>
            </Card>
            
          </div>
          
          {/* Instructions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>📋 Configuration VAPI requise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Configurer le webhook dans VAPI:</h4>
                <code className="text-sm bg-muted p-2 rounded block">
                  {window.location.origin}/api/vapi/webhook
                </code>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">2. Événements à activer:</h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>call-started</li>
                  <li>transcript / transcript-update</li>
                  <li>call-ended</li>
                  <li>function-call (pour transferts)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">3. Modèle IA recommandé:</h4>
                <p className="text-sm">GPT-4 Turbo ou Claude 4 Opus avec les 156 contraintes Guillaume</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">4. Voix ElevenLabs:</h4>
                <p className="text-sm">Voix française québécoise avec accent authentique</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
