# 🚀 Déploiement Sécurisé - Checklist

## ✅ Pré-Déploiement

### Secrets et Variables d'Environnement
- [ ] Toutes les clés API sont configurées dans le gestionnaire de secrets
- [ ] Aucun fichier .env n'est commité dans Git
- [ ] Les clés de test sont différentes des clés de production
- [ ] VAPI_WEBHOOK_SECRET est un secret cryptographiquement sûr (32+ caractères)
- [ ] Rotation des clés effectuée si nécessaire

### Configuration CORS
- [ ] CORS configuré avec domaines spécifiques uniquement
- [ ] Aucun wildcard "*" en production
- [ ] Variables ALLOWED_ORIGINS correctement définies
- [ ] Tests de CORS effectués depuis les domaines autorisés

### Validation de Code
- [ ] Aucun console.log avec données sensibles
- [ ] Aucun secret hardcodé dans le code
- [ ] Headers de sécurité configurés
- [ ] Validation d'entrée implémentée

## 🔧 Déploiement

### Script de Déploiement Sécurisé
```powershell
# Utiliser le script sécurisé
./scripts/secure-deploy.ps1 -Environment production -Validate

# Si validation OK, déployer
./scripts/secure-deploy.ps1 -Environment production
```

### Vérifications Post-Déploiement
- [ ] Webhook répond au health check
- [ ] CORS fonctionne correctement
- [ ] Rate limiting actif
- [ ] Signatures VAPI validées
- [ ] Logs de sécurité fonctionnels

## 🛡️ Tests de Sécurité

### Tests Automatisés
```bash
# Test CORS
curl -H "Origin: https://malicious-domain.com" https://your-webhook-url
# Doit retourner 403 Forbidden

# Test Rate Limiting
for i in {1..15}; do curl https://your-webhook-url; done
# Doit retourner 429 après 10 requêtes

# Test Health Check
curl https://your-webhook-url -d '{"type":"health-check"}'
# Doit retourner {"success":true}

# Test Signature Validation (production seulement)
curl https://your-webhook-url -d '{"type":"test"}' -H "x-vapi-signature: invalid"
# Doit retourner 401 Unauthorized
```

### Tests Manuels
- [ ] Interface CRM accessible depuis les domaines autorisés
- [ ] Webhook VAPI fonctionne en production
- [ ] SMS d'alerte envoyés correctement
- [ ] Logs de sécurité enregistrés

## 📊 Monitoring Post-Déploiement

### Métriques à Surveiller (première heure)
- [ ] Nombre de requêtes bloquées par CORS
- [ ] Tentatives d'accès avec signatures invalides  
- [ ] Événements de rate limiting
- [ ] Erreurs 5xx

### Dashboard de Sécurité
```sql
-- Voir les événements de sécurité récents
SELECT * FROM security_dashboard;

-- Statistiques détaillées
SELECT get_security_stats(interval '1 hour');
```

## 🚨 Actions en Cas de Problème

### Si le webhook ne répond pas
1. Vérifier les logs Supabase Functions
2. Valider les variables d'environnement
3. Tester la connectivité depuis VAPI

### Si CORS bloque les requêtes légitimes  
1. Vérifier ALLOWED_ORIGINS
2. Ajouter le domaine manquant
3. Redéployer la configuration

### Si les signatures échouent
1. Vérifier VAPI_WEBHOOK_SECRET
2. Confirmer le format de signature VAPI
3. Tester avec un payload de test

## 🔄 Rollback d'Urgence

### Si problème critique détecté
```powershell
# Revenir à la version précédente
git revert HEAD
./scripts/secure-deploy.ps1 -Environment production

# Ou désactiver temporairement la validation en production
# En urgence seulement - corriger rapidement
```

## 📝 Documentation de Déploiement

### À Documenter Après Chaque Déploiement
- [ ] Version déployée (commit hash)
- [ ] Heure de déploiement
- [ ] Environnement cible
- [ ] Tests effectués
- [ ] Problèmes rencontrés et résolutions
- [ ] Prochaine révision planifiée

### Template de Note de Déploiement
```
Date: 2025-09-08
Version: [commit hash]
Environnement: Production
Déployé par: [nom]

Changements:
- Sécurisation CORS
- Amélioration validation webhook
- Ajout monitoring sécurité

Tests effectués:
✅ Health check
✅ CORS validation
✅ Rate limiting
✅ Signature verification

Métriques post-déploiement:
- Latence moyenne: Xms
- Taux d'erreur: X%
- Événements sécurité: X

Prochaine action: Révision dans 24h
```

---

**⚡ En cas d'urgence sécuritaire:**
1. Révoquer immédiatement toutes les clés API
2. Bloquer le trafic suspect via CORS
3. Notifier l'équipe technique
4. Documenter l'incident
5. Mettre à jour les secrets dans les 30 minutes