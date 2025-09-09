# Repository Guidelines

## Project Structure & Module Organization
- `01-CORE/` — Moteur agent Paul v39, sécurité, config, performance.
- `02-SCRIPTS/` — Déploiements GCP/Terraform, automatisation, CI utils.
- `03-CONFIGS/` — Docker, K8s, VAPI, variables d’environnement.
- `04-DOCUMENTATION/` — Contraintes Guillaume: `GUILLAUME-CONSTRAINTS-COMPLETE-REFERENCE.md` (156 contraintes C001–C210).
- `05-TESTS/` — E2E Playwright, validations contraintes, scripts QA.
- `08-TOOLS/`, `09-MONITORING/`, `12-LOGS/` — Outils, dashboards, logs centralisés.

## Build, Test, and Development Commands
- `make ci` — Build, lint et tests complets (doit être vert avant PR).
- `make test` — Suite locale rapide; `npm run validate` — validations statiques.
- `node 05-TESTS/validate-210-constraints.js` — Vérifie conformité contraintes (0 violation).
- `node 05-TESTS/test-paul-v39-complete.js` — Tests spécifiques agent Paul v39.
- `docker-compose up -d` — Stack locale (Redis, PostgreSQL, monitoring).
- `make deploy-staging` / `make deploy-prod` — Déploiement GCP (après validation Guillaume).

## Coding Style & Naming Conventions
- TypeScript en mode strict; indentation 2 espaces; pas de variables 1 lettre.
- Français dans logs/commentaires; JSDoc obligatoire pour fonctions publiques.
- Fichiers: `kebab-case.ts`; tests: `*.spec.ts` ou `*.test.ts` dans `05-TESTS/`.
- Préférez fonctions pures, modules courts; centralisez constantes dans `01-CORE/config`.
- Si disponibles: `npm run lint`, `npm run format` avant commit.

## Testing Guidelines
- Couverture minimale 80% (viser 95% pour chemins critiques).
- E2E Playwright et tests Node: prix planchers, services refusés, routage SLA, collecte 5 champs.
- Exemples: `make test`, puis `node 05-TESTS/validate-production-system.js`.

## Commit & Pull Request Guidelines
- Messages en français, à l’impératif, avec scope: `core|scripts|configs|tests`.
  - Ex.: `core: corrige validation prix C047`.
- PR: description claire, changements, risques, liens issues; sortie `make ci` jointe; screenshots/logs utiles.
- Exigez une CI verte et l’approbation du propriétaire pour production.

## Security & Configuration Tips
- Ne commitez jamais de secrets; utilisez GCP Secret Manager. Vars: `VAPI_API_KEY`, `TWILIO_*`, `GCP_*`, `DATABASE_URL`.
- Conformité Loi 25: PII minimisée, pas de PII en logs, rétention minimale, suppression sur demande.
- Respect strict des contraintes Guillaume (156). Toute violation = blocage + alerte.

