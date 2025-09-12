import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSETransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { GitHubTools } from './tools/github-tools.js';
import { OAuthManager } from './auth/oauth-manager.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Middleware pour parser JSON
app.use(express.json());

// Initialiser les composants MCP
const githubTools = new GitHubTools();
const oauthManager = new OAuthManager();

// Créer le serveur MCP
const server = new Server(
  {
    name: 'github-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Gérer les requêtes ListTools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Handling ListTools request');

  return {
    tools: [
      {
        name: 'search_repositories',
        description: 'Rechercher des repositories GitHub',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Terme de recherche' },
            language: { type: 'string', description: 'Langage de programmation' },
            sort: { type: 'string', enum: ['stars', 'forks', 'updated'], description: 'Tri des résultats' },
            order: { type: 'string', enum: ['asc', 'desc'], description: 'Ordre de tri' },
            per_page: { type: 'number', minimum: 1, maximum: 100, description: 'Nombre de résultats par page' }
          },
          required: ['query']
        }
      },
      {
        name: 'get_repository',
        description: 'Obtenir les détails d\'un repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Propriétaire du repository' },
            repo: { type: 'string', description: 'Nom du repository' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'list_issues',
        description: 'Lister les issues d\'un repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Propriétaire du repository' },
            repo: { type: 'string', description: 'Nom du repository' },
            state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'État des issues' },
            labels: { type: 'string', description: 'Labels à filtrer (séparés par des virgules)' },
            per_page: { type: 'number', minimum: 1, maximum: 100, description: 'Nombre d\'issues par page' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'create_issue',
        description: 'Créer une nouvelle issue',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Propriétaire du repository' },
            repo: { type: 'string', description: 'Nom du repository' },
            title: { type: 'string', description: 'Titre de l\'issue' },
            body: { type: 'string', description: 'Contenu de l\'issue' },
            labels: { type: 'array', items: { type: 'string' }, description: 'Labels à appliquer' },
            assignees: { type: 'array', items: { type: 'string' }, description: 'Personnes à assigner' }
          },
          required: ['owner', 'repo', 'title', 'body']
        }
      },
      {
        name: 'get_pull_requests',
        description: 'Obtenir les pull requests d\'un repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Propriétaire du repository' },
            repo: { type: 'string', description: 'Nom du repository' },
            state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'État des PR' },
            per_page: { type: 'number', minimum: 1, maximum: 100, description: 'Nombre de PR par page' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'get_user_profile',
        description: 'Obtenir le profil d\'un utilisateur GitHub',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Nom d\'utilisateur GitHub' }
          },
          required: ['username']
        }
      },
      {
        name: 'get_repository_contents',
        description: 'Obtenir le contenu d\'un fichier ou dossier',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Propriétaire du repository' },
            repo: { type: 'string', description: 'Nom du repository' },
            path: { type: 'string', description: 'Chemin du fichier/dossier', default: '' },
            ref: { type: 'string', description: 'Branche ou commit (défaut: main)' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'search_code',
        description: 'Rechercher du code dans GitHub',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Terme de recherche dans le code' },
            language: { type: 'string', description: 'Langage de programmation' },
            repo: { type: 'string', description: 'Limiter à un repository (format: owner/repo)' },
            filename: { type: 'string', description: 'Nom du fichier à rechercher' },
            per_page: { type: 'number', minimum: 1, maximum: 100, description: 'Nombre de résultats' }
          },
          required: ['query']
        }
      }
    ]
  };
});

// Gérer les requêtes CallTool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logger.info(`Handling CallTool request: ${name}`, { args });

  try {
    let result;

    switch (name) {
      case 'search_repositories':
        result = await githubTools.searchRepositories(args);
        break;
      case 'get_repository':
        result = await githubTools.getRepository(args);
        break;
      case 'list_issues':
        result = await githubTools.listIssues(args);
        break;
      case 'create_issue':
        result = await githubTools.createIssue(args);
        break;
      case 'get_pull_requests':
        result = await githubTools.getPullRequests(args);
        break;
      case 'get_user_profile':
        result = await githubTools.getUserProfile(args);
        break;
      case 'get_repository_contents':
        result = await githubTools.getRepositoryContents(args);
        break;
      case 'search_code':
        result = await githubTools.searchCode(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return result;
  } catch (error) {
    logger.error(`Error handling tool ${name}:`, error);
    return {
      content: [{ type: 'text', text: `Erreur: ${error.message}` }],
      isError: true
    };
  }
});

// Route pour l'authentification OAuth
app.get('/auth/github', (req, res) => {
  const authUrl = oauthManager.getAuthorizationUrl();
  res.redirect(authUrl);
});

app.get('/auth/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const token = await oauthManager.handleCallback(code as string, state as string);

    // Stocker le token en session ou retourner vers l'application cliente
    res.json({
      success: true,
      message: 'Authentification réussie',
      token: token
    });
  } catch (error) {
    logger.error('OAuth callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'authentification'
    });
  }
});

// Endpoint SSE pour MCP
app.get('/sse', (req, res) => {
  logger.info('New SSE connection established');

  // Configurer les headers SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Créer le transport SSE
  const transport = new SSETransport(res);

  // Connecter le serveur MCP au transport
  server.connect(transport).catch((error) => {
    logger.error('Failed to connect MCP server:', error);
  });

  // Gérer la déconnexion
  req.on('close', () => {
    logger.info('SSE connection closed');
  });
});

// Endpoint de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  logger.info(`🚀 MCP GitHub Server running on port ${PORT}`);
  logger.info(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
  logger.info(`🔐 OAuth: http://localhost:${PORT}/auth/github`);
  logger.info(`💚 Health: http://localhost:${PORT}/health`);
});

export default app;
