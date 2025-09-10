#!/usr/bin/env node
/* eslint-disable no-console */
const path = require('node:path');
const fs = require('node:fs');
const minimist = require('minimist');
const { pathToFileURL } = require('node:url');

// MCP SDK (CJS export)
const { Client } = require('@modelcontextprotocol/sdk/client');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

function findConfig(explicitPath) {
  const candidates = [];
  if (explicitPath) candidates.push(explicitPath);
  if (process.env.MCP_BRIDGE_CONFIG) candidates.push(process.env.MCP_BRIDGE_CONFIG);
  candidates.push(path.resolve(process.cwd(), '.cursor/mcp.json'));
  candidates.push(path.resolve(process.cwd(), 'mcp.config.json'));
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    candidates.push(path.join(home, '.cursor', 'mcp.json'));
  }
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
}

function loadConfig(configPath) {
  if (!configPath) {
    throw new Error('Aucun fichier de configuration MCP trouvé. Spécifiez --config, MCP_BRIDGE_CONFIG, ou placez ./.cursor/mcp.json');
  }
  const raw = fs.readFileSync(configPath, 'utf8');
  let json;
  try { json = JSON.parse(raw); } catch (e) {
    throw new Error(`Fichier de configuration invalide: ${configPath} (${e.message})`);
  }
  let servers = json.mcpServers || json.servers;
  if (!servers || typeof servers !== 'object') {
    throw new Error('La config doit contenir un objet "mcpServers" ou "servers".');
  }
  return { path: configPath, servers };
}

function formatList(val) {
  return Array.isArray(val) ? val.join(' ') : String(val ?? '');
}

function normalizeRoots(spec) {
  // Accept roots as array of strings or {uri,name}
  const roots = [];
  if (Array.isArray(spec.roots)) {
    for (const r of spec.roots) {
      if (!r) continue;
      if (typeof r === 'string') {
        const uri = pathToFileURL(path.resolve(r)).toString();
        roots.push({ uri });
      } else if (r.uri) {
        // Keep as-is if it's a file URI; otherwise try to convert from path
        const uri = r.uri.startsWith('file://') ? r.uri : pathToFileURL(path.resolve(r.uri)).toString();
        roots.push({ uri, name: r.name });
      }
    }
  }
  if (roots.length === 0) {
    // Fallback to current working directory
    roots.push({ uri: pathToFileURL(path.resolve(spec.cwd || process.cwd())).toString(), name: 'workspace' });
  }
  return roots;
}

async function makeClient(spec) {
  if (!spec || !spec.command) {
    throw new Error('Spécification serveur invalide: "command" requis');
  }
  const args = Array.isArray(spec.args) ? spec.args.map(String) : [];
  const env = { ...process.env, ...(spec.env || {}) };
  const cwd = spec.cwd || process.cwd();

  const transport = new StdioClientTransport({
    command: spec.command,
    args,
    env,
    cwd,
    stderr: 'inherit',
  });

  const client = new Client({ name: 'mcp-bridge', version: '0.1.0' });
  // Advertise roots capability and serve roots/list
  try {
    client.registerCapabilities({ roots: { listChanged: true } });
  } catch {}
  const roots = normalizeRoots(spec);
  client.fallbackRequestHandler = async (request) => {
    if (process.env.MCP_BRIDGE_DEBUG) {
      console.error(`[mcp-bridge] fallbackRequestHandler: ${request.method}`);
    }
    if (request.method === 'roots/list') {
      return { roots };
    }
    throw new Error(`No handler for ${request.method}`);
  };

  await client.connect(transport);
  // Notify roots list changed at startup
  try { await client.sendRootsListChanged(); } catch {}
  return client;
}

async function listServers(cmd) {
  const configPath = findConfig(cmd.config);
  const { servers, path: usedPath } = loadConfig(configPath);
  console.log(`Config: ${usedPath}`);
  for (const [name, spec] of Object.entries(servers)) {
    console.log(`- ${name} -> ${spec.command} ${formatList(spec.args)}`);
  }
}

