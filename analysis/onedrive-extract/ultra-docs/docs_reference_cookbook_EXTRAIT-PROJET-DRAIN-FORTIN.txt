# Extrait Cookbook OpenAI — Guide appliqué au projet Drain Fortin

Ce document résume les techniques et bonnes pratiques essentielles issues du OpenAI Cookbook (articles téléchargés dans ce repo) et les relie à votre code actuel pour guider l’évaluation et le durcissement en production.

Sources locales:
- docs/reference/cookbook/techniques_to_improve_reliability.md
- docs/reference/cookbook/how_to_work_with_large_language_models.md
- docs/reference/cookbook/related_resources.md

## Fiabilité & Robustesse
- Instructions explicites: définir clairement rôle, objectifs, contraintes. Vérifier les prompts système et tool-calls.
  - Lier à: `config/vapi-assistant.json` (instructions Paul) et validations côté webhook.
- Itération/étapes: demander des plans, vérifier la cohérence avant action; favoriser sorties structurées.
  - Lier à: Tool-calls/JSON, stockage `vapi_calls.analysis`.
- Sorties structurées (JSON Schema): privilégier la structuration pour extraire des champs (priority, sla_seconds, etc.).
  - Lier à: `backend/supabase/functions/_shared/validation` (si présent) et validations d’arguments tool_calls.
- Gestion d’erreurs & retries: backoff exponentiel + jitter sur 429/5xx/timeouts, idempotency keys au besoin.
  - À vérifier: logique de retry pour Twilio/Supabase; `sms-service.ts` possède un circuit breaker + retry.
- Déterminisme relatif: lorsque pertinent, fixer `seed` (si API supporte) pour tests; sinon snapshots/goldens.
  - Lier à: tests Vitest (frontend/backend) et rapports de vérification.

## Limitation de débit (Rate Limits)
- Backoff exponentiel avec jitter, retry sur 429 et 5xx, budgets de requêtes simultanées.
- Idempotence: pour actions sensibles, utiliser des clés d’idempotence côté serveur.
  - Lier à: `backend/supabase/functions/_shared/middleware/rate-limit-persistent.ts` et règles RLS.

## Temps réel & Streaming
- Streaming pour latence perçue plus faible; dégrader proprement si streaming indisponible.
- Connexions WebSocket: ping/pong, reconnexion progressive, file d’attente locale.
  - Lier à: `frontend/src/hooks/useWebSocket.ts` (ping 30s, reconnexion), `frontend/src/lib/secure-websocket.ts` (auth, validation messages).

## Observabilité
- Journaliser: modèle, version, latences, tokens, coûts, IDs de corrélation.
- Monitoring & alerting: Sentry/Logs; red flags (boucles, erreurs élevées, 429).
  - Lier à: `frontend/src/lib/logger.ts`, `frontend/src/services/monitoring.ts`, Sentry DSN env.

## Sécurité & Conformité
- Validation stricte des entrées/sorties: nettoyer, typer, contrôler les tailles.
- Webhooks: HMAC, CORS restrictif, JSON-only, quotas.
  - Lier à: `backend/supabase/functions/_shared/cors.ts`, `.../middleware/webhook-security.ts` (HMAC timing-safe), `vapi-webhook/index.ts`.
- Secrets: stockage sûr, jamais côté client; rotation régulière.
  - Lier à: `.env.example`, `frontend/vercel.json` (public only), scripts contenant clés à purger.

## Conception de prompt (LLM)
- Contextes courts et ciblés; exemples pertinents; éviter ambigüités.
- Règles métier explicites: priorités P1–P4, tarifs, périmètre services.
  - Lier à: `config/vapi-assistant.json` (règles), tables `system_constraints`, `pricing_rules`.

## Évaluation & Tests
- Jeux d’essais reproductibles (goldens), assertions sur formats JSON, types, champs obligatoires.
- Tests de bout en bout (latences, erreurs réseau, reconnections WebSocket).
  - Lier à: `backend` Vitest (83 tests ok), `frontend` Vitest/E2E (à réparer), scripts `test-e2e-production.js`.

## Caching & Coûts
- Prompt caching pour prompts récurrents; mutualisation des résultats stables.
- Batch et planification pour workloads asynchrones.

---

# Checklist « appliquée » (Cookbook → Projet)

1) Sécurité webhooks
- [ ] HMAC SHA-256 timing-safe (OK dans middleware + fonction)
- [ ] CORS origines restreintes (OK, vérifier domaines prod)
- [ ] JSON-only + taille max payload (OK)

2) Rate limiting & retries
- [ ] Limiteur persistant (OK, présent)
- [ ] Retries backoff+jitter Twilio/API (partiel: circuit breaker + retry SMS)
- [ ] Idempotence sur opérations sensibles (à évaluer)

3) Observabilité
- [ ] Logs corrélables (req id), latences, erreurs, usages (partiel)
- [ ] Sentry activé en prod (env DSN)
- [ ] Rapports de santé périodiques (scripts présents)

4) Realtime/WebSocket
- [ ] Ping/pong 30s, reconnexion progressive (OK)
- [ ] Auth WS + validation messages (OK `secure-websocket.ts`)
- [ ] Dégradation propre si WS indisponible (à valider via tests)

5) Frontend qualité
- [ ] Type-check Vitest types (`vitest/globals`) (à corriger)
- [ ] Lint plugins installés (`eslint-plugin-react` etc.) (à installer)
- [ ] Tests frontend passent (corriger imports manquants, Sentry imports)

6) Secrets & clés
- [ ] Aucune clé privée dans le client (revue `vercel.json`)
- [ ] Scripts avec clés hardcodées purgés/rotations (fix-vapi-pronunciation.js)

7) Schémas & sorties structurées
- [ ] Tool-calls avec schémas validés; arguments typés (à compléter si besoin)
- [ ] JSON validé (guards) avant insertion DB (à vérifier dans services)

8) Prompts & règles métier
- [ ] Règles explicites (services acceptés/refusés, SLA, prix, surcharges) (OK)
- [ ] Tests goldens prompts/réponses critiques (à mettre en place)

---

# Liens utiles (Cookbook)
- Techniques de fiabilité: `docs/reference/cookbook/techniques_to_improve_reliability.md`
- Travailler avec les LLM: `docs/reference/cookbook/how_to_work_with_large_language_models.md`
- Ressources connexes: `docs/reference/cookbook/related_resources.md`

