import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { readLocalEvents, clearLocalEvents } from '@/lib/analytics';

export default function UxKpiPanel() {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => { setEvents(readLocalEvents()); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of events) c[e.type] = (c[e.type] || 0) + 1;
    return c;
  }, [events]);

  const reset = () => { clearLocalEvents(); setEvents([]); };

  return (
    <Card>
      <CardHeader>
        <CardTitle>KPI UX (local)</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Intake" value={counts['intake_submit'] || 0} />
          <Kpi label="P1 Appel" value={counts['p1_call'] || 0} />
          <Kpi label="P1 SMS" value={counts['p1_sms'] || 0} />
          <Kpi label="Pricing" value={counts['pricing_compute'] || counts['pricing_view'] || 0} />
        </div>
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={reset}>Réinitialiser</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 border rounded-md">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

