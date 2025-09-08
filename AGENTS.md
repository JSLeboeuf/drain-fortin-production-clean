# Repository Guidelines

This repository powers “Paul v39”, the voice AI receptionist for Drain Fortin, built on a SuperClaude-style multi‑agent architecture. Keep changes minimal, tested, and compliant with Guillaume’s 156 real constraints.

## Project Structure & Module Organization
- `01-CORE/` Agent engine, configs, sécurité, performance.
- `02-SCRIPTS/` Déploiement GCP, automatisation.
- `03-CONFIGS/` Docker, K8s, GCP, VAPI.
- `04-DOCUMENTATION/` Contraintes (lire `GUILLAUME-CONSTRAINTS-COMPLETE-REFERENCE.md`).
- `05-TESTS/` Scénarios + E2E (Playwright/Node).
- `08-TOOLS/` Outils performance/diagnostic.
- `09-MONITORING/` Dashboards et métriques.
- Root: `Makefile`, `package.json`, `docker-compose.yml`.

## Build, Test, and Development Commands
- Bootstrap local stack: `docker-compose up -d` (Redis, PostgreSQL, monitoring).
- Full CI (pre‑commit): `make ci`
- Tests unit/intégration: `make test`
- Static checks: `npm run validate`
- Constraints/E2E: `node 05-TESTS/validate-210-constraints.js`, `node 05-TESTS/test-paul-v39-complete.js`
- Deploy/Monitor: `make deploy-staging`, `make deploy-prod`, `make monitor`, `make logs`

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Logs/commentaires en français. JSDoc obligatoire.
- Naming: PascalCase (types/classes), camelCase (fonctions/variables), kebab-case (fichiers/dossiers).
- Lint/format: respectez la configuration existante via `npm run validate`.

## Testing Guidelines
- Frameworks: Node tests + E2E Playwright.
- Coverage: ≥ 80% minimum; gardez les tests rapides et déterministes.
- Emplacement/nommage: `05-TESTS/*.spec.ts|js` (ex: `test-paul-v39-complete.js`).
- Avant PR: `make ci` doit être vert; exécutez aussi les validateurs contraintes.

## Commit & Pull Request Guidelines
- Commits: français, impératif, scope clair (ex: `feat(core): validation prix temps réel`).
- PR: description concise, contraintes impactées, captures/logs “avant/après”, liens issues.
- Checklists: toutes les commandes de la section Tests passent; docs mises à jour si pertinent.

## Security & Configuration Tips
- Secrets via GCP Secret Manager; ne jamais committer de clés.
- Variables: `VAPI_API_KEY`, `TWILIO_*`, `GCP_*`, `DATABASE_URL` (local via env; prod via secrets).
- Données PII: conformité Loi 25 (rétention minimale, suppression sur demande).

## Agent‑Specific Rules (Critical)
- Respect absolu des 156 contraintes (prix planchers, services refusés, collecte 5 champs, fenêtres de temps, routage SLA P1–P4).
- Validez localement: `node 05-TESTS/validate-210-constraints.js` et E2E Playwright.
- Toute modification du routage, tarification ou filtrage doit inclure tests + mise à jour `04-DOCUMENTATION/` si nécessaire.

