# Repository Guidelines

This repository powers “Paul v39”, the voice AI receptionist for Drain Fortin, built on a SuperClaude‑style multi‑agent architecture. Keep changes minimal, tested, and compliant with Guillaume’s 156 real constraints.

## Project Structure & Module Organization
- `01-CORE/` Moteur agent, configs, sécurité, performance.
- `02-SCRIPTS/` Déploiement GCP, automatisation (Terraform/GKE).
- `03-CONFIGS/` Docker, K8s, GCP, VAPI.
- `04-DOCUMENTATION/` Contraintes (lire `GUILLAUME-CONSTRAINTS-COMPLETE-REFERENCE.md`).
- `05-TESTS/` Scénarios + E2E (Playwright/Node).
- `08-TOOLS/` Outils performance/diagnostic.
- `09-MONITORING/` Dashboards & métriques.

## Build, Test, and Development Commands
- Bootstrap local stack: `docker-compose up -d` (Redis, PostgreSQL, monitoring).
- Full CI (pre‑commit): `make ci`.
- Unit/Integration tests: `make test`.
- Static checks (lint/types): `npm run validate`.
- Constraints validators: `node 05-TESTS/validate-210-constraints.js`.
- E2E complete: `node 05-TESTS/test-paul-v39-complete.js`.
- Deploy: `make deploy-staging` then `make deploy-prod` (post‑validation).
- Monitor/Logs: `make monitor`, `make logs`.

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Logs/commentaires en français. JSDoc obligatoire.
- Naming: PascalCase (types/classes), camelCase (fonctions/variables), kebab-case (fichiers/dossiers).
- Formatting/Lint: respectez la config du repo via `npm run validate`.
- Keep changes focused; do not alter unrelated modules.

## Testing Guidelines
- Frameworks: Node tests + Playwright E2E.
- Coverage: ≥ 80% requis.
- Fichiers de test: `05-TESTS/*.spec.ts|js` (ex.: `test-paul-v39-complete.js`).
- Avant PR: `make ci` + validateurs contraintes doivent être verts.

## Commit & Pull Request Guidelines
- Commits en français, impératif, scope clair (ex.: `feat(core): validation prix temps réel`).
- PR: description concise, contraintes impactées, captures/logs “avant/après”, liens issues.
- N’ouvrez pas de PR sans tests/validators passants et docs mises à jour si nécessaire.

## Security & Configuration Tips
- Secrets via GCP Secret Manager; ne jamais committer de clés.
- Variables requises: `VAPI_API_KEY`, `TWILIO_*`, `GCP_*`, `DATABASE_URL`.
- PII: conformité Loi 25 (rétention minimale, suppression sur demande).

## Agent‑Specific Rules (Critical)
- Respect absolu des 156 contraintes: prix planchers, services refusés, collecte 5 champs, fenêtres de temps, routage SLA P1–P4.
- Validez localement: `node 05-TESTS/validate-210-constraints.js` et E2E avant changements majeurs.
