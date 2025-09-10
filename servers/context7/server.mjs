// Context7-like MCP Server (local docs/knowledge tooling)
// Provides simple documentation listing, reading, and search over a target directory.
// Env: CONTEXT7_DIR (default: ./docs)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

const NAME = 'context7-local';
const VERSION = '0.1.0';

function getRootDir() {
  const p = process.env.CONTEXT7_DIR || path.resolve(process.cwd(), 'docs');
  return path.resolve(p);
}

function listFiles(root, exts = ['.md', '.mdx', '.txt', '.yaml', '.yml']) {
  const files = [];
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else {
        const ext = path.extname(e.name).toLowerCase();
        if (exts.includes(ext)) files.push(full);
      }
    }
  }
  walk(root);
  return files;
}

function readTextSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    return null;
  }
}

function okText(text) { return { content: [{ type: 'text', text }] }; }
function okJson(obj) { return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] }; }
function errText(text) { return { isError: true, content: [{ type: 'text', text }] }; }

const server = new McpServer({ name: NAME, version: VERSION });

server.tool(
  'list_docs',
  'List documentation files under CONTEXT7_DIR (default ./docs) with supported extensions (.md, .mdx, .txt, .yaml, .yml).',
  {},
  async () => {
    const root = getRootDir();
    const files = listFiles(root);
    const rel = files.map(f => path.relative(root, f));
    return okJson({ root, count: rel.length, files: rel.slice(0, 5000) });
  }
);

const ReadDocShape = { file: z.string(), maxBytes: z.number().optional() };
server.tool(
  'read_doc',
  'Read a documentation file relative to CONTEXT7_DIR',
  ReadDocShape,
  async ({ file, maxBytes }) => {
    const root = getRootDir();
    const full = path.resolve(root, file);
    if (!full.startsWith(root)) return errText('Path escapes root');
    const text = readTextSafe(full);
    if (text == null) return errText('Unable to read file');
    const limit = maxBytes ?? 200_000;
    const out = text.slice(0, Math.max(0, Math.min(limit, 5_000_000)));
    return okText(out);
  }
);

const SearchShape = { query: z.string(), maxResults: z.number().optional() };
server.tool(
  'search_docs',
  'Full-text search in docs. Returns matches with file and line number.',
  SearchShape,
  async ({ query, maxResults }) => {
    const root = getRootDir();
    const files = listFiles(root);
    const results = [];
    const q = String(query);
    const cap = maxResults ?? 100;
    for (const f of files) {
      const text = readTextSafe(f);
      if (!text) continue;
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(q.toLowerCase())) {
          results.push({ file: path.relative(root, f), line: i + 1, text: lines[i].slice(0, 400) });
          if (results.length >= cap) return okJson({ root, query, results });
        }
      }
    }
    return okJson({ root, query, results });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
