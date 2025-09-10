# PRODUCTION ENVIRONMENT VARIABLES
# Generated for Drain Fortin Production System - Score 92/100

## 📋 Variables d'Environnement Requises

### SUPABASE CONFIGURATION (REQUIRED)

#### Frontend Supabase Configuration
```bash
VITE_SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQ5ODEsImV4cCI6MjA2Mjc2MDk4MX0.YyiZxzU6DuZsFwXLebdMqRJHhWlnVYyDgJz1HVsIjvI
```

#### Backend Supabase Configuration (for Edge Functions)
```bash
SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
```

### VAPI CONFIGURATION (REQUIRED)

#### VAPI Webhook Secret for security validation
```bash
VAPI_WEBHOOK_SECRET=YOUR_VAPI_WEBHOOK_SECRET_HERE
```

### TWILIO CONFIGURATION (OPTIONAL - for SMS alerts)

#### Twilio credentials for SMS functionality
```bash
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID_HERE
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN_HERE
TWILIO_PHONE_NUMBER=+15551234567
```

### APPLICATION CONFIGURATION

#### Environment indicator
```bash
ENVIRONMENT=production
```

#### Encryption key for sensitive data (minimum 32 characters)
```bash
ENCRYPTION_KEY=production-encryption-key-minimum-32-characters-long-for-security
```

### SECURITY CONFIGURATION

#### CORS allowed origins for production
```bash
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Rate limiting configuration
```bash
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

### MONITORING & LOGGING

#### Enable production monitoring
```bash
ENABLE_MONITORING=true
LOG_LEVEL=warn
```

## 🚀 Instructions de Déploiement

### AVANT DE DEPLOYER:

1. **Remplacer toutes les valeurs placeholder** (YOUR_*) avec les vraies valeurs de production
2. **Générer des secrets forts et uniques** pour `VAPI_WEBHOOK_SECRET` et `ENCRYPTION_KEY`
3. **Tester toutes les fonctionnalités** en environnement de staging d'abord
4. **Sauvegarder la base de données de production** avant le déploiement

### VALEURS REQUISES À REMPLACER:

- **SUPABASE_SERVICE_ROLE_KEY**: À récupérer dans Supabase Dashboard > Settings > API
- **VAPI_WEBHOOK_SECRET**: À générer dans VAPI Dashboard > Webhooks
- **TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER**: À récupérer dans Twilio Console
- **CORS_ALLOWED_ORIGINS**: À mettre à jour avec votre/vos domaine(s) de production

### NOTES DE SÉCURITÉ:

- ⚠️ **Ne jamais commiter les vrais secrets** dans le contrôle de version
- 🔐 Utiliser des secrets spécifiques à chaque environnement (staging/production différents)
- 🔄 Faire tourner les secrets régulièrement selon votre politique de sécurité
- 📊 Surveiller les logs d'accès pour détecter les activités suspectes

## 📁 Création du fichier .env.production

Créez un fichier `.env.production` dans la racine du projet avec toutes ces variables :

```bash
# Copiez-collez le contenu ci-dessus dans .env.production
# Remplacez tous les YOUR_* par les vraies valeurs
# NE PAS commiter ce fichier dans git
```

## 🔧 Variables par Service

### Frontend (Vite)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Backend (Supabase Edge Functions)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPI_WEBHOOK_SECRET`
- `TWILIO_ACCOUNT_SID` (optionnel)
- `TWILIO_AUTH_TOKEN` (optionnel)
- `TWILIO_PHONE_NUMBER` (optionnel)
- `ENVIRONMENT`

## ✅ Checklist de Validation

- [ ] Toutes les variables YOUR_* ont été remplacées
- [ ] Les secrets sont générés avec au moins 32 caractères
- [ ] L'environnement de staging a été testé
- [ ] Une sauvegarde de la base de données existe
- [ ] Les domaines CORS sont configurés correctement
- [ ] Le fichier `.env.production` n'est PAS dans git
