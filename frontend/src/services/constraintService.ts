import { Constraint } from "@/types";
import constraintsData from "@/data/constraints.json";

export interface EnhancedConstraint extends Constraint {
  category: 'service' | 'pricing' | 'territory' | 'priority' | 'quality' | 'security' | 'data' | 'communication' | 'routing' | 'scheduling' | 'scripts' | 'technical';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  violationCount: number;
  description: string;
}

const categoryMapping: Record<string, EnhancedConstraint['category']> = {
  'C001': 'service', 'C002': 'service', 'C003': 'data', 'C004': 'data', 'C005': 'data',
  'C006': 'data', 'C007': 'data', 'C008': 'data', 'C009': 'routing', 'C010': 'routing',
  'C026': 'pricing', 'C027': 'pricing', 'C028': 'pricing', 'C029': 'pricing', 'C030': 'pricing',
  'C046': 'service', 'C047': 'service', 'C048': 'service', 'C049': 'service', 'C050': 'service',
  'C076': 'communication', 'C077': 'communication', 'C078': 'communication', 'C079': 'communication',
  'C096': 'data', 'C097': 'data', 'C098': 'data', 'C099': 'data', 'C100': 'data',
  'C106': 'priority', 'C107': 'priority', 'C108': 'priority', 'C109': 'priority', 'C110': 'priority',
  'C126': 'scheduling', 'C127': 'scheduling', 'C128': 'scheduling', 'C129': 'scheduling',
  'C136': 'scripts', 'C137': 'scripts', 'C138': 'scripts', 'C139': 'scripts',
  'C146': 'technical', 'C147': 'technical', 'C148': 'technical', 'C149': 'technical'
};

const priorityMapping: Record<string, EnhancedConstraint['priority']> = {
  'C001': 'P1', 'C002': 'P1', 'C003': 'P2', 'C004': 'P2', 'C005': 'P2',
  'C006': 'P3', 'C007': 'P1', 'C008': 'P4', 'C009': 'P1', 'C010': 'P2',
  'C026': 'P2', 'C027': 'P2', 'C028': 'P3', 'C029': 'P3', 'C030': 'P3',
  'C046': 'P1', 'C047': 'P1', 'C048': 'P1', 'C049': 'P2', 'C050': 'P2',
  'C076': 'P2', 'C077': 'P2', 'C078': 'P3', 'C079': 'P3', 'C080': 'P3',
  'C096': 'P2', 'C097': 'P2', 'C098': 'P3', 'C099': 'P3', 'C100': 'P3',
  'C106': 'P1', 'C107': 'P1', 'C108': 'P2', 'C109': 'P2', 'C110': 'P3',
  'C126': 'P3', 'C127': 'P3', 'C128': 'P4', 'C129': 'P4', 'C130': 'P4',
  'C136': 'P3', 'C137': 'P3', 'C138': 'P4', 'C139': 'P4', 'C140': 'P4',
  'C146': 'P2', 'C147': 'P2', 'C148': 'P3', 'C149': 'P3', 'C150': 'P3'
};

function getCategory(id: string): EnhancedConstraint['category'] {
  if (categoryMapping[id]) return categoryMapping[id];
  
  const num = parseInt(id.substring(1));
  if (num <= 25) return 'service';
  if (num <= 45) return 'pricing';
  if (num <= 55) return 'service';
  if (num <= 75) return 'technical';
  if (num <= 95) return 'communication';
  if (num <= 105) return 'data';
  if (num <= 125) return 'priority';
  if (num <= 135) return 'scheduling';
  if (num <= 145) return 'scripts';
  if (num <= 156) return 'technical';
  return 'quality';
}

function getPriority(id: string): EnhancedConstraint['priority'] {
  if (priorityMapping[id]) return priorityMapping[id];
  
  const num = parseInt(id.substring(1));
  if (num <= 10) return 'P1';
  if (num <= 25) return 'P2';
  if (num <= 50) return 'P1';
  if (num <= 75) return 'P3';
  if (num <= 100) return 'P2';
  if (num <= 125) return 'P1';
  return 'P3';
}

function generateCondition(title: string): string {
  if (title.includes('24/7')) return 'call_time === "any" && availability === "24h"';
  if (title.includes('nom')) return 'customer.firstName && customer.lastName';
  if (title.includes('adresse')) return 'customer.address && customer.postalCode';
  if (title.includes('téléphone')) return 'customer.phone && phone_format_valid(customer.phone)';
  if (title.includes('courriel')) return 'customer.email && email_format_valid(customer.email)';
  if (title.includes('prix')) return 'service.price >= minimum_price[service.type]';
  if (title.includes('inondation')) return 'problem.includes("inondation|déborde|dégât d\'eau")';
  return 'auto_generated_condition';
}

function generateAction(title: string, priority: string): string {
  if (title.includes('24/7')) return 'ACCEPT_CALL + LOG_TIMESTAMP';
  if (title.includes('nom')) return 'REQUEST_FULL_NAME + VALIDATE_FORMAT';
  if (title.includes('prix')) return 'APPLY_MINIMUM_PRICING + NOTIFY_GUILLAUME';
  if (title.includes('inondation')) return `SMS_GUILLAUME_IMMEDIATE + ESCALADE_${priority}`;
  if (title.includes('refus')) return 'POLITE_REFUSAL + REDIRECT_SPECIALIST';
  return 'VALIDATE_AND_PROCEED';
}

export function transformConstraintsData(): EnhancedConstraint[] {
  return constraintsData.constraints.map((item, index) => {
    const category = getCategory(item.id);
    const priority = getPriority(item.id);
    const title = item.title.replace(/^\. /, '').replace(/\*\*/g, '');
    
    return {
      id: item.id,
      name: title,
      active: priority === 'P1' || priority === 'P2', // P1/P2 actives par défaut
      condition: generateCondition(title),
      action: generateAction(title, priority),
      baseValue: null,
      overrideValue: null,
      category,
      priority,
      violationCount: Math.floor(Math.random() * 5), // Simulated violation count
      description: title
    };
  });
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