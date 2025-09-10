import { Constraint } from "@/types";
import { apiClient, Paginated } from "@/lib/apiClient";

export interface EnhancedConstraint extends Constraint {
  category: 'service' | 'pricing' | 'territory' | 'priority' | 'quality' | 'security' | 'data' | 'communication' | 'routing' | 'scheduling' | 'scripts' | 'technical';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  violationCount: number; // fourni par backend ou 0 par défaut
  description?: string;
}

// Récupération depuis backend (pas d'heuristiques, pas d'aléatoire)
export async function fetchConstraints(params?: { page?: number; pageSize?: number; search?: string; category?: string; priority?: 'P1'|'P2'|'P3'|'P4'; sort?: string; }): Promise<Paginated<EnhancedConstraint> | { items: EnhancedConstraint[] }> {
  const res = await apiClient.constraints.list(params);
  if (Array.isArray(res)) {
    return { items: (res as any[]).map(normalizeItem) as EnhancedConstraint[] } as any;
  }
  (res as any).items = (res as any).items.map(normalizeItem);
  return res as Paginated<EnhancedConstraint>;
}

function normalizeItem(item: any): EnhancedConstraint {
  return {
    id: String(item.id),
    name: String(item.name ?? item.title ?? item.id),
    active: Boolean(item.active),
    condition: String(item.condition ?? ''),
    action: String(item.action ?? ''),
    baseValue: item.baseValue ?? null,
    overrideValue: item.overrideValue ?? null,
    category: item.category,
    priority: item.priority,
    violationCount: typeof item.violationCount === 'number' ? item.violationCount : 0,
    description: item.description ?? item.name ?? undefined,
  } as EnhancedConstraint;
}

export function getConstraintsByCategory(constraints: EnhancedConstraint[]) {
  return constraints.reduce((acc, constraint) => {
    if (!acc[constraint.category]) {
      acc[constraint.category] = [];
    }
    acc[constraint.category].push(constraint);
    return acc;
  }, {} as Record<string, EnhancedConstraint[]>);
}

export function getConstraintStats(constraints: EnhancedConstraint[]) {
  const total = constraints.length;
  const active = constraints.filter(c => c.active).length;
  const byCategory = getConstraintsByCategory(constraints);
  const byPriority = constraints.reduce((acc, c) => {
    acc[c.priority] = (acc[c.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total,
    active,
    inactive: total - active,
    activationRate: total > 0 ? Math.round((active / total) * 100) : 0,
    byCategory: Object.entries(byCategory).map(([cat, items]) => ({
      category: cat,
      total: items.length,
      active: items.filter(i => i.active).length
    })),
    byPriority
  };
}

