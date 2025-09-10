/*
  DEV safety: absolute no-outbound policy for frontend.
  - Intercepts window.fetch and WebSocket
  - Fulfills same-origin /api requests with mocks (HTTP 200)
  - Aborts any cross-origin requests
  - Logs every blocked or mocked call to window.NO_OUTBOUND_LOGS
  This file is imported unconditionally by main.tsx but only activates in DEV.
*/

type LogEntry = {
  ts: string;
  kind: 'mock' | 'abort' | 'pass';
  url: string;
  method?: string;
  status?: number;
  note?: string;
};

declare global {
  interface Window {
    NO_OUTBOUND_LOGS?: LogEntry[];
    __ORIGINAL_FETCH__?: typeof fetch;
    __ORIGINAL_WEBSOCKET__?: typeof WebSocket;
  }
}

if (import.meta.env.DEV || import.meta.env.VITE_NO_OUTBOUND === '1') {
  try {
    const logs: LogEntry[] = [];
    window.NO_OUTBOUND_LOGS = logs;

    // Keep originals
    const originalFetch = window.fetch.bind(window);
    const OriginalWebSocket = window.WebSocket;
    window.__ORIGINAL_FETCH__ = originalFetch;
    window.__ORIGINAL_WEBSOCKET__ = OriginalWebSocket;

    const now = () => new Date().toISOString();
    const log = (entry: LogEntry) => {
      logs.push(entry);
      const tag = entry.kind.toUpperCase();
      // eslint-disable-next-line no-console
      console.info(`[NO-OUTBOUND] ${tag}`, entry);
    };

    // Helpers
    const toURL = (input: RequestInfo | URL, base?: string) => {
      try {
        if (typeof input === 'string') return new URL(input, base || window.location.origin);
        if (input instanceof URL) return input;
        if (input instanceof Request) return new URL(input.url, base || window.location.origin);
        return new URL(String(input), base || window.location.origin);
      } catch {
        return null;
      }
    };

    // Mock catalog (minimal but covers active pages)
    const apiMocks: Record<string, any> = {
      '/api/constraints': [
        { id: 'C026', name: 'Minimum global 350$', active: true, condition: 'prix >= 350', action: 'valider', baseValue: 350 },
        { id: 'REFUSE-PISCINE', name: 'Refuser piscines', active: true, condition: 'service == "piscine"', action: 'refuser' },
        { id: 'PRICE-RACINES', name: 'Racines min 450$', active: true, condition: 'service == "racines"', action: 'prix>=450', baseValue: 450 },
      ],
      '/api/settings': [
        { id: 'pricing', key: 'pricing', value: { base: { debouchage: 350 }, surcharges: { 'rive-sud': 100, urgence: 75 }, discounts: {} }, updatedAt: new Date().toISOString() },
        { id: 'prompts', key: 'prompts', value: { greeting: 'Bonjour, ici Paul de Drain Fortin.' }, updatedAt: new Date().toISOString() },
        { id: 'company_profile', key: 'company_profile', value: { licenses: { rbq: '1234-5678-90', cmmtq: 'C-000000' }, service_areas: { primary: ['Montréal', 'Rive-Sud'], coverage_note: 'Couverture selon disponibilité' }, technology_focus: { gps_equipment: true, eco_solutions: true, tv_inspection: true, no_dig_repair: true } }, updatedAt: new Date().toISOString() },
      ],
      '/api/settings/pricing': { id: 'pricing', key: 'pricing', value: { base: { debouchage: 350 }, surcharges: { 'rive-sud': 100, urgence: 75 }, discounts: {} }, updatedAt: new Date().toISOString() },
      '/api/settings/prompts': { id: 'prompts', key: 'prompts', value: { greeting: 'Bonjour, ici Paul de Drain Fortin.', services: {}, closing: 'Merci de votre appel!' }, updatedAt: new Date().toISOString() },
      '/api/settings/company_profile': { id: 'company_profile', key: 'company_profile', value: { licenses: { rbq: '1234-5678-90', cmmtq: 'C-000000' }, service_areas: { primary: ['Montréal', 'Rive-Sud'], coverage_note: 'Couverture selon disponibilité' }, technology_focus: { gps_equipment: true, eco_solutions: true, tv_inspection: true, no_dig_repair: true } }, updatedAt: new Date().toISOString() },
      '/api/analytics': { totalCalls: 12, answeredPct: 83, avgDuration: 312, conversionPct: 22, topIntents: [{ intent: 'debouchage', count: 5 }, { intent: 'urgence', count: 3 }] },
      '/api/analytics/dashboard': { callsToday: 7, lcpMs: 1200, p95ResponseMs: 80 },
      '/api/calls': [
        { id: 'a1', phoneNumber: '+1 514 555 0001', startTime: new Date().toISOString(), duration: 180, transcript: 'Débouchage cuisine', priority: 'P4', status: 'completed' },
      ],
      '/api/events?type=call': [],
      '/api/vapi/calls/active': [],
      '/api/vapi/metrics': { streams: 0, avgLatencyMs: 0 },
      '/api/elevenlabs/status': { connected: false, usage: { usage_percentage: 0 } },
      '/api/alerts/sla': { p1: 0, p2: 0, p3: 0, p4: 2 },
      '/api/alerts/constraints': { violations: [] },
      '/api/sms/stats': { sentToday: 0, errors: 0 },
      '/api/status': { status: 'ok', uptimeSec: 0, timestamp: new Date().toISOString(), version: 'dev' },
      // POST mocks
      'POST /api/vapi/test-call': { success: true, message: 'Appel VAPI simulé (mock)' },
      'POST /api/test-call': { cors: true, vapi: false, twilio: false, db: false },
      'POST /api/twilio/test-sms': { success: true, to: '+15145296037' },
      'GET /api/twilio/test-connection': { connected: false, message: 'Mock mode: Twilio non configuré' },
      'POST /api/constraints/validate-guillaume': { totalChecked: 10, violations: [] },
      'POST /api/sms/send': { ok: true, id: 'sms_mock_1' },
      'POST /api/email/send': { ok: true, id: 'email_mock_1' },
      'POST /api/intake/submit': { ok: true, id: 'lead_mock_1' },
    };

    // Fetch interceptor
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = toURL(input);
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      if (!url) {
        const res = new Response(null, { status: 400, statusText: 'Bad Request' });
        log({ ts: now(), kind: 'abort', url: String(input), method, status: 400, note: 'URL parse error' });
        return res;
      }

      const isCrossOrigin = url.origin !== window.location.origin;
      
      // Permettre Supabase
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const isSupabaseRequest = supabaseUrl && url.href.startsWith(supabaseUrl);
      
      if (isCrossOrigin && !isSupabaseRequest) {
        log({ ts: now(), kind: 'abort', url: url.href, method, status: 0, note: 'Cross-origin blocked' });
        return new Response(null, { status: 0, statusText: 'Blocked by NO-OUTBOUND policy' });
      }
      
      // Permettre les requêtes Supabase
      if (isSupabaseRequest) {
        log({ ts: now(), kind: 'pass', url: url.href, method, note: 'Supabase request allowed' });
        return originalFetch(input as any, init);
      }

      if (url.pathname.startsWith('/api')) {
        const keyMethodPath = `${method} ${url.pathname}${url.search || ''}`;
        const keyPath = `${url.pathname}${url.search || ''}`;
        const payload = (apiMocks as any)[keyMethodPath] ?? (apiMocks as any)[keyPath] ?? (apiMocks as any)[url.pathname] ?? { ok: true, mock: true };
        const res = new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
        log({ ts: now(), kind: 'mock', url: url.href, method, status: 200 });
        return res;
      }

      log({ ts: now(), kind: 'pass', url: url.href, method, status: 200, note: 'asset/page request' });
      return originalFetch(input as any, init);
    };

    // WebSocket mock: prevent outbound ws except localhost and simulate metrics
    class MockWebSocket {
      url: string;
      readyState: number = 1; // OPEN
      onopen: ((this: WebSocket, ev: Event) => any) | null = null;
      onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
      onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
      onerror: ((this: WebSocket, ev: Event) => any) | null = null;
      private interval?: number;

      constructor(url: string) {
        this.url = url;
        
        // Permettre les WebSocket localhost
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
          log({ ts: now(), kind: 'pass', url, method: 'WS', note: 'Localhost WebSocket allowed' });
          // Utiliser le vrai WebSocket pour localhost
          return new OriginalWebSocket(url) as any;
        }
        
        log({ ts: now(), kind: 'mock', url, method: 'WS', status: 101, note: 'WebSocket mocked OPEN' });
        setTimeout(() => this.onopen?.(new Event('open') as any), 0);
        this.interval = window.setInterval(() => {
          const msg = { type: 'metrics:update', metrics: { activeCalls: 0, p1Urgencies: 0, smsAlertsSent: 0, constraintsViolated: 0 } };
          this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(msg) }) as any);
        }, 5000);
      }
      send(_data: any) {}
      close() {
        if (this.interval) window.clearInterval(this.interval);
        this.readyState = 3; // CLOSED
        this.onclose?.(new CloseEvent('close') as any);
        log({ ts: now(), kind: 'mock', url: this.url, method: 'WS', status: 1000, note: 'WebSocket mocked CLOSE' });
      }
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
    }

    Object.defineProperty(window, 'WebSocket', { value: MockWebSocket });

    if ('sendBeacon' in navigator) {
      const orig = navigator.sendBeacon.bind(navigator);
      (navigator as any).sendBeacon = (url: string, _data?: BodyInit) => {
        const href = toURL(url)?.href || String(url);
        log({ ts: now(), kind: 'abort', url: href, method: 'BEACON', status: 0, note: 'sendBeacon blocked' });
        return false;
      };
      (navigator as any).__ORIGINAL_SEND_BEACON__ = orig;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[NO-OUTBOUND] safety layer initialization error', e);
  }
}

export {};
