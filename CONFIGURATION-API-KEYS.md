# 🔑 GUIDE DE CONFIGURATION DES CLÉS API - DRAIN FORTIN

## 📋 Clés Nécessaires pour le Système

### 1. **SUPABASE** (Base de données) 🗄️

**Variables à configurer:**
```env
SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
SUPABASE_ANON_KEY=[YOUR_SUPABASE_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SUPABASE_SERVICE_ROLE_KEY]
```

**Où les trouver:**
1. Connectez-vous à: https://supabase.com/dashboard
2. Sélectionnez votre projet: `phiduqxcufdmgjvdipyu`
3. Allez dans: **Settings** → **API**
4. Copiez:
   - **Project URL**: `https://phiduqxcufdmgjvdipyu.supabase.co`
   - **anon public**: Pour `SUPABASE_ANON_KEY`
   - **service_role secret**: Pour `SUPABASE_SERVICE_ROLE_KEY` ⚠️ GARDEZ SECRÈTE

---

### 2. **VAPI** (Assistant IA) 🤖

**Variables à configurer:**
```env
VAPI_API_KEY=votre-cle-api-vapi
VAPI_ASSISTANT_ID=votre-assistant-id
VAPI_WEBHOOK_SECRET=votre-webhook-secret
```

**Où les trouver:**
1. Connectez-vous à: https://vapi.ai/
2. Allez dans: **API Keys** (menu latéral)
3. Créez ou copiez votre clé API
4. Pour l'Assistant:
   - Allez dans **Assistants**
   - Créez ou sélectionnez votre assistant
   - Copiez l'ID de l'assistant
5. Pour le Webhook:
   - Dans les paramètres de l'assistant
   - Configurez l'URL webhook: `https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook`

---

### 3. **TWILIO** (SMS - Optionnel) 📱

**Variables à configurer:**
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+14389004385
TWILIO_SMS_ALERTS_TO=+15141234567
```

**Où les trouver:**
1. Connectez-vous à: https://console.twilio.com/
2. Sur le dashboard principal, vous verrez:
   - **Account SID**: Commence par `AC...`
   - **Auth Token**: Cliquez sur "Show" pour révéler
3. Pour le numéro de téléphone:
   - Allez dans **Phone Numbers** → **Manage** → **Active Numbers**
   - Copiez votre numéro Twilio

---

## 🚀 Configuration Rapide

### Étape 1: Créez le fichier `.env`
```bash
cp .env.example .env
```

### Étape 2: Éditez le fichier `.env`
```env
# === SUPABASE (OBLIGATOIRE) ===
SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
SUPABASE_ANON_KEY=[YOUR_SUPABASE_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SUPABASE_SERVICE_ROLE_KEY]

# === VAPI (OBLIGATOIRE) ===
VAPI_API_KEY=[VOTRE_CLE_ICI]
VAPI_ASSISTANT_ID=[VOTRE_ASSISTANT_ID]
VAPI_WEBHOOK_SECRET=[VOTRE_SECRET]

# === TWILIO (OPTIONNEL) ===
TWILIO_ACCOUNT_SID=[SI_VOUS_AVEZ_TWILIO]
TWILIO_AUTH_TOKEN=[SI_VOUS_AVEZ_TWILIO]
TWILIO_FROM=+14389004385
```

### Étape 3: Créez `.env` dans le frontend
```bash
cd frontend
cp .env.example .env.local
```

Éditez `frontend/.env.local`:
```env
VITE_SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQ5ODEsImV4cCI6MjA2Mjc2MDk4MX0.-oqrPSdoc0XHBH496ffAgLhEcvzb5f552SDPWxrNAsg
```

---

## ✅ Vérification

### Test Supabase:
```bash
node -e "const {createClient} = require('@supabase/supabase-js'); const s = createClient('https://phiduqxcufdmgjvdipyu.supabase.co', 'VOTRE_ANON_KEY'); s.from('call_logs').select('count').then(r => console.log('✅ Supabase OK:', r));"
```

### Test VAPI:
```bash
curl -X GET https://api.vapi.ai/assistant \
  -H "Authorization: Bearer VOTRE_VAPI_API_KEY"
```

### Test Twilio (si configuré):
```bash
node -e "const twilio = require('twilio')('ACCOUNT_SID', 'AUTH_TOKEN'); twilio.messages.list({limit: 1}).then(m => console.log('✅ Twilio OK'));"
```

---

## 🔒 Sécurité

### ⚠️ IMPORTANT:
1. **Ne jamais committer** les fichiers `.env` sur GitHub
2. **SERVICE_ROLE_KEY** = Accès total, gardez ULTRA SECRÈTE
3. **ANON_KEY** = Peut être publique (côté client)
4. Utilisez des variables d'environnement en production

### Pour Vercel:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add VAPI_API_KEY
```

---

## 📞 Support

### Liens utiles:
- **Supabase Dashboard**: https://supabase.com/dashboard/project/phiduqxcufdmgjvdipyu
- **VAPI Dashboard**: https://vapi.ai/
- **Twilio Console**: https://console.twilio.com/
- **Documentation Drain Fortin**: [README.md](./README.md)

### Besoin d'aide?
- Vérifiez que toutes les clés sont correctement copiées
- Assurez-vous qu'il n'y a pas d'espaces avant/après les clés
- Testez chaque service individuellement

---

## 🚀 Démarrage Rapide

Une fois toutes les clés configurées:

```bash
# 1. Installer les dépendances
npm install
cd frontend && npm install

# 2. Créer les tables Supabase
node create-supabase-tables.js

# 3. Démarrer le développement
cd frontend && npm run dev

# 4. Ouvrir dans le navigateur
http://localhost:5177
```

**Le système est maintenant prêt avec toutes les intégrations!** 🎉