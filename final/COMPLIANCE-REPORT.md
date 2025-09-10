# Compliance Report — Constraints vs Implementation

Status after recent code changes (pending Function environment fix for execution):

## Business Constraints

- No client refusal — COMPLIANT
  - vapi-webhook validateServiceRequest accepts all; "hors-offre" services are oriented and trigger internal SMS.
- No live transfer — COMPLIANT
  - OutlookRoutingEngine maps transfer to voicemail + internal notify; removed hard rejections.
- SMS instead of transfer — PARTIAL → COMPLIANT for P1/P2 and oriented services
  - Internal alerts for P1/P2 and oriented services. Extend to P3/P4 as policy decides.
- Full CRM data capture — PARTIAL
  - Phone-based client create/update enabled; ensure name, address + postal code, email, problem description, and source are populated when available in payload.
- Frontend realtime — COMPLIANT (plumbing provided)
  - New helpers to subscribe to `clients` and `sms_messages` added; UI needs to use them.

## Security & Infrastructure

- HMAC verification & CORS — Implemented, pending env fix (webhook returns 500)
- Rate limiting (persistent RPC) — Implemented; ensure `increment_rate_limit` exists
- Secrets hygiene — Recommend rotating any keys shared in chat; remove any hardcoded fallbacks

## Files Changed

- backend/supabase/functions/vapi-webhook/index.ts — no refusal + orientation; env fallback to PUBLIC_SUPABASE_URL
- backend/src/services/outlook/OutlookRoutingEngine.ts — remove hard rejections; no live transfer
- frontend/src/lib/supabase.ts — realtime helpers for clients & sms_messages; sms logs source fixed

