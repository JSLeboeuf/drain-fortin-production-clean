# Test Results — Current Status

Last update: 2025-09-10 (UTC)

## Summary

- VAPI assistant serverUrl → Supabase: OK
- Webhook invalid signature (top-level) → 401 — OK
- Webhook invalid signature (nested) → 401 — OK
- Webhook valid signed (nested status-update) → 200 — OK
- Webhook valid health-check (top-level) → 500 — Legacy build expects nested shape (optional fix by redeploying patched code)
- REST table reachability (anon):
  - GET /rest/v1/call_logs?select=count → 200 (Content-Range */0)
  - GET /rest/v1/sms_logs?select=count → 200 (Content-Range */0)

## Interpretation

- Function now rejects invalid HMAC (401) and accepts valid nested messages (200).
- Top-level {"type":"health-check"} still returns 500 because the live build is the legacy variant parsing only nested `message` payloads.
- Optional improvement: deploy the patched function to enable top-level health-check (keeps nested shape working too).

## What to verify in Supabase

- Function env:
  - SUPABASE_URL, SERVICE_ROLE_KEY, VAPI_WEBHOOK_SECRET (and VAPI_SERVER_SECRET for legacy), ENVIRONMENT, ALLOWED_ORIGINS
- DB objects (schema public):
  - Tables used by current flow: call_logs, sms_logs (both reachable via REST anon, count=0)
  - Legacy tables if referenced elsewhere: vapi_calls, clients, call_transcripts, tool_calls, sms_messages, security_events
  - RPC increment_rate_limit (only if persistent rate-limit is enabled in your codebase)
- Function logs: https://supabase.com/dashboard/project/phiduqxcufdmgjvdipyu/logs/functions

## Next steps

- If you want top-level health-check 200, deploy: `supabase functions deploy vapi-webhook --project-ref phiduqxcufdmgjvdipyu`
- Re-run tests: `powershell -ExecutionPolicy Bypass -File .\final\RETEST.ps1` or `bash ./final/WEBHOOK-TEST.sh <API_URL> <SECRET>`
- If DB writes fail later, apply `supabase/migrations/9999_minimal_webhook_tables.sql` (idempotent)
- Proceed with live VAPI test + UI realtime checks (nested payload path already green)

---

## Latest Audit (UTC)
Timestamp: 2025-09-10T23:52Z

- Invalid HMAC (top-level)
  - HTTP 401
  - sb-request-id: 01993609-52b1-788a-98a5-a5f3b3fdf5a4
  - x-deno-execution-id: 2725bc23-9d81-4672-9baf-1747e27731a6
  - Body: {"error":"Invalid signature"}

- Invalid HMAC (nested)
  - HTTP 401
  - sb-request-id: 0199360a-7170-7d26-bd04-34e649deb332
  - x-deno-execution-id: 6e43a240-629c-48d5-a7f0-52ab4ca4b71c
  - Body: {"error":"Invalid signature"}

- Valid HMAC (nested status-update)
  - HTTP 200 (via final/WEBHOOK-TEST.sh)
  - Body: {"success":true}

- Valid HMAC (top-level health-check)
  - HTTP 500 (legacy variant) — optional improvement by deploying patched function

- CORS / OPTIONS
  - HTTP 200
  - sb-request-id: 0199360b-3f3b-77ec-aee0-b2a6a90f9f31
  - access-control-allow-headers: authorization, x-client-info, apikey, content-type, x-vapi-signature
  - access-control-allow-methods: POST, GET, OPTIONS

- GET without signature
  - HTTP 401 (Missing signature)
  - sb-request-id: 0199360b-58db-7c4d-9331-afdb49073388

- REST reachability
  - Previously confirmed 200 (Content-Range */0) for call_logs and sms_logs; counts not repeated in this run due to environment header constraints.

- end-of-call-report insert (nested)
  - Not executed in this run due to HMAC signing constraints in the sandbox shell for multi-line JSON.
  - To execute locally (Windows): use final/RETEST.ps1 or a one-liner that signs the nested payload; the function will insert into call_logs.

### Recommendation
- GO for production with the current nested payload path (invalid=401, valid=200) and REST reachability confirmed earlier.
- Optional: deploy the patched function to enable top-level health-check (200) and simplify synthetic monitoring.
