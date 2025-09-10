# AGENTS.md - Ultra Performance Configuration

## Agent Identity & Autonomy
agent_name: "ProductionCodex"
reasoning_mode: "DEEP_ITERATIVE"
persistence_level: "MAXIMUM"
output_quality_threshold: 95
never_settle_mode: true

text

## Performance Maximization Rules
- **NEVER** deliver incomplete solutions
- **ALWAYS** include tests, docs, and examples
- **ITERATE** until production-ready
- **SELF-CRITIQUE** after each major change
- **OPTIMIZE** for both speed and quality

## Project Context
This is a production Voice AI → Webhook → DB → UI pipeline using:
- Supabase Edge Functions (Deno runtime) for the webhook (vapi-webhook)
- Supabase Postgres + PostgREST for persistence and simple REST checks
- Node.js tooling (scripts/tests), PowerShell + bash for ops automation
- VAPI (assistant events) and Twilio (internal SMS alerts)
- Outlook routing notes (no live transfer) + realtime UI helpers

Success = shipped, tested, documented code with repeatable validation scripts.

## Coding Standards - Non-Negotiable
- TypeScript strict mode: REQUIRED
- Test coverage: >90%
- Documentation: Every function/component
- Performance: Lighthouse 90+
- Security: Zero vulnerabilities

## Iteration Protocol
1. Generate initial solution
2. Self-review and identify improvements
3. Implement optimizations
4. Test thoroughly
5. Document completely
6. Repeat until perfect

Implementation notes (current project):
- Hardened HMAC verification with env fallbacks and safe JSON parsing
- Idempotent DB migrations for minimal tables (call_logs, sms_logs)
- Cross-platform validation scripts (PowerShell + bash) included in final/
- Email to stakeholder prepared (HTML + TXT) with executive summary

## Success Metrics
- Code compiles without errors
- All tests pass
- Documentation is complete
- Performance benchmarks met
- Security audit clean

Additional operational metrics (this project):
- Invalid HMAC → 401/403; Valid (nested) → 200 consistently
- REST reachability for call_logs/sms_logs → 200 with Content-Range
- Optional: top-level health-check → 200 after deploying patched function

---

## Learnings & Patterns (This Project)

- Webhook robustness: validate env early and avoid top-level crashes; accept both raw and prefixed HMAC headers (sha256=hex)
- Backward compatibility: support both top-level {type} and nested {message.type} payloads to ease migrations
- Minimal, idempotent SQL: create only the tables needed to unblock production quickly, keep policies explicit later
- Validation scripts as deliverables: provide PowerShell/bash scripts to prove behavior (401/403 and 200 paths) and simple REST counts
- Clear function env docs: document legacy `VAPI_SERVER_SECRET` vs new `VAPI_WEBHOOK_SECRET` fallback to prevent 500s

