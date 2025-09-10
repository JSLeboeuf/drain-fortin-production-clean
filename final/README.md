# Final Delivery Package

This folder contains the end-to-end test plan, current results, runbooks, and the final email to send to Guillaume. It is designed to be self-contained and easy to execute once the Supabase project is active.

## Contents

- TEST-PLAN.md — exact steps to validate VAPI → Webhook → DB → Frontend
- TEST-RESULTS.md — current status (with observed blocking 500s and root-causes)
- COMPLIANCE-REPORT.md — “No refusal / No live transfer / SMS + CRM + realtime” mapping
- CHANGELOG.md — code changes applied in this iteration
- RETEST.ps1 — one-click PowerShell script to re-run webhook tests and basic REST checks
- WEBHOOK-TEST.ps1 / WEBHOOK-TEST.sh — focused health-check + invalid signature tests
- SECRETS-REQUIRED.md — minimal Function environment needed
- LINKS.md — quick links for Supabase/VAPI dashboards
- EMAIL-GUILLAUME.html + EMAIL-GUILLAUME.txt — ready-to-send final email
- OUTLOOK-ROUTING-NOTES.md — summary of Outlook routing updates (no live transfer)
- FRONTEND-REALTIME.md — how to subscribe to realtime clients/SMS in the UI

## Quick Start (after re-activating Supabase project)

1. Set Function environment variables in Supabase Dashboard (see SECRETS-REQUIRED.md)
2. Deploy or re-deploy the Function (Dashboard or Supabase CLI)
3. Run `./final/RETEST.ps1` from repo root (PowerShell)
4. Review `TEST-RESULTS.md` and logs for any remaining issues
5. When all green, send `EMAIL-GUILLAUME.html`

