# 🔑 CLÉS API ET SUPABASE - DRAIN FORTIN

## 📋 RÉSUMÉ COMPLET DES CLÉS API

### 🌐 **SUPABASE** (Base de Données Principale)

#### **URL du Projet:**
```
https://phiduqxcufdmgjvdipyu.supabase.co
```

#### **Clé Publique (ANON_KEY - Frontend):**
```
[REMOVED - USE ENVIRONMENT VARIABLE: SUPABASE_ANON_KEY]
```

#### **Clé Service Role (Backend - ULTRA SECRÈTE):**
```
[REMOVED - USE ENVIRONMENT VARIABLE: SUPABASE_SERVICE_ROLE_KEY]
```

---

## 🤖 **VAPI** (Assistant IA Téléphonique)

### **Configuration Requise:**
```env
VAPI_API_KEY=[À RÉCUPÉRER SUR VAPI.AI]
VAPI_ASSISTANT_ID=[ID DE VOTRE ASSISTANT]
VAPI_WEBHOOK_SECRET=[SECRET DU WEBHOOK]
```

### **Webhook URL:**
```
https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook
```

---

## 📱 **TWILIO** (SMS - Optionnel)

### **Configuration (si utilisée):**
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=[VOTRE_TOKEN]
TWILIO_FROM=+14389004385
```

---

## 🚀 **CONFIGURATION RAPIDE**

### **1. Pour le Frontend (.env):**
```env
VITE_SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
VITE_SUPABASE_ANON_KEY=[USE_YOUR_SUPABASE_ANON_KEY]
VITE_VAPI_PUBLIC_KEY=[USE_YOUR_VAPI_PUBLIC_KEY]
VITE_APP_ENV=development
```

### **2. Pour le Backend (.env):**
```env
SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
SUPABASE_ANON_KEY=[USE_YOUR_SUPABASE_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[USE_YOUR_SUPABASE_SERVICE_ROLE_KEY]
VAPI_API_KEY=[USE_YOUR_VAPI_API_KEY]
TWILIO_ACCOUNT_SID=[SI_UTILISÉ]
TWILIO_AUTH_TOKEN=[SI_UTILISÉ]
```

---

## 🔒 **SÉCURITÉ - POINTS CRITIQUES**

### **⚠️ CLÉ SERVICE ROLE:**
- **JAMAIS** dans le code frontend
- **JAMAIS** committée sur GitHub
- **UNIQUEMENT** côté serveur/backend
- **PROTÉGER** comme un mot de passe admin

### **✅ CLÉ ANON:**
- **SAFE** pour le frontend
- Peut être **publique** dans le code client
- Utilisée pour les opérations utilisateur standard

---

## 🧪 **TEST DES CLÉS**

### **Test Supabase:**
```bash
curl -X GET "https://phiduqxcufdmgjvdipyu.supabase.co/rest/v1/" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

### **Vérifier les Tables:**
- `vapi_calls` - Logs des appels
- `leads` - Prospects
- `sms_logs` - Logs SMS

---

## 📊 **STATUT ACTUEL**

### **✅ CONFIGURÉ:**
- ✅ Supabase URL
- ✅ Supabase ANON_KEY
- ✅ Supabase SERVICE_ROLE_KEY
- ✅ Structure de base de données

### **⏳ À CONFIGURER:**
- 🔄 VAPI_API_KEY (nécessaire pour les appels)
- 🔄 TWILIO (optionnel pour SMS)

---

## 🚀 **PROCHAINES ÉTAPES**

1. **Récupérer la clé VAPI** sur https://vapi.ai/
2. **Créer un assistant** dans VAPI
3. **Configurer le webhook** vers Supabase
4. **Tester les intégrations**

---

**📅 Dernière mise à jour:** Décembre 2025
**🔗 Dashboard Supabase:** https://supabase.com/dashboard/project/phiduqxcufdmgjvdipyu
