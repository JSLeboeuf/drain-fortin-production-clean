import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const smsTemplates = [
  { id: "p1", name: "Urgence P1", text: "URGENT P1 — Refoulement/Inondation détecté. Rappel immédiat requis. Merci." },
  { id: "p2", name: "Municipal/Commercial", text: "P2 Municipal/Commercial — nouveau dossier. Intervention < 2 min. Merci." },
  { id: "p3", name: "Gainage", text: "P3 Gainage — rappel dans 24h pour planifier la visite." },
  { id: "p4", name: "Standard", text: "P4 — Nous vous recontactons dans 30 minutes. Merci!" },
];

export default function Templates() {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(smsTemplates[0].text);

  const sendSms = async () => {
    try {
      await apiRequest("POST", "/api/sms/send", { to: phone, body: message });
      toast({ title: "SMS envoyé", description: "Message transmis." });
    } catch (e: any) {
      toast({ title: "Erreur SMS", description: e?.message || "Échec d’envoi.", variant: "destructive" });
    }
  };

  const sendEmail = async () => {
    try {
      await apiRequest("POST", "/api/email/send", { to: email, subject: "Drain Fortin", body: message });
      toast({ title: "Courriel envoyé", description: "Message transmis." });
    } catch (e: any) {
      toast({ title: "Erreur courriel", description: e?.message || "Échec d’envoi.", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header title="Modèles de messages" subtitle="SMS / Email pour actions rapides" />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Modèles prédéfinis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {smsTemplates.map(t => (
                    <Button key={t.id} variant="outline" onClick={() => setMessage(t.text)}>{t.name}</Button>
                  ))}
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={8} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Envoi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>SMS à</Label>
                  <Input placeholder="514 555 1234" value={phone} onChange={e => setPhone(e.target.value)} />
                  <div className="mt-2"><Button onClick={sendSms}>Envoyer SMS</Button></div>
                </div>
                <div>
                  <Label>Email à</Label>
                  <Input placeholder="prenom.nom@exemple.com" value={email} onChange={e => setEmail(e.target.value)} />
                  <div className="mt-2"><Button variant="outline" onClick={sendEmail}>Envoyer Email</Button></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

