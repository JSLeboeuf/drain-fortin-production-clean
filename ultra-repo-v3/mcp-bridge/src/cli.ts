/* eslint-disable no-console */
import minimist from 'minimist';
import { pathToFileURL } from 'node:url';

// MCP SDK (CJS export paths work via package "exports")
// Note: keep explicit .js suffix to leverage cjs export mapping
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { findConfig, loadConfig, formatList, normalizeRoots, parseArgsObject, serializeToolResult, type ServerSpec } from './core.js';

export async function makeClient(spec: ServerSpec): Promise<Client> {
  /** Spawn a MCP server via stdio and connect the SDK client. */
  /* c8 ignore start - IO/spawn path covered by manual integration */
  if (!spec || !spec.command) {
    throw new Error('Spécification serveur invalide: "command" requis');
  }
  const args = Array.isArray(spec.args) ? spec.args.map(String) : [];
  const env = { ...process.env, ...(spec.env || {}) } as Record<string, string>;
  const cwd = spec.cwd || process.cwd();

  const transport = new StdioClientTransport({
    command: spec.command,
    args,
    env,
    cwd,
    stderr: 'inherit',
  });

  const client = new Client({ name: 'mcp-bridge', version: '0.2.0' });
  try {
    client.registerCapabilities({ roots: { listChanged: true } as any });
  } catch {
    // ignore if already connected
  }

  const roots = normalizeRoots(spec);
  client.fallbackRequestHandler = async (request) => {
    if (process.env.MCP_BRIDGE_DEBUG) {
      console.error(`[mcp-bridge] fallbackRequestHandler: ${request.method}`);
    }
    if ((request as any).method === 'roots/list') {
      return { roots } as any;
    }
    throw new Error(`No handler for ${(request as any).method}`);
  };

  await client.connect(transport);
  try {
    await (client as any).sendRootsListChanged?.();
  } catch {
    // ignore if unsupported
  }
  return client;
  /* c8 ignore stop */
}

export async function listServers(argv: minimist.ParsedArgs): Promise<void> {
  /** Print configured servers and their command lines. */
  /* c8 ignore start - prints only */
  const configPath = findConfig(argv.config as string | undefined);
  const { servers, path: usedPath } = loadConfig(configPath);
  console.log(`Config: ${usedPath}`);
  for (const [name, spec] of Object.entries(servers)) {
    console.log(`- ${name} -> ${spec.command} ${formatList(spec.args)}`);
  }
  /* c8 ignore stop */
}

export async function listTools(argv: minimist.ParsedArgs): Promise<void> {
  /** Connect to a server and print available tools. */
  /* c8 ignore start - IO with child process */
  const [serverName] = (argv._ as string[]).slice(1);
  if (!serverName) throw new Error('Usage: mcp-bridge list-tools <server> [--config <file>]');
  const configPath = findConfig(argv.config as string | undefined);
  const { servers } = loadConfig(configPath);
  const spec = servers[serverName];
  if (!spec) throw new Error(`Serveur inconnu: ${serverName}`);
  const client = await makeClient(spec);
  try {
    const res = await (client as any).listTools();
    for (const tool of res.tools) {
      const title = tool.title ? ` (${tool.title})` : '';
      const desc = tool.description ? `\n    ${tool.description}` : '';
      console.log(`- ${tool.name}${title}${desc}`);
    }
  } finally {
    await (client as any).close?.();
  }
  /* c8 ignore stop */
}

export { findConfig, loadConfig, formatList, normalizeRoots, parseArgsObject, serializeToolResult };

export async function callTool(argv: minimist.ParsedArgs): Promise<void> {
  /** Connect to a server and invoke a tool with arguments. */
  /* c8 ignore start - IO with child process */
  const [serverName, toolName] = (argv._ as string[]).slice(1);
  if (!serverName || !toolName) {
    throw new Error('Usage: mcp-bridge call <server> <tool> [--json "{...}"] [--arg k=v] [--config <file>] [--raw]');
  }
  const configPath = findConfig(argv.config as string | undefined);
  const { servers } = loadConfig(configPath);
  const spec = servers[serverName];
  if (!spec) throw new Error(`Serveur inconnu: ${serverName}`);
  const argsObj = parseArgsObject(argv);
  const client = await makeClient(spec);
  try {
    const res = await (client as any).callTool({ name: toolName, arguments: argsObj });
    const out = serializeToolResult(res, !!argv.raw);
    console.log(out);
  } finally {
    await (client as any).close?.();
  }
  /* c8 ignore stop */
}

export async function main(): Promise<void> {
  /** CLI entry point. */
  /* c8 ignore start - CLI plumbing */
  const argv = minimist(process.argv.slice(2));
  const sub = (argv._ as string[])[0];
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
        console.log(
          'mcp-bridge - CLI pour utiliser des serveurs MCP\n\n' +
          'Usage:\n' +
          '  mcp-bridge list-servers [--config <file>]\n' +
          '  mcp-bridge list-tools <server> [--config <file>]\n' +
          "  mcp-bridge call <server> <tool> [--json '{...}'] [--arg k=v] [--config <file>] [--raw]\n\n" +
          'Options:\n' +
          '  --config <file>  Chemin du fichier de config (par défaut ./.cursor/mcp.json)\n' +
          '  --json           Données arguments au format JSON\n' +
          '  --arg k=v        Paires clé=valeur (répétables)\n' +
          '  --raw            Affiche la réponse brute JSON\n'
        );
        break;
      default:
        throw new Error(`Commande inconnue: ${sub}`);
    }
  } catch (e: any) {
    console.error(`[mcp-bridge] ${e.message}`);
    process.exit(1);
  }
  /* c8 ignore stop */
}
