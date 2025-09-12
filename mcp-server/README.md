# MCP Bridge — Supabase + VAPI (Node/Express, TypeScript)

Un serveur MCP (Model Context Protocol) jouant le rôle de « proxy intelligent » entre un LLM (ChatGPT Connecteurs ou autre client MCP) et deux sources :

- Supabase: lecture/écriture/mise à jour sur la table `clients(id, nom, email, created_at)`
- VAPI: envoi d'ordres (ex. `POST /vapi/call`) pour déclencher un appel avec un message

Fonctionnalités :
- Endpoints REST dédiés (`/clients`, `/vapi/call`)
- Endpoints MCP (`/mcp/actions`, `/mcp/execute`) pour décrire et exécuter des actions
- OpenAPI exposé à `/openapi.json` et UI Swagger à `/docs`
- (Optionnel) Authentification simple par token via header `x-api-token`

## 1) Installation

```bash
cd mcp-server
cp .env.example .env   # Renseignez vos clés
npm install
npm run dev            # http://localhost:8787
```

Variables `.env` attendues :
- `PORT` (défaut 8787)
- `MCP_TOKEN` (optionnel) pour protéger via `x-api-token`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (serveur seulement)
- `VAPI_BASE_URL` (défaut `https://api.vapi.ai`), `VAPI_API_KEY`

## 2) Découverte & OpenAPI (à renseigner dans ChatGPT / Connecteurs)

- OpenAPI: `http://localhost:8787/openapi.json`
- UI Swagger: `http://localhost:8787/docs`
- Manifest simple: `http://localhost:8787/mcp/manifest`
- Liste d’actions MCP: `http://localhost:8787/mcp/actions`

Dans ChatGPT Connecteurs (ou un client MCP compatible), fournissez l’URL de l’OpenAPI pour autodétection des actions.

## 3) Endpoints

### Health
- `GET /health` → `{ status: "healthy" }`

### MCP
- `GET /mcp/actions` → liste des actions disponibles
- `POST /mcp/execute` → exécute une action

Exemples de payloads `POST /mcp/execute`:
```jsonc
{ "action": "supabase.clients.list", "params": { "limit": 50 } }
{ "action": "supabase.clients.create", "params": { "nom": "Jean", "email": "j@example.com" } }
{ "action": "supabase.clients.update", "params": { "id": "<uuid>", "nom": "Nouveau" } }
{ "action": "vapi.call", "params": { "to": "+14389004385", "message": "Bonjour!" } }
```

### Supabase — clients
- `GET /clients?limit=100` — liste (100 max 200)
- `POST /clients { nom, email }` — crée un client
- `PATCH /clients/:id { nom?, email? }` — met à jour un client

Schéma table requis :
```sql
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  email text not null,
  created_at timestamptz default now()
);
```

### VAPI
- `POST /vapi/call { to, message }` — déclenche un appel

## 4) Authentification simple (optionnelle)

Si `MCP_TOKEN` est défini, tous les endpoints exigent le header `x-api-token: <MCP_TOKEN>`.

## 5) Sécurité
- Ne jamais exposer la clé `SUPABASE_SERVICE_ROLE_KEY` côté client.
- Ce serveur doit être déployé côté serveur (backend) uniquement.

## 6) Notes MCP
- Le protocole MCP s’appuie ici sur l’OpenAPI pour la découverte des capacités et le dispatch via `/mcp/execute`.
- Les actions exposées : `supabase.clients.list|create|update`, `vapi.call`.

## 7) Démo rapide

```bash
# Lister actions
curl -s http://localhost:8787/mcp/actions

# Exécuter une action (créer un client)
curl -s -X POST http://localhost:8787/mcp/execute \
  -H 'Content-Type: application/json' \
  -d '{"action":"supabase.clients.create","params":{"nom":"Alice","email":"a@ex.com"}}'

# Appel VAPI
env VAPI_API_KEY=va_xxx curl -s -X POST http://localhost:8787/vapi/call \
  -H 'Content-Type: application/json' \
  -d '{"to":"+14389004385","message":"Bonjour!"}'
```

---

Pour connecter ce serveur à ChatGPT Connecteurs, indiquez l’URL de `openapi.json`. Assurez‑vous que le serveur est accessible depuis votre environnement d’exécution.

