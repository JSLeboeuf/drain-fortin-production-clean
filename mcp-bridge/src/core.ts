import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import type minimist from 'minimist';

export type ServerSpec = {
  /** Command to spawn the MCP server (e.g., `node`, `npx`, binary path). */
  command: string;
  /** Arguments passed to the command. */
  args?: string[];
  /** Environment variables for the spawned process. */
  env?: Record<string, string>;
  /** Working directory for the spawned process. */
  cwd?: string;
  /** Optional list of root directories (paths or file:// URIs) to expose via roots/list. */
  roots?: Array<string | { uri: string; name?: string }>;
};

export type BridgeConfig = {
  path: string;
  servers: Record<string, ServerSpec>;
};

export function findConfig(explicitPath?: string | null): string | null {
  /**
   * Locate a MCP configuration file from (in order):
   * 1) explicit CLI flag
   * 2) MCP_BRIDGE_CONFIG env var
   * 3) ./.cursor/mcp.json
   * 4) ./mcp.config.json
   * 5) ~/.cursor/mcp.json
   */
  const candidates: Array<string | null | undefined> = [];
  if (explicitPath) candidates.push(explicitPath);
  candidates.push(process.env.MCP_BRIDGE_CONFIG);
  candidates.push(path.resolve(process.cwd(), '.cursor/mcp.json'));
  candidates.push(path.resolve(process.cwd(), 'mcp.config.json'));
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    candidates.push(path.join(home, '.cursor', 'mcp.json'));
  }
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export function loadConfig(configPath: string | null): BridgeConfig {
  /**
   * Load and normalize a MCP configuration containing either `mcpServers` (Cursor) or `servers`.
   * Throws on missing config or invalid/missing structure.
   */
  if (!configPath) {
    throw new Error('Aucun fichier de configuration MCP trouvé. Spécifiez --config, MCP_BRIDGE_CONFIG, ou placez ./.cursor/mcp.json');
  }
  const raw = fs.readFileSync(configPath, 'utf8');
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch (e: any) {
    throw new Error(`Fichier de configuration invalide: ${configPath} (${e.message})`);
  }
  const servers: Record<string, ServerSpec> | undefined = json.mcpServers || json.servers;
  if (!servers || typeof servers !== 'object') {
    throw new Error('La config doit contenir un objet "mcpServers" ou "servers".');
  }
  return { path: configPath, servers };
}

export function formatList(val: unknown): string {
  /** Format arrays as space-separated strings, otherwise toString(). */
  return Array.isArray(val) ? val.join(' ') : String(val ?? '');
}

export function normalizeRoots(spec: ServerSpec): Array<{ uri: string; name?: string }> {
  /** Convert roots to file:// URIs, fallback to cwd if unset. */
  const roots: Array<{ uri: string; name?: string }> = [];
  if (Array.isArray(spec.roots)) {
    for (const r of spec.roots) {
      if (!r) continue;
      if (typeof r === 'string') {
        const uri = pathToFileURL(path.resolve(r)).toString();
        roots.push({ uri });
      } else if ((r as any).uri) {
        const uri = (r as any).uri.startsWith('file://') ? (r as any).uri : pathToFileURL(path.resolve((r as any).uri)).toString();
        roots.push({ uri, name: (r as any).name });
      }
    }
  }
  if (roots.length === 0) {
    roots.push({ uri: pathToFileURL(path.resolve(spec.cwd || process.cwd())).toString(), name: 'workspace' });
  }
  return roots;
}

export function parseArgsObject(argv: minimist.ParsedArgs): Record<string, unknown> {
  /** Parse CLI args from --json or repeated --arg key=value flags. */
  const out: Record<string, unknown> = {};
  if ((argv as any).json) {
    try {
      return JSON.parse(String((argv as any).json));
    } catch (e: any) {
      throw new Error(`--json invalide: ${e.message}`);
    }
  }
  const kv = (argv as any).arg ? (Array.isArray((argv as any).arg) ? (argv as any).arg : [(argv as any).arg]) : [];
  for (const pair of kv) {
    const s = String(pair);
    const idx = s.indexOf('=');
    if (idx <= 0) throw new Error(`Argument --arg attendu sous forme key=value, reçu: ${pair}`);
    const key = s.slice(0, idx);
    const value = s.slice(idx + 1);
    let parsed: unknown = value;
    if (/^(true|false)$/i.test(value)) parsed = value.toLowerCase() === 'true';
    else if (!isNaN(Number(value)) && value.trim() !== '') parsed = Number(value);
    else if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
      try { parsed = JSON.parse(value); } catch { /* leave as string */ }
    }
    out[key] = parsed;
  }
  return out;
}

export function serializeToolResult(result: any, raw: boolean): string {
  /**
   * Render a MCP tool result into a user-friendly string (or raw JSON if `raw`).
   */
  if (raw) return JSON.stringify(result);
  const parts: string[] = [];
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
