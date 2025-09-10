MCP Servers Configuration (Project)

Active servers (mcp.config.json):

- fs: Filesystem access (server-filesystem)
  - env: ROOT
- context7: Documentation/knowledge tooling (Context7 MCP)
  - env: CONTEXT7_CACHE_DIR
- playwright: Browser automation (Playwright MCP)
- github: GitHub integration (issues/PRs/repos)
  - env: GITHUB_TOKEN, GITHUB_API_URL
- database: Database access (PostgreSQL, etc.)
  - env: DATABASE_URL, DB_SSL
- slack: Slack integration (messages, channels)
  - env: SLACK_BOT_TOKEN, SLACK_APP_TOKEN
- docker: Docker execution (containers)
- brightdata: Bright Data API (datasets/crawlers)
  - env: BRIGHTDATA_API_TOKEN
  - tools: list_datasets, get_dataset, get_crawler, start_crawler
- zencoder: Zencoder API (video encoding)
  - env: ZENCODER_API_KEY, ZENCODER_BASE_URL (default https://app.zencoder.com/api/v2)
  - tools: create_job, get_job

Usage (from CLI):

- List servers: `node mcp-bridge/bin/mcp-bridge.js list-servers --config mcp.config.json`
- List tools: `node mcp-bridge/bin/mcp-bridge.js list-tools brightdata --config mcp.config.json`
- Call tool:  `node mcp-bridge/bin/mcp-bridge.js call brightdata get_dataset --json '{"dataset_id":"ds_xxx"}' --config mcp.config.json`

Environment Setup:

- Windows (PowerShell):
  - `$env:BRIGHTDATA_API_TOKEN = '...'`
  - `$env:ZENCODER_API_KEY = '...'`
  - `$env:GITHUB_TOKEN = '...'`
  - `$env:DATABASE_URL = 'postgresql://user:pass@host:5432/db'`
  - `$env:SLACK_BOT_TOKEN = 'xoxb-...'`
  - `$env:SLACK_APP_TOKEN = 'xapp-...'`

Notes:

- Never commit secrets. Prefer environment variables or secret stores.
- These custom servers require `@modelcontextprotocol/sdk` at the project root.
- For advanced scraping (proxy/unblocker), consider adding proxy-capable tools or Playwright MCP flows.

