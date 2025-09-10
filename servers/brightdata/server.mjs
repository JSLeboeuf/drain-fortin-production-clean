// Bright Data MCP Server (custom) - exposes minimal tools for datasets and crawlers
// Requires: Node 18+, dependency: @modelcontextprotocol/sdk
// Env: BRIGHTDATA_API_TOKEN

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const NAME = 'brightdata-mcp';
const VERSION = '0.1.0';
const API = 'https://api.brightdata.com';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

async function httpJson(url, options = {}) {
  const token = requireEnv('BRIGHTDATA_API_TOKEN');
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
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

function okText(text) {
  return { content: [{ type: 'text', text }] };
}

function okJson(obj) {
  return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
}

function errText(text) {
  return { isError: true, content: [{ type: 'text', text }] };
}

const server = new McpServer({ name: NAME, version: VERSION });

const PageShape = { limit: z.number().optional(), offset: z.number().optional() };
server.tool(
  'list_datasets',
  'List Bright Data datasets (first page)',
  PageShape,
  async ({ limit, offset }) => {
    try {
      const lim = limit ?? 50;
      const off = offset ?? 0;
      const data = await httpJson(`${API}/datasets/v3/datasets?limit=${encodeURIComponent(lim)}&offset=${encodeURIComponent(off)}`);
      return okJson(data);
    } catch (e) {
      return errText(e.message || String(e));
    }
  }
);

const DatasetShape = { dataset_id: z.string(), limit: z.number().optional(), offset: z.number().optional(), format: z.string().optional() };
server.tool(
  'get_dataset',
  'Fetch dataset items by dataset_id',
  DatasetShape,
  async ({ dataset_id, limit, offset, format }) => {
    try {
      const lim = limit ?? 100;
      const off = offset ?? 0;
      const fmt = format ?? 'json';
      const data = await httpJson(`${API}/datasets/v3/data/${encodeURIComponent(dataset_id)}?format=${encodeURIComponent(fmt)}&limit=${encodeURIComponent(lim)}&offset=${encodeURIComponent(off)}`);
      return okJson(data);
    } catch (e) {
      return errText(e.message || String(e));
    }
  }
);

const CrawlerShape = { crawler_id: z.string() };
server.tool(
  'get_crawler',
  'Get crawler details by crawler_id',
  CrawlerShape,
  async ({ crawler_id }) => {
    try {
      const data = await httpJson(`${API}/crawler/v2/crawlers/${encodeURIComponent(crawler_id)}`);
      return okJson(data);
    } catch (e) {
      return errText(e.message || String(e));
    }
  }
);

server.tool(
  'start_crawler',
  'Start a crawler by crawler_id',
  CrawlerShape,
  async ({ crawler_id }) => {
    try {
      const data = await httpJson(`${API}/crawler/v2/crawlers/${encodeURIComponent(crawler_id)}/start`, { method: 'POST' });
      return okJson(data);
    } catch (e) {
      return errText(e.message || String(e));
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
