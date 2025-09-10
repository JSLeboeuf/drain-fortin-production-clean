# Final Test Plan — Drain Fortin Voice AI

This plan verifies the full pipeline: VAPI → Supabase Edge → DB → Frontend.

## Prerequisites

- Supabase project is active (not paused), billing OK
- Function environment set for `vapi-webhook` (see SECRETS-REQUIRED.md)
  - Important: if the deployed function predates the latest patch, define `VAPI_SERVER_SECRET` (same value as `VAPI_WEBHOOK_SECRET`) to avoid 500 on HMAC.
- Assistant’s serverUrl points to Supabase (`/functions/v1/vapi-webhook`)
- Local PowerShell (or use the shell variant `WEBHOOK-TEST.sh`)

## Steps

1) Webhook Security — Invalid Signature
- POST JSON `{ "type":"test-security", "timestamp":"<ISO>" }` to `/vapi-webhook`
- Header: `x-vapi-signature: wrong_signature`, `Origin: https://drainfortin.com`
- Expect: 401/403 JSON (authentication error), NOT 500

2) Webhook Security — Valid Signature
- Option A (new code): Sign payload `{ "type":"health-check", "timestamp":"<ISO>" }` with HMAC SHA-256 using `VAPI_WEBHOOK_SECRET`
- Option B (older code): Sign payload `{ "message": { "type": "status-update" }, "timestamp":"<ISO>" }`
- POST to `/vapi-webhook` with header: `x-vapi-signature: <hex>`
- Expect: 200 JSON

3) VAPI → Webhook (Live)
- Place a live call to the assistant (or simulate `call-started`, `transcript`, `call-ended` via VAPI Dev Tools)
- Expect:
  - `vapi_calls` upserted with status `active` then `completed`
  - `call_transcripts` getting inserts during conversation
  - If P1/P2 (or oriented service), internal SMS alert (logged in `sms_messages`)
  - `clients` created/updated based on phone + available customer data

4) Frontend Realtime
- Start the frontend; wire the new hooks (see FRONTEND-REALTIME.md)
- Expect:
  - New `vapi_calls` appear instantly (existing realtime)
  - New `clients` and `sms_messages` appear (with the new realtime subscriptions)

5) Outlook Routing (no live transfer)
- Exercise routing paths (when Outlook/Azure AD ready)
- Expect: no `rejected` or `transfer_external` outcomes; queues/voicemail + internal notification instead

6) REST Reachability (optional)
- `GET /rest/v1/vapi_calls?select=count` with anon/service
- Expect: 200 + `Content-Range` (if RLS/views configured for frontend reads)

## Troubleshooting

- 500 on webhook = Function is crashing: check Function logs for missing env or RPC/table errors
- 401 on REST = invalid API key for the project, or REST disabled/paused
- If rate limiting RPC `increment_rate_limit` missing: add it via SQL editor (see runbook) and redeploy
