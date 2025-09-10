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

