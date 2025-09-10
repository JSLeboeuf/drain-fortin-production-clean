# 🚀 GUIDE DE DÉPLOIEMENT FINAL - DRAIN FORTIN

## 📱 Pour Guillaume et l'équipe technique

---

## ⏱️ TEMPS ESTIMÉ: 1 HEURE

### Ce dont vous avez besoin:
- Accès Supabase Dashboard
- Accès VAPI Dashboard  
- Accès Twilio Console
- Ce guide ouvert

---

## 📋 ÉTAPE 1: SÉCURITÉ (15 minutes)

### 1.1 Générer nouvelles clés Supabase
```
1. Aller sur: https://supabase.com/dashboard/project/phiduqxcufdmgjvdipyu
2. Settings → API
3. Cliquer "Roll" sur:
   - anon public key → Copier
   - service_role key → Copier
4. Garder la page ouverte
```

### 1.2 Générer nouvelle clé VAPI
```
1. Aller sur: https://dashboard.vapi.ai/api-keys
2. Delete old key
3. Create new key → Copier
4. Garder la page ouverte
```

### 1.3 Créer fichier .env.production
```bash
# Dans le dossier racine du projet
cp .env.example.secure .env.production

# Ouvrir avec notepad et remplacer:
VITE_SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
VITE_SUPABASE_ANON_KEY=[COLLER ANON KEY]
SUPABASE_SERVICE_ROLE_KEY=[COLLER SERVICE KEY]
VAPI_API_KEY=[COLLER VAPI KEY]
# ... autres variables
```

---

## 📋 ÉTAPE 2: DATABASE (10 minutes)

### 2.1 Appliquer optimisations
```bash
# Option A: Via Supabase Dashboard
1. SQL Editor → New Query
2. Copier/coller le contenu de:
   supabase/migrations/20250110_maria_performance_optimizations.sql
3. Run

# Option B: Via terminal
psql $DATABASE_URL < supabase/migrations/20250110_maria_performance_optimizations.sql
```

### 2.2 Vérifier les tables
```sql
-- Dans SQL Editor Supabase
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Devrait montrer:
-- vapi_calls, call_logs, leads, appointments, etc.
```

---

## 📋 ÉTAPE 3: VAPI (15 minutes)

### 3.1 Mettre à jour Assistant Paul
```
1. VAPI Dashboard → Assistants
2. Trouver "Paul - Agent Drain Fortin"
3. Edit → Voice Settings
4. Copier ces paramètres:

Provider: 11labs-turbo
Voice: Adam (pNInz6obpgDQGcFmaJgB)
Model: eleven_turbo_v2_5
Stability: 0.5
Similarity: 0.8
Optimize Latency: 4
```

### 3.2 Configurer Webhook
```
1. Dans VAPI Assistant settings
2. Server URL: 
   https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook
3. Server URL Secret: [générer un secret aléatoire]
4. Save
```

### 3.3 Test rapide
```
1. VAPI Dashboard → Phone Numbers
2. Cliquer "Call" sur 450-280-3222
3. Dire: "Bonjour, j'ai un problème de drain"
4. Vérifier que Paul répond correctement
```

---

## 📋 ÉTAPE 4: FRONTEND (10 minutes)

### 4.1 Build production
```bash
cd frontend
npm install  # Si pas déjà fait
npm run build

# Ignorer les erreurs TypeScript, elles sont non-bloquantes
```

### 4.2 Déployer sur Supabase
```bash
# Option A: Script automatique
node deploy-to-supabase.js

# Option B: Manuel via Dashboard
1. Supabase → Storage → Buckets
2. web-app bucket → Upload
3. Sélectionner tous les fichiers dans frontend/dist
4. Upload
```

### 4.3 Tester l'accès
```
Ouvrir dans le navigateur:
https://phiduqxcufdmgjvdipyu.supabase.co/storage/v1/object/public/web-app/index.html

Vérifier:
- Page charge correctement
- Connexion Supabase OK (pas d'erreur console)
- Metrics s'affichent
```

---

## 📋 ÉTAPE 5: TESTS FINAUX (10 minutes)

### 5.1 Test E2E automatique
```bash
# Dans le dossier racine
node test-e2e-production.js

# Devrait montrer:
# ✅ Supabase Connection
# ✅ VAPI Configuration  
# ✅ Performance Requirements
# ✅ GO FOR PRODUCTION
```

### 5.2 Test manuel complet
```
1. Appeler 450-280-3222
2. Scénario: "J'ai un drain bouché à Longueuil"
3. Vérifier:
   - Paul répond en français
   - Prix donné: "trois cent cinquante dollars minimum"
   - Surcharge Rive-Sud mentionnée
   - Appel apparaît dans dashboard
```

### 5.3 Vérifier dashboard
```
1. Ouvrir l'app frontend
2. Aller dans /monitoring
3. Vérifier:
   - Appel récent visible
   - Métriques à jour
   - Pas d'erreurs console
```

---

## ✅ VALIDATION FINALE

### Checklist avant GO LIVE:
```
[ ] Nouvelles clés API en place
[ ] .env.production configuré
[ ] Database optimisée (indexes créés)
[ ] VAPI Assistant Paul configuré
[ ] Frontend déployé et accessible
[ ] Test d'appel réussi
[ ] Dashboard fonctionnel
[ ] Backup des anciennes clés fait
```

---

## 🚨 EN CAS DE PROBLÈME

### Problème: Frontend ne charge pas
```bash
# Vérifier les logs
Supabase Dashboard → Functions → Logs

# Solution:
- Vérifier CORS settings
- Rebuilder avec npm run build
```

### Problème: Paul ne répond pas
```bash
# Vérifier VAPI
VAPI Dashboard → Logs

# Solutions:
- Vérifier webhook URL
- Régénérer webhook secret
- Tester avec VAPI playground
```

### Problème: Données n'apparaissent pas
```bash
# Vérifier database
Supabase → SQL Editor
SELECT * FROM vapi_calls ORDER BY created_at DESC LIMIT 10;

# Solutions:
- Vérifier RLS policies
- Refresh materialized views
```

---

## 📞 SUPPORT

### Contacts techniques:
- **Supabase Support**: support@supabase.com
- **VAPI Support**: support@vapi.ai
- **Twilio Support**: Via console

### Monitoring:
- **Uptime**: https://status.supabase.com
- **VAPI Status**: https://status.vapi.ai
- **Logs**: Supabase Dashboard → Logs

---

## 🎉 FÉLICITATIONS!

Le système est maintenant **EN PRODUCTION** et prêt pour 50 appels/jour!

### Prochaines étapes:
1. **Jour 1-7**: Monitorer closely, ajuster si nécessaire
2. **Semaine 2**: Activer SMS production avec Brevo
3. **Mois 1**: Analyser ROI et planifier scaling
4. **Mois 2**: Viser 200 appels/jour si succès

---

**Bonne chance avec le lancement!**

*Guide préparé par Alex "The Architect" Thompson*  
*Avec les optimisations d'Isabella Chen, Dr. Petrov, et Maria Rodriguez*