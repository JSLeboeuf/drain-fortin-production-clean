# 📝 TODO: Consolidation des Migrations Supabase

## Problème identifié
Double structure de migrations :
- `supabase/migrations/` (dossier principal - 11 fichiers)
- `backend/supabase/migrations/` (dossier dupliqué - 10 fichiers)

## Actions requises

### 1. Analyser les différences
```bash
# Comparer les migrations
diff -r supabase/migrations/ backend/supabase/migrations/
```

### 2. Consolider vers le dossier principal
Le dossier officiel Supabase est `supabase/migrations/`. Les migrations dans `backend/` doivent être :
- Analysées pour contenu unique
- Fusionnées si nécessaire 
- Supprimées après consolidation

### 3. Synchroniser avec la base distante
```bash
# Pull l'état actuel de production
supabase db pull

# Vérifier les migrations manquantes
supabase migration list

# Appliquer les migrations consolidées
supabase db push
```

### 4. Nettoyer
- Supprimer `backend/supabase/migrations/`
- Mettre à jour toute référence dans la documentation
- Vérifier les scripts CI/CD utilisent le bon chemin

## ⚠️ Important
Cette consolidation doit être faite **après** la création de la PR mais **avant** le merge en production pour éviter les conflits de migrations.