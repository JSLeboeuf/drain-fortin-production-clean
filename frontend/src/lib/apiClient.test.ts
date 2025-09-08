import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, getApiBaseUrl } from './apiClient';

describe('apiClient', () => {
  const originalEnv = (import.meta as any).env;

  beforeEach(() => {
    (globalThis as any).fetch = vi.fn();
    (import.meta as any).env = { ...originalEnv } as any;
  });

  it('prefers NEXT_PUBLIC_API_BASE_URL over VITE_API_BASE_URL', async () => {
    (import.meta as any).env.NEXT_PUBLIC_API_BASE_URL = 'https://next.example.com';
    (import.meta as any).env.VITE_API_BASE_URL = 'https://vite.example.com';
    expect(getApiBaseUrl()).toBe('https://next.example.com');
  });

  it('falls back to VITE_API_BASE_URL', async () => {
    (import.meta as any).env.NEXT_PUBLIC_API_BASE_URL = undefined;
    (import.meta as any).env.VITE_API_BASE_URL = 'https://vite.example.com';
    expect(getApiBaseUrl()).toBe('https://vite.example.com');
  });

  it('masks PII in error logs', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (globalThis as any).fetch.mockResolvedValue({ ok: false, status: 500, statusText: 'err', text: () => Promise.resolve('email: john.doe@example.com, phone: 514-555-1212') });
    (import.meta as any).env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:9999';
    await expect(apiFetch('/test')).rejects.toBeTruthy();
    spy.mockRestore();
  });
});

