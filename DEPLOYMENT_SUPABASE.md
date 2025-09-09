# 🚀 Guide de Déploiement Supabase Pro

## 📋 Prérequis

- Compte Supabase Pro actif
- Supabase CLI installé (`npm install -g supabase`)
- Git configuré avec accès au repo
- Variables d'environnement configurées

## 🔧 Configuration Initiale

### 1. Installation Supabase CLI

```bash
npm install -g supabase
supabase --version
```

### 2. Connexion à Supabase

```bash
supabase login
```

### 3. Lier le Projet

```bash
# Dans le dossier racine du projet
supabase link --project-ref your-project-ref
```

## 📦 Structure du Projet

```
/drain-fortin-production-clean
├── supabase/
│   ├── config.toml              # Configuration Supabase
│   ├── functions/               # Edge Functions
│   │   ├── vapi-webhook/        # Webhook VAPI
│   │   ├── health/              # Health check
│   │   └── _shared/             # Code partagé
│   └── migrations/              # Migrations SQL
├── frontend/                    # Application React
└── backend/                     # Backend Node.js (legacy)
```

## 🗄️ Base de Données

### Appliquer les Migrations

```bash
# Développement local
supabase db reset

# Production
supabase db push
```

### Tables Créées

- `call_logs` - Logs des appels VAPI
- `appointments` - Rendez-vous clients
- `availability` - Disponibilités
- `rate_limits` - Limites de taux
- `analytics` - Événements analytics

## ⚡ Edge Functions

### Déployer les Functions

```bash
# Déployer toutes les functions
supabase functions deploy

# Déployer une function spécifique
supabase functions deploy vapi-webhook
supabase functions deploy health
```

### Configurer les Secrets

```bash
# Production
supabase secrets set VAPI_SERVER_SECRET=your-secret
supabase secrets set BREVO_API_KEY=your-key
supabase secrets set SENTRY_DSN=your-dsn
```

## 🌐 Frontend

### Build Production

```bash
cd frontend
npm install
npm run build
```

### Variables d'Environnement Frontend

Créer `.env.production`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_EDGE_FUNCTION_BASE_URL=https://your-project-ref.supabase.co/functions/v1
```

## 🔄 CI/CD avec GitHub Actions

Le workflow `.github/workflows/supabase-deploy.yml` automatise:

1. Tests et validation
2. Build du frontend
3. Déploiement des Edge Functions
4. Application des migrations
5. Health checks

### Configurer les Secrets GitHub

Dans Settings > Secrets:

```
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_ID
SUPABASE_PROJECT_REF
VAPI_SERVER_SECRET
BREVO_API_KEY
SENTRY_DSN
```

## 📊 Monitoring

### Health Check

```bash
curl https://your-project-ref.supabase.co/functions/v1/health
```

### Logs

```bash
# Voir les logs des functions
supabase functions logs vapi-webhook --tail

# Logs de la base de données
supabase db logs --tail
```

## 🚦 Environnements

### Development

```bash
# Démarrer Supabase local
supabase start

# Frontend
cd frontend && npm run dev

# URL: http://localhost:5173
# Supabase Studio: http://localhost:54323
```

### Staging

```bash
# Déployer sur branche staging
git checkout staging
git push origin staging
# GitHub Actions déploie automatiquement
```

### Production

```bash
# Merger dans main
git checkout main
git merge staging
git push origin main
# GitHub Actions déploie automatiquement
```

## 🔒 Sécurité

### Checklist Production

- [x] HMAC validation sur webhooks
- [x] CORS configuré
- [x] Rate limiting activé
- [x] RLS (Row Level Security) configuré
- [x] Secrets en variables d'environnement
- [x] HTTPS obligatoire
- [x] Monitoring Sentry actif

## 📝 Scripts Utiles

### Backup Base de Données

```bash
# Windows
powershell .\scripts\backup.ps1

# Linux/Mac
supabase db dump > backup-$(date +%Y%m%d).sql
```

### Reset Rate Limits

```sql
-- Dans Supabase SQL Editor
DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
```

## 🆘 Troubleshooting

### Function ne répond pas

```bash
# Vérifier les logs
supabase functions logs vapi-webhook --tail

# Redéployer
supabase functions deploy vapi-webhook
```

### Erreur de migration

```bash
# Rollback
supabase db reset --local

# Réappliquer
supabase db push
```

### Variables d'environnement manquantes

```bash
# Lister les secrets
supabase secrets list

# Ajouter un secret
supabase secrets set KEY=value
```

## 📈 Limites Supabase Pro

- **API Requests**: 2M/mois
- **Database**: 8GB
- **Storage**: 100GB
- **Bandwidth**: 250GB/mois
- **Edge Functions**: 2M invocations/mois
- **Concurrent Connections**: 100

## 🔗 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [CLI Reference](https://supabase.com/docs/reference/cli)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [GitHub Actions Integration](https://supabase.com/docs/guides/platform/github-actions)

---

**Version**: 1.0.1  
**Dernière mise à jour**: 2025-01-09  
**Status**: Production Ready avec Supabase Pro