async function listTools(cmd) {
  const [serverName] = cmd._.slice(1);
  if (!serverName) throw new Error('Usage: mcp-bridge list-tools <server> [--config <file>]');
  const configPath = findConfig(cmd.config);
  const { servers } = loadConfig(configPath);
  const spec = servers[serverName];
  if (!spec) throw new Error(`Serveur inconnu: ${serverName}`);
  const client = await makeClient(spec);
  try {
    const res = await client.listTools();
    for (const tool of res.tools) {
      const title = tool.title ? ` (${tool.title})` : '';
      const desc = tool.description ? `\n    ${tool.description}` : '';
      console.log(`- ${tool.name}${title}${desc}`);
    }
  } finally {
    await client.close?.();
  }
}

function parseArgsObject(cmd) {
  const out = {};
  // --json '{...}'
  if (cmd.json) {
    try { return JSON.parse(cmd.json); } catch (e) { throw new Error(`--json invalide: ${e.message}`); }
  }
  // --arg key=value (multi)
  const kv = cmd.arg ? (Array.isArray(cmd.arg) ? cmd.arg : [cmd.arg]) : [];
  for (const pair of kv) {
    const idx = String(pair).indexOf('=');
    if (idx <= 0) throw new Error(`Argument --arg attendu sous forme key=value, reçu: ${pair}`);
    const key = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    // Try to parse numbers/booleans/json
    let parsed = value;
    if (/^(true|false)$/i.test(value)) parsed = value.toLowerCase() === 'true';
    else if (!isNaN(Number(value)) && value.trim() !== '') parsed = Number(value);
    else if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
      try { parsed = JSON.parse(value); } catch {}
    }
    out[key] = parsed;
  }
  return out;
}

function serializeToolResult(result, raw) {
  if (raw) return JSON.stringify(result);
  // Friendly summarization
  const parts = [];
  if (result.isError) parts.push('[ERROR]');
  if (Array.isArray(result.content)) {
    for (const c of result.content) {
      if (c.type === 'text' && c.text != null) parts.push(c.text);
      else if (c.type === 'resource' && c.text != null) parts.push(c.text);
      else if (c.type === 'resource' && c.uri) parts.push(`${c.uri}`);
      else if (c.type === 'resource_link' && c.uri) parts.push(`${c.uri}`);
      else parts.push(JSON.stringify(c));
    }
  }
  if (result.data !== undefined) {
    parts.push(JSON.stringify(result.data));
  }
  return parts.join('\n');
}

async function callTool(cmd) {
  const [serverName, toolName] = cmd._.slice(1);
  if (!serverName || !toolName) {
    throw new Error('Usage: mcp-bridge call <server> <tool> [--json "{...}"] [--arg k=v] [--config <file>] [--raw]');
  }
  const configPath = findConfig(cmd.config);
  const { servers } = loadConfig(configPath);
  const spec = servers[serverName];
  if (!spec) throw new Error(`Serveur inconnu: ${serverName}`);
  const argsObj = parseArgsObject(cmd);
  const client = await makeClient(spec);
  try {
    const res = await client.callTool({ name: toolName, arguments: argsObj });
    const out = serializeToolResult(res, !!cmd.raw);
    console.log(out);
  } finally {
    await client.close?.();
  }
}

async function main() {
  const argv = minimist(process.argv.slice(2));
  const sub = argv._[0];
  try {
    switch (sub) {
      case 'list-servers':
        await listServers(argv);
        break;
      case 'list-tools':
        await listTools(argv);
        break;
      case 'call':
        await callTool(argv);
        break;
      case 'help':
      case undefined:
        console.log(`mcp-bridge - CLI pour utiliser des serveurs MCP\n\n` +
          `Usage:\n` +
          `  mcp-bridge list-servers [--config <file>]\n` +
          `  mcp-bridge list-tools <server> [--config <file>]\n` +
          `  mcp-bridge call <server> <tool> [--json '{...}'] [--arg k=v] [--config <file>] [--raw]\n\n` +
          `Options:\n` +
          `  --config <file>  Chemin du fichier de config (par défaut ./.cursor/mcp.json)\n` +
          `  --json           Données arguments au format JSON\n` +
          `  --arg k=v        Paires clé=valeur (répétables)\n` +
          `  --raw            Affiche la réponse brute JSON\n`);
        break;
      default:
        throw new Error(`Commande inconnue: ${sub}`);
    }
  } catch (e) {
    console.error(`[mcp-bridge] ${e.message}`);
    process.exit(1);
  }
}

main();
