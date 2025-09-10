# 🚨 PLAN D'ACTION IMMÉDIAT - DRAIN FORTIN PRODUCTION

## 🔴 ACTIONS CRITIQUES (À FAIRE MAINTENANT)

### 1. SÉCURISATION DES SECRETS (Priorité ABSOLUE)

#### Étape 1: Créer un nouveau vercel.json sécurisé
```json
{
  "name": "drain-fortin-dashboard",
  "version": 2,
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "cd frontend && npm install",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.vapi.ai"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### Étape 2: Configurer les variables dans Vercel Dashboard
```bash
# Via CLI Vercel (après login)
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add VAPI_API_KEY production
vercel env add VAPI_WEBHOOK_SECRET production
vercel env add TWILIO_AUTH_TOKEN production
```

#### Étape 3: Rotation des clés compromises
1. Aller dans Supabase Dashboard > Settings > API
2. Régénérer service_role key
3. Mettre à jour dans Vercel env
4. Redéployer

### 2. CRÉATION DES TESTS MANQUANTS

#### Tests Backend Outlook Services
```typescript
// backend/tests/outlook-service.test.ts
import { describe, it, expect, vi } from 'vitest'
import { OutlookService } from '../src/services/outlook'

describe('OutlookService', () => {
  it('should authenticate with Microsoft Graph', async () => {
    // Test implementation
  })
  
  it('should sync calendar events', async () => {
    // Test implementation
  })
  
  it('should handle rate limiting', async () => {
    // Test implementation
  })
})
```

#### Tests Integration VAPI
```typescript
// backend/tests/vapi-integration.test.ts
import { describe, it, expect } from 'vitest'
import { VAPIWebhookHandler } from '../src/services/vapi'

describe('VAPI Integration', () => {
  it('should validate webhook signatures', async () => {
    // Test implementation
  })
  
  it('should process call events', async () => {
    // Test implementation
  })
})
```

### 3. CONFIGURATION UNIFIÉE

#### Créer un fichier de configuration central
```typescript
// config/app.config.ts
export const config = {
  supabase: {
    url: process.env.VITE_SUPABASE_URL!,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
  },
  vapi: {
    apiKey: process.env.VAPI_API_KEY!,
    webhookSecret: process.env.VAPI_WEBHOOK_SECRET!,
    assistantId: process.env.VAPI_ASSISTANT_ID!
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER!
  },
  app: {
    environment: process.env.NODE_ENV || 'development',
    url: process.env.APP_URL || 'http://localhost:5173'
  }
}

// Validation au démarrage
export function validateConfig() {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VAPI_API_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
```

### 4. SCRIPTS D'AUTOMATISATION

#### Script de vérification pré-déploiement
```bash
#!/bin/bash
# scripts/pre-deploy-check.sh

echo "🔍 Vérification pré-déploiement..."

# Check for exposed secrets
echo "Checking for exposed secrets..."
if grep -r "eyJ" --include="*.json" --include="*.js" --include="*.ts" --exclude-dir=node_modules .; then
  echo "❌ ERREUR: Secrets potentiels trouvés dans le code!"
  exit 1
fi

# Run tests
echo "Running tests..."
npm run test:coverage

# Check test coverage
COVERAGE=$(npm run test:coverage | grep "All files" | awk '{print $10}' | sed 's/%//')
if [ "$COVERAGE" -lt 80 ]; then
  echo "❌ ERREUR: Coverage insuffisant ($COVERAGE%)"
  exit 1
fi

# Type check
echo "Type checking..."
npm run type-check

# Build test
echo "Testing build..."
npm run build

echo "✅ Toutes les vérifications passées!"
```

#### Script de déploiement sécurisé
```bash
#!/bin/bash
# scripts/deploy-secure.sh

# Vérification pré-déploiement
./scripts/pre-deploy-check.sh || exit 1

# Backup database
echo "📦 Backup de la base de données..."
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Deploy to staging first
echo "🚀 Déploiement en staging..."
vercel --env preview

# Run smoke tests
echo "🧪 Tests de fumée..."
npm run test:e2e -- --url=$STAGING_URL

# Deploy to production
echo "🚀 Déploiement en production..."
vercel --prod

# Verify deployment
echo "✅ Vérification du déploiement..."
curl -f $PRODUCTION_URL/api/health || exit 1

echo "✅ Déploiement réussi!"
```

### 5. MONITORING IMMÉDIAT

#### Configuration Sentry
```typescript
// frontend/src/lib/monitoring.ts
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

#### Health Check Endpoint
```typescript
// backend/src/routes/health.ts
export async function healthCheck(req: Request) {
  const checks = {
    database: false,
    redis: false,
    vapi: false,
    outlook: false
  }
  
  try {
    // Check database
    await supabase.from('health_check').select('*').limit(1)
    checks.database = true
    
    // Check Redis
    await redis.ping()
    checks.redis = true
    
    // Check VAPI
    const vapiResponse = await fetch('https://api.vapi.ai/health')
    checks.vapi = vapiResponse.ok
    
    // Check Outlook
    const graphClient = await getGraphClient()
    await graphClient.api('/me').get()
    checks.outlook = true
    
  } catch (error) {
    console.error('Health check failed:', error)
  }
  
  const allHealthy = Object.values(checks).every(v => v)
  
  return new Response(JSON.stringify({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }), {
    status: allHealthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

## 📋 CHECKLIST D'EXÉCUTION

### Immédiat (Prochaines 2 heures)
- [ ] Sauvegarder vercel.json actuel
- [ ] Créer nouveau vercel.json sans secrets
- [ ] Configurer variables dans Vercel Dashboard
- [ ] Commit et push des changements
- [ ] Redéployer avec nouvelles variables

### Aujourd'hui
- [ ] Implémenter tests Outlook
- [ ] Implémenter tests VAPI
- [ ] Créer configuration centralisée
- [ ] Mettre en place health checks
- [ ] Configurer Sentry

### Demain
- [ ] Scripts d'automatisation
- [ ] Tests E2E complets
- [ ] Optimisations performance
- [ ] Documentation API
- [ ] Formation équipe

## 🚀 COMMANDES À EXÉCUTER

```bash
# 1. Sécurisation immédiate
git rm vercel.json
git add vercel.json.example
git commit -m "fix: remove exposed secrets from vercel.json"
git push

# 2. Installation Vercel CLI
npm i -g vercel

# 3. Configuration des variables
vercel login
vercel env pull
vercel env add [VARIABLE_NAME] production

# 4. Tests
npm run test:coverage
npm run test:e2e

# 5. Déploiement sécurisé
vercel --prod
```

## ⚠️ POINTS D'ATTENTION

1. **NE PAS** commiter de secrets dans le code
2. **TOUJOURS** utiliser des variables d'environnement
3. **TESTER** en staging avant production
4. **BACKUP** avant chaque déploiement
5. **MONITORER** après déploiement

---

*Plan d'action généré pour résolution immédiate*
*Temps estimé: 4-6 heures pour sécurisation complète*