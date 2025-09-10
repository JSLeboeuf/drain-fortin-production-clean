/**
 * Inspecte la configuration de l'assistant Vapi via l'API.
 *
 * Prérequis:
 *  - Env `VAPI_API_KEY` (obligatoire)
 *  - Env `VAPI_ASSISTANT_ID` (optionnel, sinon liste tous les assistants)
 */

// Node 18+ a fetch natif; fallback à node-fetch si absent
let fetchFn = globalThis.fetch;
if (!fetchFn) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  fetchFn = require('node-fetch');
}

const API_BASE = 'https://api.vapi.ai';

function env(name) {
  return process.env[name] && String(process.env[name]).trim();
}

function exitWith(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

async function main() {
  const apiKey = env('VAPI_API_KEY');
  const assistantId = env('VAPI_ASSISTANT_ID');

  if (!apiKey) {
    exitWith('Erreur: VAPI_API_KEY est requis pour se connecter à Vapi.');
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (!assistantId) {
    const res = await fetchFn(`${API_BASE}/assistant`, { headers });
    if (!res.ok) {
      exitWith(`Échec de la récupération des assistants: HTTP ${res.status}`);
    }
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.items || [];
    console.log('Assistants Vapi disponibles (id | name):');
    for (const a of items) {
      console.log(`- ${a.id || a.assistantId} | ${a.name}`);
    }
    if (items.length === 0) {
      console.log('(aucun assistant trouvé pour cette clé)');
    }
    return;
  }

  const res = await fetchFn(`${API_BASE}/assistant/${assistantId}`, { headers });
  if (!res.ok) {
    exitWith(`Échec de la récupération de l'assistant ${assistantId}: HTTP ${res.status}`);
  }
  const a = await res.json();

  // Mode brut si demandé
  if (process.argv.includes('--raw')) {
    console.log(JSON.stringify(a, null, 2));
    return;
  }

  // Affichage condensé et pertinent
  const out = {
    id: a.id || a.assistantId,
    name: a.name,
    phoneNumber: a.phoneNumber,
    serverUrl: a.serverUrl,
    model: a.model?.model || a.model,
    provider: a.model?.provider,
    voice: a.voice?.voiceId || a.voice,
    transcriber: a.transcriber?.provider ? `${a.transcriber.provider}:${a.transcriber.model}` : a.transcriber,
    firstMessage: a.firstMessage,
    firstMessageMode: a.firstMessageMode,
    endCallMessage: a.endCallMessage,
    backchannelingEnabled: a.backchannelingEnabled,
    backgroundDenoisingEnabled: a.backgroundDenoisingEnabled,
    clientMessages: a.clientMessages,
    serverMessages: a.serverMessages,
    transportConfigurations: a.transportConfigurations,
    endCallFunctionEnabled: a.endCallFunctionEnabled,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error('Erreur inattendue:', err);
  process.exit(1);
});
