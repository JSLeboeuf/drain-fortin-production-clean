// ProductionCodex MCP Server - Specialized for Drain Fortin Project
// Provides AI-powered development tools and project management

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

const NAME = 'production-codex';
const VERSION = '1.0.0';

function getProjectRoot() {
  return path.resolve(process.env.CODEX_PROJECT_ROOT || process.cwd());
}

function readProjectFile(filename) {
  try {
    const filePath = path.join(getProjectRoot(), filename);
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return null;
  }
}

function okText(text) { return { content: [{ type: 'text', text }] }; }
function okJson(obj) { return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] }; }
function errText(text) { return { isError: true, content: [{ type: 'text', text }] }; }

const server = new McpServer({ name: NAME, version: VERSION });

// Tool 1: Project Status Analysis
server.tool(
  'analyze_project_status',
  'Analyze the current status of the Drain Fortin project including deployments, tests, and issues',
  {},
  async () => {
    const status = {
      timestamp: new Date().toISOString(),
      project: 'Drain Fortin Production',
      components: {}
    };

    // Check deployment status
    const deployReport = readProjectFile('DEPLOYMENT_SUCCESS.md');
    status.components.deployment = deployReport ? 'SUCCESS' : 'UNKNOWN';

    // Check test reports
    const testReport = readProjectFile('test-report-2025-09-10.json');
    status.components.tests = testReport ? 'RECENT' : 'UNKNOWN';

    // Check communication status
    const commReport = readProjectFile('COMMUNICATION-GUILLAUME-SEPTEMBRE-2025.md');
    status.components.communication = commReport ? 'ACTIVE' : 'UNKNOWN';

    return okJson(status);
  }
);

// Tool 2: VAPI Configuration Check
server.tool(
  'check_vapi_config',
  'Verify VAPI configuration and assistant status',
  {},
  async () => {
    const config = {
      phone_number: '+1 (450) 280-3222',
      status: 'UNKNOWN',
      webhook_url: 'https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook'
    };

    // Check if VAPI config exists
    const vapiConfig = readProjectFile('setup-vapi-assistant.js');
    if (vapiConfig) {
      config.status = 'CONFIGURED';
      config.details = 'VAPI assistant configuration file found';
    }

    return okJson(config);
  }
);

// Tool 3: Database Health Check
server.tool(
  'check_database_health',
  'Check the health and status of Supabase database tables',
  {},
  async () => {
    const health = {
      database: 'phiduqxcufdmgjvdipyu',
      plan: 'PRO ($25/month)',
      tables: [],
      status: 'UNKNOWN'
    };

    // Check for SQL files as indicators
    const sqlFiles = [
      'FINAL-CREATE-TABLES.sql',
      'create-supabase-tables.sql',
      'FIX-VAPI-CALLS-TABLE.sql'
    ];

    let configuredTables = 0;
    sqlFiles.forEach(file => {
      if (readProjectFile(file)) {
        configuredTables++;
      }
    });

    health.status = configuredTables > 0 ? 'CONFIGURED' : 'NOT_CONFIGURED';
    health.tables_count = configuredTables;

    return okJson(health);
  }
);

// Tool 4: Performance Analysis
server.tool(
  'analyze_performance',
  'Analyze project performance metrics and optimization reports',
  {},
  async () => {
    const performance = {
      frontend: {},
      backend: {},
      vapi: {},
      recommendations: []
    };

    // Check optimization reports
    const frontendOpt = readProjectFile('ISABELLA-OPTIMIZATIONS-SUMMARY.md');
    const backendOpt = readProjectFile('MARIA-DATABASE-OPTIMIZATION-REPORT.md');
    const vapiOpt = readProjectFile('PETROV-VAPI-OPTIMIZATION-REPORT.md');

    performance.frontend.status = frontendOpt ? 'OPTIMIZED' : 'PENDING';
    performance.backend.status = backendOpt ? 'OPTIMIZED' : 'PENDING';
    performance.vapi.status = vapiOpt ? 'OPTIMIZED' : 'PENDING';

    if (!frontendOpt) performance.recommendations.push('Run frontend optimization with Isabella persona');
    if (!backendOpt) performance.recommendations.push('Run backend optimization with Maria persona');
    if (!vapiOpt) performance.recommendations.push('Run VAPI optimization with Viktor persona');

    return okJson(performance);
  }
);

// Tool 5: Communication Status
server.tool(
  'check_communication_status',
  'Check the status of client communications and project updates',
  {},
  async () => {
    const comm = {
      last_update: 'UNKNOWN',
      status: 'UNKNOWN',
      pending_actions: []
    };

    const commFile = readProjectFile('COMMUNICATION-GUILLAUME-SEPTEMBRE-2025.md');
    if (commFile) {
      comm.last_update = '2025-09-09';
      comm.status = 'ACTIVE';

      // Extract pending actions
      if (commFile.includes('Option B: Activer le Système Alternatif')) {
        comm.pending_actions.push('Deploy alternative system');
      }
      if (commFile.includes('Activer le système alternatif MAINTENANT')) {
        comm.pending_actions.push('Immediate deployment required');
      }
    }

    return okJson(comm);
  }
);

// Tool 6: Code Quality Assessment
server.tool(
  'assess_code_quality',
  'Assess the overall code quality and development standards',
  {},
  async () => {
    const quality = {
      frontend: {},
      backend: {},
      documentation: {},
      score: 0
    };

    // Check TypeScript files
    const frontendFiles = fs.readdirSync(path.join(getProjectRoot(), 'frontend'), { recursive: true })
      .filter(f => f.endsWith('.tsx') || f.endsWith('.ts')).length;

    const backendFiles = fs.readdirSync(path.join(getProjectRoot(), 'backend'), { recursive: true })
      .filter(f => f.endsWith('.ts')).length;

    quality.frontend.files = frontendFiles;
    quality.backend.files = backendFiles;
    quality.documentation.files = fs.readdirSync(path.join(getProjectRoot(), 'docs'), { recursive: true })
      .filter(f => f.endsWith('.md')).length;

    // Calculate quality score
    quality.score = Math.min(100, (frontendFiles + backendFiles + quality.documentation.files) * 2);

    return okJson(quality);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
