# 🔐 GUIDE DE RÉGÉNÉRATION DES CLÉS - URGENT

## ⚠️ TOUTES VOS CLÉS SONT COMPROMISES - RÉGÉNÉREZ MAINTENANT

### 1. SUPABASE (5 minutes)
```
1. Aller sur: https://supabase.com/dashboard/project/phiduqxcufdmgjvdipyu/settings/api
2. Section "Project API keys"
3. Cliquer "Roll" sur anon key → Copier
4. Cliquer "Roll" sur service_role key → Copier
5. Mettre à jour dans .env.local:
   VITE_SUPABASE_ANON_KEY=nouvelle_cle_anon
   SUPABASE_SERVICE_ROLE_KEY=nouvelle_cle_service
```

### 2. VAPI (3 minutes)
```
1. Aller sur: https://dashboard.vapi.ai/api-keys
2. DELETE l'ancienne clé compromise
3. "Create New Key" → Copier
4. Mettre à jour dans .env.local:
   VAPI_API_KEY=nouvelle_cle_vapi
```

### 3. WEBHOOK SECRET (2 minutes)
```
1. Générer un nouveau secret:
   openssl rand -hex 32
   
2. Mettre à jour dans .env.local:
   VAPI_WEBHOOK_SECRET=nouveau_secret_genere
   
3. Mettre à jour dans VAPI Dashboard:
   Assistants → Paul → Server URL Secret
```

### 4. TWILIO (si utilisé)
```
1. https://console.twilio.com/account/keys
2. Créer nouvelle API key
3. Mettre à jour auth token
```

### 5. BREVO SMS (si configuré)
```
1. https://app.brevo.com/settings/keys/api
2. Régénérer API key
3. Mettre à jour dans .env.local
```

## ⚠️ APRÈS RÉGÉNÉRATION:

1. **Mettre à jour PARTOUT**:
   - .env.local (local)
   - Supabase Edge Functions secrets
   - VAPI Dashboard settings
   - CI/CD environment variables

2. **Tester IMMÉDIATEMENT**:
   ```bash
   node test-brutal-reality-check.js
   ```

3. **Notifier l'équipe**:
   - Tous doivent mettre à jour leurs .env.local
   - Anciens déploiements vont CESSER de fonctionner

## 🚨 IMPORTANT:
Les anciennes clés sont PUBLIQUES sur GitHub. N'importe qui peut les utiliser MAINTENANT.
RÉGÉNÉREZ IMMÉDIATEMENT!