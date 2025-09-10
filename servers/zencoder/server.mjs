// Zencoder MCP Server (custom) - minimal tools for video encoding jobs
// Requires: Node 18+, dependency: @modelcontextprotocol/sdk
// Env: ZENCODER_API_KEY, ZENCODER_BASE_URL (default https://app.zencoder.com/api/v2)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const NAME = 'zencoder-mcp';
const VERSION = '0.1.0';

function baseUrl() {
  return process.env.ZENCODER_BASE_URL || 'https://app.zencoder.com/api/v2';
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

async function httpJson(path, options = {}) {
  const key = requireEnv('ZENCODER_API_KEY');
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Zencoder-Api-Key': key,
      ...(options.headers || {})
    },
    ...options,
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${msg}`);
  }
  return body;
}

function okText(text) { return { content: [{ type: 'text', text }] }; }
function okJson(obj) { return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] }; }
function errText(text) { return { isError: true, content: [{ type: 'text', text }] }; }

const server = new McpServer({ name: NAME, version: VERSION });

const CreateJobShape = { input: z.string(), outputs: z.array(z.any()).optional() };
server.tool(
  'create_job',
  'Create a Zencoder encoding job',
  CreateJobShape,
  async ({ input, outputs }) => {
    try {
      const payload = { input, outputs: outputs ?? [] };
      const data = await httpJson('/jobs', { method: 'POST', body: JSON.stringify(payload) });
      return okJson(data);
    } catch (e) {
      return errText(e.message || String(e));
    }
  }
);

const GetJobShape = { id: z.number() };
server.tool(
  'get_job',
  'Get job status by id',
  GetJobShape,
  async ({ id }) => {
    try {
      const data = await httpJson(`/jobs/${encodeURIComponent(id)}`);
      return okJson(data);
    } catch (e) {
      return errText(e.message || String(e));
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
