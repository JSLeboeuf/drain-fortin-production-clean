MCP Bridge (CLI)

Un petit CLI pour se connecter à des serveurs MCP (stdio) et exécuter leurs outils depuis le terminal.

Installation locale
- Dépendances: Node >= 18
- Le projet embarque `@modelcontextprotocol/sdk` et `minimist`.

Commandes
- `mcp-bridge list-servers [--config <file>]`
- `mcp-bridge list-tools <server> [--config <file>]`
- `mcp-bridge call <server> <tool> [--json '{...}'] [--arg k=v] [--config <file>] [--raw]`

Configuration
Le bridge cherche une configuration MCP au format Cursor ou générique:
- Cursor: `{ "mcpServers": { "name": { "command": "...", "args": ["..."], "env": { ... } } } }`
- Générique: `{ "servers": { "name": { "command": "...", "args": ["..."], "env": { ... }, "roots": ["./path", {"uri":"file:///...","name":"workspace"}] } } }`

Ordre de recherche:
1. `--config <fichier>`
2. `MCP_BRIDGE_CONFIG`
3. `./.cursor/mcp.json`
4. `./mcp.config.json`
5. `~/.cursor/mcp.json`

Exemple (inclus): `mcp.config.json` avec `@modelcontextprotocol/server-filesystem`.

Examples
- `node dist/bin.js list-servers --config mcp.config.json`
- `node dist/bin.js list-tools fs --config mcp.config.json`
- `node dist/bin.js call fs list_directory --config mcp.config.json --arg path=.`

Débogage
- `MCP_BRIDGE_DEBUG=1` pour tracer les requêtes de type `roots/list`.

Développement
- TypeScript strict
- Tests: Vitest, couverture > 90%
- Build: `npm run build`
- Tests: `npm test`
