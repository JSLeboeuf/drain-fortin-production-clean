import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Camera, Wrench, TreePine, Droplets, MapPin, Clock, DollarSign, CheckCircle2 } from "lucide-react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";

type CompanyProfile = {
  licenses?: { rbq?: string; cmmtq?: string };
  service_areas?: { primary?: string[]; coverage_note?: string };
  technology_focus?: { gps_equipment?: boolean; eco_solutions?: boolean; tv_inspection?: boolean; no_dig_repair?: boolean };
  tagline?: string;
};

export default function DrainFortinServices() {
  const { data: companyProfile } = useQuery<CompanyProfile>({ queryKey: ["/api/settings/company_profile"] });
  useQuery({ queryKey: ["/api/settings/pricing"] });

  const realServices = [
    {
      id: "inspection",
      name: "Inspection télévisée et expertise",
      description: "Inspection par caméra de drain et d'égout avec équipement GPS",
      icon: <Camera className="h-6 w-6" />,
      features: [
        "Caméras avec émetteur GPS",
        "Localisation précise sous dalle",
        "Mini caméra pour petit diamètre",
        "Inspection préachat disponible",
        "Rapport détaillé avec images",
      ],
      sectors: ["résidentiel", "commercial", "industriel", "municipal"],
      pricing: "Selon inspection - Contactez-nous",
    },
    {
      id: "debouchage",
      name: "Débouchage et nettoyage",
      description: "Toutes dimensions de fichoir et buses spécialisées haute pression",
      icon: <Droplets className="h-6 w-6" />,
      features: [
        "Fichoirs toutes dimensions",
        "Buses spécialisées haute pression",
        "Débouchage drain de laveuse, évier, lavabo",
        "Traitement bouchons de graisse",
        "Intervention sur égouts craqués",
      ],
      sectors: ["résidentiel", "commercial"],
      pricing: "350$ - 650$ selon complexité",
    },
    {
      id: "gainage",
      name: "Réparation sans creusage (gainage)",
      description: "Gainage structural écologique - alternative au remplacement par excavation",
      icon: <Wrench className="h-6 w-6" />,
      features: [
        "Technique sans creusage",
        "Gainage structural sans joints",
        "Aucune infiltration de racines future",
        "Solution écologique et durable",
        "Commercial, industriel et municipal",
      ],
      sectors: ["résidentiel", "commercial", "industriel", "municipal"],
      pricing: "3 900$ base + ajustements",
    },
    {
      id: "deracinage",
      name: "Déracinage professionnel",
      description: "Alésage de conduite pour enlèvement complet des racines",
      icon: <TreePine className="h-6 w-6" />,
      features: [
        "Équipement spécialisé d'alésage",
        "Récupération 100% du volume",
        "Enlèvement complet des racines",
        "Prévention des récidives",
        "Restauration complète du débit",
      ],
      sectors: ["résidentiel", "commercial"],
      pricing: "Selon étendue - Contactez-nous",
    },
    {
      id: "nettoyage",
      name: "Nettoyage drain français",
      description: "Nettoyage spécialisé en présence d'ocre ferreuse",
      icon: <Droplets className="h-6 w-6" />,
      features: [
        "Traitement ocre ferreuse",
        "Nettoyage drain de toiture",
        "Équipement et expertise spécialisés",
        "Restauration efficacité drainage",
        "Prévention des problèmes futurs",
      ],
      sectors: ["résidentiel", "commercial"],
      pricing: "Selon ampleur - évaluation gratuite",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header title="Services Drain Fortin" subtitle="Services réels selon expertise et équipements de pointe" />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {companyProfile && (
              <Card data-testid="card-company-overview">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Aperçu Drain Fortin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Zones desservies</h4>
                      <p className="text-sm text-muted-foreground">
                        {companyProfile.service_areas?.primary?.join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {companyProfile.service_areas?.coverage_note}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Technologies</h4>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {companyProfile.technology_focus?.gps_equipment && <Badge variant="outline">GPS</Badge>}
                        {companyProfile.technology_focus?.tv_inspection && <Badge variant="outline">Inspection TV</Badge>}
                        {companyProfile.technology_focus?.no_dig_repair && <Badge variant="outline">Sans creusage</Badge>}
                        {companyProfile.technology_focus?.eco_solutions && <Badge variant="outline">Écologique</Badge>}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Licences</h4>
                      <p className="text-sm text-muted-foreground">RBQ {companyProfile.licenses?.rbq || "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {realServices.map((service) => (
                <Card key={service.id} className="card-premium">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {service.icon}
                        <span>{service.name}</span>
                      </div>
                      <Badge variant="outline">{service.sectors.join(" / ")}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                    <Separator />
                    <div className="mt-3 space-y-1">
                      {service.features.map((f, i) => (
                        <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">Tarification</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{service.pricing}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card data-testid="card-service-hours">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Heures de service et urgences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Service d'urgence</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Disponible 24/7/365 pour les priorités P1 (inondations, urgences)
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>P1 (Urgences):</span>
                        <Badge variant="destructive" className="text-xs">Immédiat</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>P2 (Municipal):</span>
                        <Badge variant="secondary" className="text-xs">&lt; 2 min</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>P3 (Gainage):</span>
                        <Badge variant="outline" className="text-xs">24 h</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>P4 (Standard):</span>
                        <Badge variant="outline" className="text-xs">30 min</Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Tarification spéciale</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Soir (18h-22h):</span>
                        <span>+25%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nuit (22h-07h):</span>
                        <span>+50%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weekend:</span>
                        <span>+50%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Jours fériés QC:</span>
                        <span>+50%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Zone Rive-Sud:</span>
                        <span>+100$ fixe</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

