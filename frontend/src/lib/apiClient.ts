/**
 * Client API typé pour le frontend (compatible Next.js/Vite)
 * - Base URL: NEXT_PUBLIC_API_BASE_URL ou VITE_API_BASE_URL
 * - Masquage PII dans les logs d'erreurs
 * - Gestion d'erreurs uniforme
 */
import { logger } from '@/lib/logger';

export function getApiBaseUrl(): string {
  const env: any = (import.meta as any).env || {};
  return String(env.NEXT_PUBLIC_API_BASE_URL || env.VITE_API_BASE_URL || 'http://localhost:8080');
}

const API_BASE_URL = getApiBaseUrl();

function maskPII(input: unknown): unknown {
  try {
    if (!input) return input;
    const s = typeof input === 'string' ? input : JSON.stringify(input);
    let out = s.replace(/([A-Z0-9._%+-])[A-Z0-9._%+-]*(@[A-Z0-9.-]+\.[A-Z]{2,})/gi, '$1***$2');
    out = out.replace(/(\+?\d{1,3}[\s.-]?)?(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{4})/g, (_m, _c, a) => `${a}-***-****`);
    return typeof input === 'string' ? out : JSON.parse(out);
  } catch {
    return input;
  }
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      credentials: 'include',
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn('[API] Réponse non OK', { url, status: res.status });
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    logger.error('[API] Échec requête', { url, error: maskPII(error as any) });
    throw error;
  }
}

// Pagination générique
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const apiClient = {
  get constraints() {
    return {
      list: async (params?: { page?: number; pageSize?: number; search?: string; category?: string; priority?: 'P1'|'P2'|'P3'|'P4'; sort?: string; }) => {
        const q = new URLSearchParams();
        if (params?.page) q.set('page', String(params.page));
        if (params?.pageSize) q.set('pageSize', String(params.pageSize));
        if (params?.search) q.set('search', params.search);
        if (params?.category) q.set('category', params.category);
        if (params?.priority) q.set('priority', params.priority);
        if (params?.sort) q.set('sort', params.sort);
        const endpoint = `/api/constraints${q.toString() ? `?${q}` : ''}`;
        return apiFetch<any>(endpoint);
      }
    };
  }
};

export default apiClient;

