import DOMPurify from 'dompurify';
import { logger } from "@/lib/logger";
import React from 'react';

/**
 * Configuration des règles de sanitisation pour différents contextes
 */
export const SANITIZE_CONFIG = {
  // Texte pur - supprime tout HTML
  text: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },

  // Contenu basique - permet quelques balises sûres
  basic: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },

  // URLs - validation stricte
  url: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: false,
  },

  // Numéros de téléphone - format strict
  phone: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  }
} as const;

/**
 * Nettoie et valide l'entrée utilisateur selon le contexte
 */
export function sanitizeInput(
  input: string | null | undefined,
  type: keyof typeof SANITIZE_CONFIG = 'text'
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Limite de longueur maximale pour prévenir les attaques
  const MAX_LENGTH = 10000;
  if (input.length > MAX_LENGTH) {
    logger.warn('Input truncated - exceeded maximum length');
    input = input.substring(0, MAX_LENGTH);
  }

  // Sanitisation avec DOMPurify
  const sanitized = DOMPurify.sanitize(input.trim(), SANITIZE_CONFIG[type]);

  // Validation spécifique par type
  switch (type) {
    case 'phone':
      return validatePhoneNumber(sanitized);
    case 'url':
      return validateUrl(sanitized);
    default:
      return sanitized;
  }
}

/**
 * Valide et formate les numéros de téléphone
 */
function validatePhoneNumber(phone: string): string {
  // Retire tous les caractères non-numériques sauf + et -
  const cleaned = phone.replace(/[^\d+\-\s\(\)]/g, '');
  
  // Limite la longueur (format international max)
  return cleaned.length <= 20 ? cleaned : cleaned.substring(0, 20);
}

/**
 * Valide les URLs
 */
function validateUrl(url: string): string {
  try {
    // Teste si l'URL est valide
    const parsed = new URL(url);
    
    // Autorise seulement HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Valide les entrées de formulaire avec feedback utilisateur
 */
export interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  error?: string;
}

export function validateFormInput(
  input: string | null | undefined,
  type: keyof typeof SANITIZE_CONFIG = 'text',
  required = false
): ValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: !required,
      sanitized: '',
      error: required ? 'Ce champ est requis' : undefined
    };
  }

  const sanitized = sanitizeInput(input, type);

  // Vérification si le contenu a été significativement modifié
  const originalLength = input.trim().length;
  const sanitizedLength = sanitized.length;
  
  if (originalLength > 0 && sanitizedLength === 0) {
    return {
      isValid: false,
      sanitized,
      error: 'Contenu non valide détecté et supprimé'
    };
  }

  if (originalLength > sanitizedLength + 10) {
    return {
      isValid: true,
      sanitized,
      error: 'Contenu potentiellement dangereux supprimé'
    };
  }

  return {
    isValid: true,
    sanitized
  };
}

/**
 * Hook React pour la validation d'entrées en temps réel
 */
export function useSafeInput(
  initialValue = '',
  type: keyof typeof SANITIZE_CONFIG = 'text'
) {
  const [value, setValue] = React.useState(() => sanitizeInput(initialValue, type));
  const [error, setError] = React.useState<string | undefined>();

  const updateValue = React.useCallback((newValue: string) => {
    const result = validateFormInput(newValue, type);
    setValue(result.sanitized);
    setError(result.error);
  }, [type]);

  return {
    value,
    error,
    updateValue,
    isValid: !error
  };
}

// Export pour les tests
export { DOMPurify };

// FR-CA helpers
export function formatCanadianPhone(input: string): string {
  const digits = (input || '').replace(/\D/g, '').slice(0, 10);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean);
  return parts.join('-');
}

export function isValidCanadianPhone(input: string): boolean {
  return /^\d{3}-\d{3}-\d{4}$/.test(formatCanadianPhone(input));
}

export function formatPostalCodeCA(input: string): string {
  const up = (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const six = up.slice(0, 6);
  if (six.length <= 3) return six;
  return six.slice(0, 3) + ' ' + six.slice(3);
}

export function isValidPostalCodeCA(input: string): boolean {
  return /^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(formatPostalCodeCA(input));
}
