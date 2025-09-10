import { PhoneCall, MessageSquare, Siren } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

export default function QuickActions() {
  const callGuillaume = () => { track('p1_call'); window.open("tel:+15145296037", "_self"); };
  const smsP1 = () => {
    track('p1_sms');
    const text = encodeURIComponent("URGENT P1 – Refoulement/Inondation: rappel immédiat requis. Merci.");
    window.open(`sms:+15145296037?&body=${text}`, "_self");
  };
  const smsMunicipal = () => {
    const text = encodeURIComponent("P2 Municipal/Commercial – nouveau dossier à traiter (<2 min). Merci.");
    window.open(`sms:+15145296037?&body=${text}`, "_self");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions rapides</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2 flex-wrap">
        <Button onClick={callGuillaume} className="btn-primary-gradient">
          <PhoneCall className="h-4 w-4 mr-2" /> Appeler Guillaume
        </Button>
        <Button variant="outline" onClick={smsP1}>
          <Siren className="h-4 w-4 mr-2" /> SMS Urgence P1
        </Button>
        <Button variant="outline" onClick={smsMunicipal}>
          <MessageSquare className="h-4 w-4 mr-2" /> SMS Municipal P2
        </Button>
      </CardContent>
    </Card>
  );
}
