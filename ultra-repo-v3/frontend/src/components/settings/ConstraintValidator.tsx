import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecureInput } from "@/components/ui/secure-input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EffectiveValueBadge from "@/components/settings/EffectiveValueBadge";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Constraint } from "@/types";

interface ConstraintValidatorProps {
  constraints: Constraint[];
  onToggle: (id: string, active: boolean) => void;
  pending?: Set<string>;
}

export default function ConstraintValidator({ constraints, onToggle, pending }: ConstraintValidatorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const pendingSet = pending ?? new Set<string>();

  const filteredConstraints = constraints.filter(constraint =>
    constraint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    constraint.condition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = constraints.filter(c => c.active).length;
  const totalCount = constraints.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Validateur de contraintes
          <div className="text-sm text-muted-foreground">
            {activeCount}/{totalCount} actives
          </div>
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <SecureInput
            placeholder="Rechercher une contrainte..."
            value={searchTerm}
            onSecureChange={(value, isValid) => isValid && setSearchTerm(value)}
            sanitizeType="text"
            className="pl-9"
            data-testid="input-search-constraints"
            showValidation={false}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Override</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead>Effectif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConstraints.map((constraint) => (
                <TableRow key={constraint.id} data-testid={`row-constraint-${constraint.id}`}>
                  <TableCell className="font-medium" data-testid={`text-constraint-name-${constraint.id}`}>
                    {constraint.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground" data-testid={`text-constraint-condition-${constraint.id}`}>
                    {constraint.condition}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground" data-testid={`text-constraint-action-${constraint.id}`}>
                    {constraint.action}
                  </TableCell>
                  <TableCell className="text-sm" data-testid={`text-constraint-base-${constraint.id}`}>
                    {constraint.baseValue !== undefined && constraint.baseValue !== null ? (
                      <Badge variant="secondary" aria-label="Valeur de base">
                        {String(constraint.baseValue)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm" data-testid={`text-constraint-override-${constraint.id}`}>
                    {constraint.overrideValue !== undefined && constraint.overrideValue !== null ? (
                      <Badge variant="outline" aria-label="Valeur override">
                        {String(constraint.overrideValue)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span aria-live="polite" className="sr-only">
                      {pendingSet.has(constraint.id) ? "Mise à jour..." : (constraint.active ? "Activée" : "Désactivée")}
                    </span>
                    {constraint.active ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={constraint.active}
                      onCheckedChange={(checked) => onToggle(constraint.id, checked)}
                      disabled={pendingSet.has(constraint.id)}
                      aria-label={`Basculer la contrainte ${constraint.name}`}
                      data-testid={`switch-constraint-${constraint.id}`}
                    />
                    {pendingSet.has(constraint.id) && (
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground ml-2" aria-live="polite">
                        <span className="inline-block h-3 w-3 rounded-full border border-muted-foreground border-t-transparent animate-spin" />
                        Mise à jour...
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm" data-testid={`text-constraint-effective-${constraint.id}`}>
                    <EffectiveValueBadge baseValue={constraint.baseValue} overrideValue={constraint.overrideValue} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
