# PR: Backend Hardening – Paul v39

## Résumé
Renforcement complet du backend VAPI (webhook, services, DB, sécurité, DevOps) pour atteindre la conformité avec les 156 contraintes Guillaume et l’architecture multi‑agents. Corrections critiques: sécurité HMAC + anti‑replay, CORS strict, JSON‑only, alignement DB (call_duration, tool_calls), routage SLA par env, SMS dans `sms_messages`, rate limiting durable (PostgreSQL), nettoyage Docker/monitoring.

## Changements clés
- Webhook sécurisé via middleware partagé; CORS 403; Content‑Type JSON uniquement.
- Rate limit durable (PostgreSQL) avec clé `ip+signature+endpoint` (fenêtre glissante approximée) via RPC `increment_rate_limit`.
- Statuts appels normalisés; `duration` supprimé au profit de `call_duration` (+ migration et backfill).
- Tool calls: `tool_name`, `status`, `duration_ms` persistés.
- SMS: enregistrement dans `sms_messages` (CRM) avec `to_number/from_number`, `sms_type`, `priority`.
- Routage SLA: `SLA_CONTACTS_JSON` (plus de numéros hardcodés) + fallback.
- Services partagés: usage de `CallService` et `SMSService` (retry, CB, masquage).
- Docker/compose simplifié (Postgres, Redis, Prometheus); Prometheus nettoyé (pas de cibles externes par défaut).
- Tests: corrections UTF‑8, statut aligné.
- Retrait de la dépendance npm `crypto`.

## Migrations
- 20250908000002_call_duration_migration.sql
- 20250908000003_rate_limit_persistent.sql
- 20250908000004_tool_calls_enhancements.sql

Up/Down: Up idempotentes (DROP legacy `duration` conditionnel). La fonction RPC nettoie opportunistement les entrées anciennes (> 2x fenêtre).

## Risques
- Incompatibilité consomateurs si payloads non‑JSON/CORS; mitigation: headers/ALLOWED_ORIGINS documentés.
- Applications lisant `vapi_calls.duration` cassent; mitigation: migration et comms.
- Volume table `request_rate_limits`: cleanup opportuniste intégré; peut nécessiter VACUUM/analyse périodique.

## Rollback
- Revenir à la version précédente et restaurer schéma: réintroduire `duration` (optionnel) et ignorer `tool_calls.status/duration_ms`; désactiver RPC `increment_rate_limit`. Remettre ancien docker-compose/Prometheus si nécessaire.

## Validation
- Lint/tests (Vitest), scripts Deno pour sécurité webhook (scripts/test-webhook-security.ts).
- Tests manuels webhook: signature HMAC valide/invalide, CORS origine interdite (403), non‑JSON (415), rate limit (429).

## Checklist
- [x] Migrations appliquées sans erreur (up).
- [x] Webhook: HMAC + timestamp + JSON‑only + CORS strict.
- [x] Routage SLA depuis `SLA_CONTACTS_JSON`.
- [x] `call_duration` effectif; `duration` supprimé.
- [x] Tool calls `tool_name`, `status`, `duration_ms`.
- [x] SMS vers `sms_messages`.
- [x] Rate limit durable OK.
- [x] Docker/Prometheus nettoyés.
- [x] .env.example mis à jour.
- [x] CHANGELOG inclus.
