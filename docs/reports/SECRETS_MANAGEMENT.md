# Guide de Gestion Sécurisée des Secrets

## ⚠️ AVERTISSEMENT CRITIQUE
**JAMAIS** committer de vrais secrets, clés API, ou mots de passe dans le repository Git.

## 🔐 Gestion des Variables d'Environnement

### En Développement Local
1. Copier `.env.example` vers `.env.local`
2. Remplir avec vos valeurs de développement
3. Ne jamais committer `.env.local`

### En Production
1. Utiliser des services de gestion de secrets :
   - **GitHub Actions Secrets** pour CI/CD
   - **Vercel Environment Variables** pour le frontend
   - **Supabase Dashboard** pour les Edge Functions
   - **AWS Secrets Manager** ou **Azure Key Vault** pour entreprise

### Configuration Supabase Edge Functions
```bash
# Définir les secrets via Supabase CLI
supabase secrets set VAPI_WEBHOOK_SECRET="your-secret-here"
supabase secrets set VAPI_API_KEY="your-api-key-here"
```

### Configuration GitHub Actions
```yaml
# .github/workflows/deploy.yml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

## 🔄 Rotation des Secrets

### Si des Secrets sont Compromis
1. **IMMÉDIATEMENT** révoquer les clés exposées
2. Générer de nouvelles clés dans les dashboards respectifs :
   - Supabase : Settings → API
   - VAPI : Dashboard → API Keys
3. Mettre à jour dans l'environnement de production
4. Auditer les logs pour détecter tout accès non autorisé

### Rotation Régulière (Tous les 90 jours)
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] VAPI_API_KEY
- [ ] VAPI_WEBHOOK_SECRET
- [ ] Tokens d'authentification

## 🛡️ Bonnes Pratiques

### DO ✅
- Utiliser des gestionnaires de secrets
- Activer la rotation automatique quand possible
- Limiter les permissions au minimum nécessaire
- Auditer régulièrement l'accès aux secrets
- Utiliser des secrets différents par environnement

### DON'T ❌
- Partager des secrets par email/Slack/Discord
- Réutiliser les mêmes secrets entre environnements
- Logger les valeurs des secrets
- Hardcoder des secrets dans le code
- Committer des fichiers .env

## 📝 Checklist de Déploiement

Avant chaque déploiement :
- [ ] Vérifier qu'aucun secret n'est dans le code
- [ ] Confirmer que `.env.production` n'est PAS dans Git
- [ ] Valider que tous les secrets sont dans le gestionnaire
- [ ] Tester avec des valeurs de production
- [ ] Activer les alertes de sécurité

## 🚨 Contact Sécurité

En cas de compromission suspectée :
1. Contact immédiat : security@drainfortin.com
2. Révoquer TOUS les secrets
3. Changer tous les mots de passe
4. Auditer les logs des dernières 48h

---
**Dernière mise à jour** : 2025-01-08
**Prochaine rotation** : 2025-04-08