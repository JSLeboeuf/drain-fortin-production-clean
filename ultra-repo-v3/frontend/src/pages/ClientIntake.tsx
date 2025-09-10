import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCanadianPhone, isValidCanadianPhone, formatPostalCodeCA, isValidPostalCodeCA } from "@/lib/sanitize";
import { track } from "@/lib/analytics";

type ServiceKey = "debouchage_camera" | "racines_alesage" | "gainage_premiere" | "gainage_installation" | "cheminees_drain_francais";

const SERVICES: { key: ServiceKey; label: string; minPriceText: string }[] = [
  { key: "debouchage_camera", label: "Débouchage + Caméra", minPriceText: "Minimum 350$" },
  { key: "racines_alesage", label: "Racines + Alésage", minPriceText: "Minimum 450$" },
  { key: "gainage_premiere", label: "Gainage — 1ère visite", minPriceText: "450$ fixe" },
  { key: "gainage_installation", label: "Gainage — Installation", minPriceText: "3 900$ base + 90$/pi >10pi" },
  { key: "cheminees_drain_francais", label: "Cheminées drain français", minPriceText: "2 500$ installation" },
];

const FORBIDDEN = ["Piscines", "Fosses septiques", "Puisards", "Gouttières"];

export default function ClientIntake() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [service, setService] = useState<ServiceKey | "">("");
  const [priorityP1, setPriorityP1] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    postalCode: "",
    email: "",
    source: "",
    notes: "",
    window: "1-3 semaines",
  });

  const onChange = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-format FR-CA inputs
  useEffect(() => {
    if (form.phone) {
      const formatted = formatCanadianPhone(form.phone);
      if (formatted !== form.phone) setForm(f => ({ ...f, phone: formatted }));
    }
  }, [form.phone]);
  useEffect(() => {
    if (form.postalCode) {
      const formatted = formatPostalCodeCA(form.postalCode);
      if (formatted !== form.postalCode) setForm(f => ({ ...f, postalCode: formatted }));
    }
  }, [form.postalCode]);

  // Prefill from URL query params
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('service');
      const w = params.get('window');
      const pr = params.get('priority');
      if (s && ["debouchage_camera","racines_alesage","gainage_premiere","gainage_installation","cheminees_drain_francais"].includes(s)) {
        setService(s as ServiceKey);
      }
      if (w) setForm(f => ({ ...f, window: w }));
      if (pr === 'P1') setPriorityP1(true);
    } catch {}
  }, []);

  const errors = useMemo(() => {
    const e: Record<string, string | undefined> = {};
    if (!form.fullName.trim()) e.fullName = "Requis";
    if (!isValidCanadianPhone(form.phone)) e.phone = "Format 514-555-1234";
    if (!form.address.trim()) e.address = "Requis";
    if (!isValidPostalCodeCA(form.postalCode)) e.postalCode = "Format H3Z 2Y7";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Courriel invalide";
    if (!form.source.trim()) e.source = "Requis";
    if (!service) e.service = "Choisir un service";
    return e;
  }, [form, service]);

  const onSubmit = async () => {
    // Required fields validation (live errors)
    if (Object.values(errors).some(Boolean)) {
      toast({ title: "Champs requis", description: "Veuillez corriger les champs en erreur.", variant: "destructive" });
      return;
    }

    // Submit
    setLoading(true);
    try {
      const payload = {
        full_name: form.fullName.trim(),
        phone: form.phone.replace(/\D/g, ""),
        address: form.address.trim(),
        postal_code: form.postalCode.trim().toUpperCase(),
        email: form.email.trim().toLowerCase(),
        source: form.source.trim(),
        service,
        priority: priorityP1 ? "P1" : "P4",
        requested_window: form.window,
        notes: form.notes.trim(),
      };

      await apiRequest("POST", "/api/intake/submit", payload);
      track('intake_submit', { service, priority: payload.priority, window: payload.requested_window });
      toast({ title: "Demande envoyée", description: "Nous vous contactons selon la priorité et la fenêtre choisie." });
      setForm({ fullName: "", phone: "", address: "", postalCode: "", email: "", source: "", notes: "", window: "1-3 semaines" });
      setService("");
      setPriorityP1(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Envoi impossible.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header title="Nouvelle demande" subtitle="Formulaire client — Drain Fortin (5 champs obligatoires)" />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Informations du client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom complet *</Label>
                    <Input aria-invalid={!!errors.fullName} placeholder="Prénom Nom" value={form.fullName} onChange={(e) => onChange("fullName", e.target.value)} />
                    {errors.fullName && <p className="text-red-600 text-xs mt-1">{errors.fullName}</p>}
                  </div>
                  <div>
                    <Label>Téléphone (10 chiffres) *</Label>
                    <Input aria-invalid={!!errors.phone} placeholder="514-555-1234" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
                    {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
                  </div>
                </div>
                <div>
                  <Label>Adresse complète *</Label>
                  <Input aria-invalid={!!errors.address} placeholder="1234 Rue Exemple, Ville, QC" value={form.address} onChange={(e) => onChange("address", e.target.value)} />
                  {errors.address && <p className="text-red-600 text-xs mt-1">{errors.address}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Code postal *</Label>
                    <Input aria-invalid={!!errors.postalCode} placeholder="H3Z 2Y7" value={form.postalCode} onChange={(e) => onChange("postalCode", e.target.value)} />
                    {errors.postalCode && <p className="text-red-600 text-xs mt-1">{errors.postalCode}</p>}
                  </div>
                  <div>
                    <Label>Courriel *</Label>
                    <Input aria-invalid={!!errors.email} placeholder="prenom.nom@exemple.com" value={form.email} onChange={(e) => onChange("email", e.target.value)} />
                    {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
                  </div>
                </div>
                <div>
                  <Label>Source du contact *</Label>
                  <Input aria-invalid={!!errors.source} placeholder="Google, Référence, Site web, etc." value={form.source} onChange={(e) => onChange("source", e.target.value)} />
                  {errors.source && <p className="text-red-600 text-xs mt-1">{errors.source}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Service demandé *</Label>
                    <Select value={service} onValueChange={(v) => setService(v as ServiceKey)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un service admissible" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICES.map((s) => (
                          <SelectItem key={s.key} value={s.key}>
                            {s.label} — {s.minPriceText}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.service && <p className="text-red-600 text-xs mt-1">{errors.service}</p>}
                  </div>
                  <div>
                    <Label>Fenêtre souhaitée (pas de date fixe)</Label>
                    <Select value={form.window} onValueChange={(v) => onChange("window", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une fenêtre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-3 semaines">1 à 3 semaines</SelectItem>
                        <SelectItem value="2-4 semaines">2 à 4 semaines</SelectItem>
                        <SelectItem value="Urgence (P1)">Urgence (P1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Notes (optionnel)</Label>
                  <Textarea placeholder="Détails pertinents (pas de PII sensibles)" value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <p>Services non offerts: {FORBIDDEN.join(", ")}</p>
                    <p className="mt-1">Mention légale: appel enregistré. Consentement requis.</p>
                  </div>
                  <Button onClick={onSubmit} disabled={loading} className="btn-primary-gradient">
                    {loading ? "Envoi..." : "Soumettre la demande"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priorités et SLA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between priority-p1 px-3 py-2 rounded-md">
                    <span>P1 — Urgences (refoulement, inondation)</span>
                    <Badge variant="destructive">0 min</Badge>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-md border">
                    <span>P2 — Municipal/Commercial</span>
                    <Badge variant="secondary">&lt; 2 min</Badge>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-md border">
                    <span>P3 — Gainage</span>
                    <Badge variant="outline">24 h</Badge>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-md border">
                    <span>P4 — Standard</span>
                    <Badge variant="outline">30 min</Badge>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Grille tarifaire (validation temps réel):</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Débouchage + Caméra: 350$–650$ (min 350$)</li>
                    <li>Racines + Alésage: 450$–750$ (jamais &lt; 450$)</li>
                    <li>Gainage — 1ère visite: 450$ fixe</li>
                    <li>Gainage — Installation: 3 900$ base + 90$/pi &gt; 10pi</li>
                    <li>Cheminées drain français: 2 500$ installation</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
