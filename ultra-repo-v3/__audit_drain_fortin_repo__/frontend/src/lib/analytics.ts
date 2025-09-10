export function track(event: string, props: Record<string, any> = {}) {
  try {
    const payload = { type: event, ts: new Date().toISOString(), props };
    // store locally
    const key = 'UX_EVENTS';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push(payload);
    localStorage.setItem(key, JSON.stringify(arr).slice(-5000));
    // best-effort send
    fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
  } catch {}
}

export function readLocalEvents() {
  try { return JSON.parse(localStorage.getItem('UX_EVENTS') || '[]'); } catch { return []; }
}

export function clearLocalEvents() { localStorage.removeItem('UX_EVENTS'); }

