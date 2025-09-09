# 🔒 Sécurité - Système CRM Drain Fortin

## 🚨 Checklist de Sécurité Pre-Deployment

### Variables d'Environnement
- [ ] Tous les secrets sont dans des fichiers .env non-committes
- [ ] .env.production supprimé du repository
- [ ] Variables d'environnement configurées sur la plateforme de déploiement
- [ ] Rotation des clés API effectuée

### Configuration CORS
- [ ] CORS configuré avec domaines spécifiques uniquement
- [ ] Aucun wildcard "*" en production
- [ ] Headers de sécurité appropriés configurés

### Authentification & Autorisation
- [ ] Tokens VAPI avec expiration configurée
- [ ] Service Role Keys protégées côté serveur uniquement
- [ ] Rate limiting configuré sur les endpoints publics

### Headers de Sécurité
- [ ] Content-Security-Policy configuré
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy: strict-origin-when-cross-origin

## 🔑 Gestion des Secrets

### Secrets Requis
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# VAPI
VAPI_API_KEY=vapi_sk_xxx
VAPI_WEBHOOK_SECRET=your_webhook_secret
VAPI_PUBLIC_KEY=vapi_pk_xxx
VAPI_ASSISTANT_ID=your_assistant_id

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxx
```

### Rotation des Clés
- **Fréquence**: Trimestrielle minimum
- **Processus**: 
  1. Générer nouvelles clés
  2. Tester en staging
  3. Déployer en production
  4. Vérifier fonctionnement
  5. Révoquer anciennes clés

## 🛡️ Configuration de Sécurité

### Domaines Autorisés (CORS)
```typescript
const ALLOWED_ORIGINS = [
  'https://drain-fortin-crm.com',
  'https://www.drain-fortin.com',
  'https://phiduqxcufdmgjvdipyu.supabase.co'
];
```

### Rate Limiting
```typescript
const RATE_LIMITS = {
  webhook: '10 requests per minute',
  api: '100 requests per minute',
  auth: '5 requests per minute'
};
```

### Validation des Webhooks
```typescript
// VAPI Webhook Signature Validation
const validateSignature = (payload: string, signature: string, secret: string): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};
```

## 🚫 Interdictions Strictes

### En Production
- ❌ Aucun secret en dur dans le code
- ❌ Aucun CORS "*" wildcard
- ❌ Aucun console.log avec données sensibles
- ❌ Aucune variable d'environnement commitee

### Logging Sécurisé
- ✅ Logger les tentatives d'accès non autorisées
- ✅ Masquer les données sensibles dans les logs
- ✅ Monitorer les patterns d'attaque

## 📊 Monitoring de Sécurité

### Alertes Critiques
- Tentatives d'accès avec tokens invalides
- Nombres anormaux de requêtes depuis une IP
- Erreurs de validation de signature webhook
- Accès aux endpoints administrateurs

### Métriques de Sécurité
- Taux de requêtes bloquées par CORS
- Nombre de tentatives d'authentification échouées
- Latence des validations de signature

## 🔄 Procédure d'Incident

### En cas de compromission
1. **Immédiat**: Révoquer toutes les clés API
2. **5 min**: Déployer nouvelles clés en urgence
3. **15 min**: Analyser les logs d'accès
4. **30 min**: Notifier les parties prenantes
5. **24h**: Rapport post-incident complet

### Contacts d'Urgence
- **Technique**: [email technique]
- **Supabase Support**: support@supabase.com
- **VAPI Support**: support@vapi.ai

---

**Dernière révision**: 2025-09-08
**Prochaine révision**: 2025-12-08
**Responsable**: Équipe Développement Drain Fortin