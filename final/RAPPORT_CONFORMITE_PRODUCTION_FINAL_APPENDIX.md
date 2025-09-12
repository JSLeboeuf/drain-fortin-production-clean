## Preuves Runtime (2025-09-12)

- OPTIONS /vapi-webhook → 200
  - access-control-allow-headers: authorization, x-client-info, apikey, content-type, x-vapi-signature
- GET /vapi-webhook (sans signature) → 401
  - {"error":{"code":"MISSING_SIGNATURE","message":"Missing x-vapi-signature header"}}
- POST /vapi-webhook (signature invalide) → 401
  - {"error":{"code":"INVALID_SIGNATURE","message":"Invalid signature format"}}
- POST /vapi-webhook (JSON invalide, signature valide) → 400
  - {"error":{"code":"INVALID_JSON","message":"Invalid JSON payload"}}
- POST /vapi-webhook (>1MB, signature valide) → 413
  - {"error":{"code":"PAYLOAD_TOO_LARGE","message":"Payload exceeds 1MB limit"}}
- POST /vapi-webhook (health-check signé) → 200
  - {"status":"healthy","timestamp":"2025-09-12T03:25:30.192Z"}
- GET /health → 200 (JWT désactivé)
  - {"status":"healthy","timestamp":"2025-09-12T03:24:59.540Z","version":"1.0.1","database":"connected"}

Notes:
- `health` déployée avec `--no-verify-jwt` pour check public.
- Variables `SUPABASE_*` réservées par Supabase, fournies automatiquement.
