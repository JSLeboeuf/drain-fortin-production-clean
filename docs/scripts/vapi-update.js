/**
 * Met à jour l'assistant Vapi avec des optimisations de performance
 * sans modifier la voix ni le transcriber.
 *
 * Usage:
 *  env VAPI_API_KEY=... VAPI_ASSISTANT_ID=... node scripts/vapi-update.js
 */

let fetchFn = globalThis.fetch;
if (!fetchFn) fetchFn = require('node-fetch');

const API_BASE = 'https://api.vapi.ai';

function env(name) {
  return process.env[name] && String(process.env[name]).trim();
}

async function request(method, path, body, headers) {
  const res = await fetchFn(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
  return { ok: res.ok, status: res.status, json, text };
}

async function main() {
  const apiKey = env('VAPI_API_KEY');
  const assistantId = env('VAPI_ASSISTANT_ID');
  if (!apiKey || !assistantId) {
    console.error('Erreur: VAPI_API_KEY et VAPI_ASSISTANT_ID sont requis.');
    process.exit(1);
  }
  const headers = { Authorization: `Bearer ${apiKey}` };

  // Lire la config actuelle
  const getRes = await request('GET', `/assistant/${assistantId}`, null, headers);
  if (!getRes.ok) {
    console.error(`Échec GET assistant: HTTP ${getRes.status}`, getRes.text);
    process.exit(1);
  }
  const current = getRes.json || {};

  // Construire la mise à jour (partielle) SANS toucher voice/transcriber
  const update = {
    maxDurationSeconds: 900,
    silenceTimeoutSeconds: 25,
    responseDelaySeconds: 0,
    llmRequestDelaySeconds: 0,
    modelOutputInMessagesEnabled: false,
    model: {
      // Conserver provider et model si présents
      provider: current?.model?.provider,
      model: current?.model?.model,
      temperature: 0.1,
      maxTokens: 200,
      numFastTurns: 3,
    },
    // startSpeakingPlan: garder endpointing vapi; ne pas altérer autres parties
    startSpeakingPlan: current.startSpeakingPlan?.smartEndpointingPlan
      ? { smartEndpointingPlan: current.startSpeakingPlan.smartEndpointingPlan }
      : undefined,
  };

  // Nettoyage: retirer clés undefined pour PATCH propre
  function prune(obj) {
    if (Array.isArray(obj)) return obj.map(prune);
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) continue;
        out[k] = prune(v);
      }
      return out;
    }
    return obj;
  }
  const payload = prune(update);

  // PATCH préféré; fallback PUT si nécessaire
  let upd = await request('PATCH', `/assistant/${assistantId}`, payload, headers);
  if (!upd.ok && upd.status === 405) {
    upd = await request('PUT', `/assistant/${assistantId}`, payload, headers);
  }
  if (!upd.ok) {
    console.error(`Échec UPDATE assistant: HTTP ${upd.status}`, upd.text || upd.json);
    process.exit(1);
  }

  // Vérifier
  const verify = await request('GET', `/assistant/${assistantId}`, null, headers);
  if (!verify.ok) {
    console.error(`Échec GET post-update: HTTP ${verify.status}`, verify.text);
    process.exit(1);
  }

  const a = verify.json || {};
  const summary = {
    id: a.id || a.assistantId,
    model: a.model?.model,
    provider: a.model?.provider,
    temperature: a.model?.temperature,
    maxTokens: a.model?.maxTokens,
    numFastTurns: a.model?.numFastTurns,
    silenceTimeoutSeconds: a.silenceTimeoutSeconds,
    responseDelaySeconds: a.responseDelaySeconds,
    llmRequestDelaySeconds: a.llmRequestDelaySeconds,
    maxDurationSeconds: a.maxDurationSeconds,
    modelOutputInMessagesEnabled: a.modelOutputInMessagesEnabled,
  };
  console.log(JSON.stringify({ updated: true, summary }, null, 2));
}

main().catch((err) => {
  console.error('Erreur inattendue:', err);
  process.exit(1);
});

