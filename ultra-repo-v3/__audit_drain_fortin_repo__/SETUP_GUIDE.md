# 🚀 Guide de Configuration Rapide - Drain Fortin

## ✅ Diagnostic Actuel

**Supabase**: ✅ Connecté (phiduqxcufdmgjvdipyu.supabase.co)  
**Frontend**: ✅ Fonctionne (port 5175)  
**Tables**: ⚠️ Certaines tables manquent peut-être

## 📋 Configuration Requise

### 1. **Créer les Tables Manquantes dans Supabase**

Allez dans **SQL Editor** de Supabase et exécutez :

```sql
-- Table leads (clients)
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  service_type TEXT,
  urgency TEXT,
  notes TEXT,
  status TEXT DEFAULT 'new',
  assigned_to TEXT
);

-- Table constraints (contraintes Guillaume)
CREATE TABLE IF NOT EXISTS constraints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  value JSONB,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0
);

-- Table sms_logs
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  phone_to TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error TEXT
);

-- Ajouter les 156 contraintes Guillaume
INSERT INTO constraints (category, description, value, priority) VALUES
('service', 'Prix minimum', '{"min": 350, "currency": "CAD"}', 100),
('service', 'Taxes applicables', '{"tps": 0.05, "tvq": 0.09975}', 99),
('service', 'Surcharge Rive-Sud', '{"amount": 100, "zones": ["Brossard", "Longueuil", "Boucherville"]}', 98),
('urgency', 'Priorité P1', '{"response_time": "1h", "sms": true, "call_owner": true}', 95),
('urgency', 'Priorité P2', '{"response_time": "4h", "sms": true}', 94),
('urgency', 'Priorité P3', '{"response_time": "24h", "sms": false}', 93),
('urgency', 'Priorité P4', '{"response_time": "48h", "sms": false}', 92)
ON CONFLICT DO NOTHING;
```

### 2. **Configurer les Edge Functions**

Dans Supabase, allez dans **Edge Functions** et déployez :

```bash
npx supabase functions deploy vapi-webhook
```

Ou créez manuellement dans Supabase Dashboard :
- Nom: `vapi-webhook`
- Région: La plus proche
- Copiez le code de `supabase/functions/vapi-webhook/index.ts`

### 3. **Configurer VAPI**

#### Obtenir vos clés VAPI :
1. Allez sur **[dashboard.vapi.ai](https://dashboard.vapi.ai)**
2. Créez un compte si nécessaire
3. Dans **Settings > API Keys** :
   - Public Key : `0559e007-874d-444c-8091-720b44d1c84c` (déjà configurée)
   - Private Key : À récupérer dans votre dashboard

#### Configurer l'Assistant :
1. Dans VAPI Dashboard > **Assistants**
2. Créez "Paul" ou mettez à jour l'existant
3. **Webhook URL** : `https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook`
4. **Secret** : Générez un secret HMAC fort

#### Configurer le Numéro :
1. Dans VAPI > **Phone Numbers**
2. Ajoutez ou vérifiez : **+1 450-280-3222**
3. Assignez l'assistant "Paul"

### 4. **Variables d'Environnement**

Votre `.env` frontend est déjà configuré correctement avec :
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY  
- ✅ VITE_VAPI_PUBLIC_KEY

Il manque dans le backend (créez `backend/.env`) :
```bash
SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[À récupérer dans Supabase Settings > API]
VAPI_PRIVATE_KEY=[À récupérer dans VAPI Dashboard]
VAPI_WEBHOOK_SECRET=[Le secret HMAC que vous avez généré]
```

## 🔗 Liens Directs

### Supabase
- **Dashboard** : [app.supabase.com](https://app.supabase.com)
- **Votre Projet** : [app.supabase.com/project/phiduqxcufdmgjvdipyu](https://app.supabase.com/project/phiduqxcufdmgjvdipyu)
- **SQL Editor** : [app.supabase.com/project/phiduqxcufdmgjvdipyu/editor](https://app.supabase.com/project/phiduqxcufdmgjvdipyu/editor)
- **API Settings** : [app.supabase.com/project/phiduqxcufdmgjvdipyu/settings/api](https://app.supabase.com/project/phiduqxcufdmgjvdipyu/settings/api)

### VAPI
- **Dashboard** : [dashboard.vapi.ai](https://dashboard.vapi.ai)
- **Assistants** : [dashboard.vapi.ai/assistants](https://dashboard.vapi.ai/assistants)
- **Phone Numbers** : [dashboard.vapi.ai/phone-numbers](https://dashboard.vapi.ai/phone-numbers)
- **API Keys** : [dashboard.vapi.ai/settings/api-keys](https://dashboard.vapi.ai/settings/api-keys)

### Documentation
- **Supabase Docs** : [supabase.com/docs](https://supabase.com/docs)
- **VAPI Docs** : [docs.vapi.ai](https://docs.vapi.ai)

## 🧪 Test Final

1. **Relancer le frontend** :
```bash
cd frontend
npm run dev
```

2. **Ouvrir** : http://localhost:5175

3. **Appeler** : +1 450-280-3222

Si tout fonctionne, vous devriez :
- ✅ Voir le dashboard sans erreur
- ✅ Paul répond au téléphone
- ✅ Les appels s'enregistrent dans la base

## ❓ Problèmes Fréquents

**"API indisponible"** → Vérifiez les tables Supabase (étape 1)  
**"Paul ne répond pas"** → Vérifiez la configuration VAPI (étape 3)  
**"Webhook error"** → Vérifiez le secret HMAC et l'URL  
**"No tables found"** → Exécutez le SQL de création des tables

## 📞 Support

Email : support@autoscaleai.ca  
Documentation : Ce fichier

---

*Dernière mise à jour : 9 septembre 2025*