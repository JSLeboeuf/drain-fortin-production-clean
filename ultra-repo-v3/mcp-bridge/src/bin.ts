#!/usr/bin/env node
/* eslint-disable no-console */
import { main } from './cli.js';

main().catch((e: any) => {
  console.error(`[mcp-bridge] ${e?.message ?? e}`);
  process.exit(1);
});

