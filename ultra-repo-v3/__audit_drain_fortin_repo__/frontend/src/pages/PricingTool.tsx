import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { track } from "@/lib/analytics";

type Service = "debouchage_camera" | "racines_alesage" | "gainage_premiere" | "gainage_installation" | "cheminees";
type Zone = "montreal" | "rive-sud" | "laval" | "autre";
type Moment = "jour" | "soir" | "nuit" | "weekend" | "ferie";

export default function PricingTool() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [service, setService] = useState<Service>("debouchage_camera");
  const [zone, setZone] = useState<Zone>("montreal");
  const [moment, setMoment] = useState<Moment>("jour");
  const [urgent, setUrgent] = useState(false);

  const result = useMemo(() => {
    let min = 0;
    let range: [number, number] | null = null;

    switch (service) {
      case "debouchage_camera":
        range = [350, 650];
        min = 350; break;
      case "racines_alesage":
        range = [450, 750];
        min = 450; break;
      case "gainage_premiere":
        min = 450; break;
      case "gainage_installation":
        min = 3900; break;
      case "cheminees":
        min = 2500; break;
    }

    // Surcharges
    let surcharge = 0;
    if (zone === "rive-sud") surcharge += 100; // fixe
    if (moment === "soir") surcharge += 0.25;
    if (moment === "nuit") surcharge += 0.5;
    if (moment === "weekend") surcharge += 0.5;
    if (moment === "ferie") surcharge += 0.5;
    if (urgent) surcharge += 0.75; // urgence

    const apply = (base: number) => {
      const pct = base * (typeof surcharge === "number" && surcharge < 1 ? surcharge : 0);
      const fix = zone === "rive-sud" ? 100 : 0;
      return Math.round((base + fix + pct) / 10) * 10;
    };

    if (range) {
      const low = Math.max(min, apply(range[0]));
      const high = Math.max(low, apply(range[1]));
      return { text: `${low}$ à ${high}$`, min: low };
    } else {
      const base = Math.max(min, apply(min));
      return { text: `${base}$ + options`, min: base };
    }
  }, [service, zone, moment, urgent]);

  useEffect(() => { track('pricing_view'); }, []);
  useEffect(() => { track('pricing_compute', { service, zone, moment, urgent }); }, [service, zone, moment, urgent]);

  const copyPrice = async () => {
    try {
      await navigator.clipboard.writeText(result.text);
      toast({ title: "Prix copié", description: result.text });
    } catch {
      toast({ title: "Impossible de copier", variant: "destructive" });
    }
  };

  const createIntake = () => {
    const win = urgent ? 'Urgence (P1)' : '1-3 semaines';
    navigate(`/intake?service=${encodeURIComponent(service)}&window=${encodeURIComponent(win)}${urgent ? '&priority=P1' : ''}`);
  };

  const constraintNote = useMemo(() => {
    switch (service) {
      case "debouchage_camera": return "Jamais < 350$";
      case "racines_alesage": return "Jamais < 450$ (alésage)";
      case "gainage_premiere": return "Visite 1: 450$ fixe";
      case "gainage_installation": return "+90$/pi au-delà de 10 pi";
      case "cheminees": return "Installation: 2 500$";
    }
  }, [service]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header title="Calculateur de prix" subtitle="Grille Drain Fortin + surcharges (FR‑CA)" />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Paramètres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Service</Label>
                    <Select value={service} onValueChange={(v) => setService(v as Service)}>
                      <SelectTrigger><SelectValue placeholder="Choisir un service" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debouchage_camera">Débouchage + Caméra</SelectItem>
                        <SelectItem value="racines_alesage">Racines + Alésage</SelectItem>
                        <SelectItem value="gainage_premiere">Gainage — 1ère visite</SelectItem>
                        <SelectItem value="gainage_installation">Gainage — Installation</SelectItem>
                        <SelectItem value="cheminees">Cheminées drain français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Zone</Label>
                    <Select value={zone} onValueChange={(v) => setZone(v as Zone)}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="montreal">Montréal</SelectItem>
                        <SelectItem value="rive-sud">Rive-Sud</SelectItem>
                        <SelectItem value="laval">Laval</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Période</Label>
                    <Select value={moment} onValueChange={(v) => setMoment(v as Moment)}>
                      <SelectTrigger><SelectValue placeholder="Période" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jour">Jour (8h–18h)</SelectItem>
                        <SelectItem value="soir">Soir (18h–22h) +25%</SelectItem>
                        <SelectItem value="nuit">Nuit (22h–07h) +50%</SelectItem>
                        <SelectItem value="weekend">Weekend +50%</SelectItem>
                        <SelectItem value="ferie">Férié QC +50%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pt-7">
                    <Switch id="urgent" checked={urgent} onCheckedChange={setUrgent} />
                    <Label htmlFor="urgent">Urgence (ajout +75%)</Label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <div className="text-sm text-muted-foreground">Résultat</div>
                    <div className="text-xl font-semibold">{result.text}</div>
                  </div>
                  <Badge variant="outline">{constraintNote}</Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={copyPrice}>Copier</Button>
                  <Button size="sm" onClick={createIntake}>Créer une demande</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Règles Guillaume</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Jamais de date fixe — toujours fenêtres (1–3, 2–4 semaines).</p>
                <p>Services refusés: piscines, fosses septiques, puisards, gouttières.</p>
                <p>Minima: 350$ (débouchage/caméra), 450$ (racines), 450$ (visite gainage), 3 900$ (installation).</p>
                <p>Surcharges: Rive-Sud +100$, Soir +25%, Nuit +50%, Weekend +50%, Férié +50%, Urgence +75%.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
