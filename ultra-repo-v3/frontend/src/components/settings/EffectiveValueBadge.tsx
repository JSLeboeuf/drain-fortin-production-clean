import { Badge } from "@/components/ui/badge";

export default function EffectiveValueBadge({ baseValue, overrideValue }: { baseValue?: any; overrideValue?: any }) {
  const effective = overrideValue ?? baseValue;
  const label = `Valeur effective: ${effective !== undefined && effective !== null ? String(effective) : 'non définie'}`;
  return (
    <Badge variant="secondary" title="Valeur effective (lecture seule)" aria-label={label}>
      {effective !== undefined && effective !== null ? String(effective) : "—"}
    </Badge>
  );
}
