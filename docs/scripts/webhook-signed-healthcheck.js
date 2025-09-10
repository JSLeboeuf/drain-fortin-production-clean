/**
 * Envoie un health-check signé (HMAC) vers le webhook Vapi (Supabase).
 *
 * Prérequis env:
 *  - VAPI_WEBHOOK_SECRET (obligatoire)
 *  - WEBHOOK_URL (facultatif, sinon lit depuis assistant exporté)
 *  - Optionnel: CALL_ID pour tracer
 *
 * Usage:
 *  VAPI_WEBHOOK_SECRET=xxx WEBHOOK_URL=https://... node scripts/webhook-signed-healthcheck.js
 */

const crypto = require('crypto');
let fetchFn = globalThis.fetch;
if (!fetchFn) fetchFn = require('node-fetch');

function env(name) { return process.env[name] && String(process.env[name]).trim(); }

async function main() {
  const secret = env('VAPI_WEBHOOK_SECRET');
  let url = env('WEBHOOK_URL');
  if (!url) {
    // fallback: lire depuis l'export assistant
    try {
      const a = require('../.vapi-cli/assistant-after.json');
      url = a?.server?.url;
    } catch {}
  }
  if (!secret || !url) {
    console.error('Erreur: VAPI_WEBHOOK_SECRET et WEBHOOK_URL sont requis (ou assistant-after.json doit exister)');
    process.exit(1);
  }

  const body = {
    type: 'health-check',
    timestamp: new Date().toISOString(),
    call: { id: env('CALL_ID') || 'test-call-' + Date.now() },
  };
  const raw = JSON.stringify(body);
  const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const signature = `hmac-sha256=${hmac}`;

  const headers = {
    'Content-Type': 'application/json',
    'x-vapi-signature': signature,
  };

  const t0 = Date.now();
  const res = await fetchFn(url, { method: 'POST', headers, body: raw });
  const t1 = Date.now();
  const text = await res.text();
  console.log(JSON.stringify({ status: res.status, ms: t1 - t0, body: text }, null, 2));
}

main().catch((e) => { console.error('Erreur:', e); process.exit(1); });

