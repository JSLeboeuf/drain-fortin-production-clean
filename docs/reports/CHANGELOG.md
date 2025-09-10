# Changelog

## 2025-09-08 – Backend Hardening (Paul v39)

Highlights
- Webhook security hardened: HMAC (SHA-256), anti‑replay (timestamp), strict JSON‑only, strict CORS (403 on origin interdite), durable rate limiting (PostgreSQL).
- DB alignment: normalize call status (active/completed/failed/abandoned), converge on `call_duration` (migrate data; drop legacy `duration`), enhance `tool_calls` (use `tool_name`, add `status`, `duration_ms`).
- SLA routing via env: `SLA_CONTACTS_JSON` replaces hardcoded numbers; fallback supported.
- SMS persistence: write to `sms_messages` (CRM) with `to_number`/`from_number`, `sms_type`, `priority`.
- Services partagés: webhook delegates to `CallService` / `SMSService` (retry, CB, masquage PII).
- Docker/Monitoring: simplified compose (Postgres, Redis, Prometheus), cleaned Prometheus (no external defaults).
- Tests: UTF‑8 fixes in sample tests; status naming aligned.
- Removed npm `crypto` dependency (uses platform crypto only).

Breaking Changes
- `vapi_calls.duration` removed; use `vapi_calls.call_duration`.
- Webhook rejects non‑JSON payloads and disallowed origins with 415/403.
- `tool_calls.function_name` no longer used; use `tool_calls.tool_name`.

Migrations
- 20250908000002_call_duration_migration.sql – copy legacy `duration` to `call_duration`, drop `duration`.
- 20250908000003_rate_limit_persistent.sql – create durable rate limit table + RPC.
- 20250908000004_tool_calls_enhancements.sql – add `status`, `duration_ms` to `tool_calls`.

Env
- Add `ALLOWED_ORIGINS`, `SLA_CONTACTS_JSON`, `RATE_LIMIT_WINDOW_SECONDS`, optional `REDIS_URL`, `TWILIO_ALERT_FALLBACK_TO`.

