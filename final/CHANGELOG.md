# Changelog — Finalization Pass

## Summary of Code Changes

- vapi-webhook (Edge Function)
  - validateServiceRequest: removed refusal logic; now accepts and orients "hors-offre" with internal SMS
  - getEnvironmentConfig: add PUBLIC_SUPABASE_URL fallback for SUPABASE_URL
  - health-check route returns 200 when signed; security remains strict otherwise

- OutlookRoutingEngine
  - No hard rejections: mapped 'rejected' outcomes to 'queued' with instructions
  - 'transfer_external' mapped to voicemail + internal SMS notification
  - Added notifyInternalSMS placeholder

- Frontend supabase client
  - Added realtime helpers for `clients` and `sms_messages`
  - Fixed SMS logs source to `sms_messages`

## Files

- backend/supabase/functions/vapi-webhook/index.ts
- backend/src/services/outlook/OutlookRoutingEngine.ts
- frontend/src/lib/supabase.ts

## Notes

- Functional tests blocked by Supabase Function 500 (likely env/project state). See TEST-RESULTS.md.
- Once resolved, run RETEST.ps1 and follow TEST-PLAN.md.

