# Frontend Hardening PR – 2025-09-08

## Résumé
- Source des contraintes: remplacée par backend (156 réelles) via client API typé.
- Suppression des heuristiques et valeurs aléatoires (priorités, catégories, violationCount).
- Unification état: React Query (caching, revalidation) pour `EnhancedConstraintsDashboard`.
- Sécurité: masquage PII côté client dans logs d’erreurs; StrictMode activé.
- Architecture: archivage de l’ancien `src/` racine non utilisé sous `frontend/_archive_root_src`.
- Tests: adaptation du dashboard + ajout tests `apiClient`.
- Docs: ajout `AGENTS.md`, mise à jour variables env (NEXT_PUBLIC_API_BASE_URL).

## Détails Techniques
- Nouveau: `frontend/src/lib/apiClient.ts` (GET `/api/constraints` avec pagination/tri/filtre; compat NEXT_PUBLIC/VITE).
- Service: `frontend/src/services/constraintService.ts` refactorisé pour consommer l’API et calculer les stats sans heuristiques.
- Hook: `useConstraintsData` migre vers React Query, rafraîchissement optionnel, clés stables, erreurs typées.
- UI: états de chargement et vidés conservés; a11y et focus via shadcn/ui.
- Sécurité: PII masqué (email/téléphone) dans les logs d’erreurs API.

## Variables d’environnement
- `NEXT_PUBLIC_API_BASE_URL` (prioritaire) ou `VITE_API_BASE_URL`.

## Impact & Migration
- Aucun breaking change UI attendu. L’ancien code racine `src/` est archivé; mise à jour des imports non nécessaire côté app Vite.
- Les tests CRM liés à Supabase échouent déjà en local (non régressif). A traiter séparément.

## Suivi
- Option: ajouter pagination UI si >50 contraintes/page.
- Option: a11y tests (axe-core) et tests Playwright ciblés dashboard.
