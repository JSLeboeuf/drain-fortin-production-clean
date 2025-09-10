import { Settings as SettingsIcon, MessageSquare, DollarSign, Shield, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/useSettings";
import { useConstraints } from "@/hooks/useConstraints";

export default function Settings() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: constraints, isLoading: constraintsLoading } = useConstraints();

  const activeConstraints = constraints?.filter(c => c.active).length || 0;
  const totalConstraints = constraints?.length || 0;

  const settingsCards = [
    {
      title: "Configuration Guillaume",
      description: "Spécifications PDF de Guillaume intégrées",
      icon: MessageSquare,
      href: "/settings/guillaume",
      status: "✅ PDF Intégré",
      statusColor: "bg-primary text-primary-foreground",
    },
    {
      title: "Prompts IA",
      description: "Configuration des messages et réponses de Paul",
      icon: MessageSquare,
      href: "/settings/prompts",
      status: "Configuré",
      statusColor: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400",
    },
    {
      title: "Gestion des prix",
      description: "Configuration des tarifs et surcharges",
      icon: DollarSign,
      href: "/settings/pricing",
      status: "Configuré",
      statusColor: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400",
    },
    {
      title: "Contraintes métier",
      description: `${activeConstraints}/${totalConstraints} contraintes actives`,
      icon: Shield,
      href: "/settings/constraints",
      status: activeConstraints === totalConstraints ? "Toutes actives" : "À réviser",
      statusColor: activeConstraints === totalConstraints 
        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400"
        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
    },
  ];

  if (settingsLoading || constraintsLoading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-background">
        <Sidebar />
        <main id="main" role="main" className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Configuration" 
          subtitle="Gestion des paramètres de VAPI Paul" 
        />

        <div className="flex-1 overflow-y-auto p-6">
          {/* System Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <span>État du système</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-green-600 mb-1" data-testid="text-system-uptime">
                    99.9%
                  </div>
                  <div className="text-sm text-muted-foreground">Disponibilité</div>
                </div>
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-blue-600 mb-1" data-testid="text-response-time">
                    1.2s
                  </div>
                  <div className="text-sm text-muted-foreground">Temps de réponse</div>
                </div>
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-primary mb-1" data-testid="text-version">
                    v2.1.0
                  </div>
                  <div className="text-sm text-muted-foreground">Version de Paul</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {settingsCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <span>{card.title}</span>
                      </div>
                      <Badge className={card.statusColor} data-testid={`badge-status-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        {card.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4" data-testid={`text-description-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {card.description}
                    </p>
                    <Link href={card.href}>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        data-testid={`button-configure-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        Configurer
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Changes */}
          <Card>
            <CardHeader>
              <CardTitle>Modifications récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">Prompt d'accueil mis à jour</div>
                    <div className="text-sm text-muted-foreground">Il y a 2 heures</div>
                  </div>
                  <Badge variant="secondary">Prompts</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">Prix du débouchage ajusté</div>
                    <div className="text-sm text-muted-foreground">Il y a 1 jour</div>
                  </div>
                  <Badge variant="secondary">Pricing</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">3 contraintes désactivées</div>
                    <div className="text-sm text-muted-foreground">Il y a 3 jours</div>
                  </div>
                  <Badge variant="secondary">Contraintes</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
