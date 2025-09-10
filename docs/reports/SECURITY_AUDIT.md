# 🔒 AUDIT DE SÉCURITÉ - DRAIN FORTIN PRODUCTION

**Date**: 2025-09-08  
**Classification**: CONFIDENTIEL  
**Sévérité Globale**: CRITIQUE  
**Action Requise**: IMMÉDIATE

---

## 🚨 ALERTES CRITIQUES

### 🔴 SECRETS EXPOSÉS (Sévérité: CRITIQUE)

#### Fichiers Compromis
```
.env.example:
- VAPI_API_KEY visible
- JWT_SECRET en exemple
- HMAC_SECRET exposé
- Database credentials

Scripts (vapi-*.js):
- API keys hardcodées
- Tokens non masqués

Tests:
- VAPI_WEBHOOK_SECRET en clair
- Mock credentials non anonymisés
```

#### Impact
- **Accès non autorisé** aux systèmes externes
- **Compromission** de la base de données
- **Usurpation d'identité** via JWT
- **Bypass** de la validation webhook

#### Remédiation URGENTE
```bash
# 1. Rotation immédiate des secrets
./scripts/rotate-secrets.ps1

# 2. Scan des commits Git
git-secrets --scan-history

# 3. Mise en place HashiCorp Vault
vault kv put secret/drain-fortin/prod @secrets.json
```

---

## 🛡️ VULNÉRABILITÉS PAR CATÉGORIE

### 1. INJECTION (OWASP #1)

#### SQL Injection
**Localisation**: `backend/supabase/functions/_shared/services/db-optimizer.ts`
```typescript
// VULNÉRABLE
const query = `SELECT * FROM users WHERE id = ${userId}`;

// CORRIGÉ
const query = 'SELECT * FROM users WHERE id = $1';
const result = await client.query(query, [userId]);
```

#### XSS (Cross-Site Scripting)
**Localisation**: Multiple composants React
```typescript
// VULNÉRABLE
<div dangerouslySetInnerHTML={{__html: userInput}} />

// CORRIGÉ
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(userInput)}} />
```

### 2. AUTHENTIFICATION FAIBLE (OWASP #2)

#### Problèmes Identifiés
- Pas de MFA (Multi-Factor Authentication)
- Sessions sans expiration
- Tokens JWT sans rotation
- Pas de rate limiting sur login

#### Patch Recommandé
```typescript
// backend/supabase/functions/_shared/middleware/auth.ts
export const authMiddleware = async (req: Request) => {
  // Ajout rate limiting
  const ip = req.headers.get('x-forwarded-for');
  if (await isRateLimited(ip, 'auth', 5, 300)) {
    throw new Error('Too many attempts');
  }

  // Validation token avec expiration
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('No token');
  
  const payload = jwt.verify(token, process.env.JWT_SECRET!, {
    algorithms: ['HS256'],
    maxAge: '1h', // Expiration stricte
  });

  // Rotation automatique
  if (payload.iat < Date.now() - 30 * 60 * 1000) {
    return generateNewToken(payload);
  }
  
  return payload;
};
```

### 3. EXPOSITION DE DONNÉES SENSIBLES (OWASP #3)

#### PII dans les Logs
```typescript
// VULNÉRABLE
console.log('User login:', { email, password, phone });

// CORRIGÉ
console.log('User login:', { 
  email: maskEmail(email),
  userId: hashUserId(id)
});
```

#### Headers Sensibles Exposés
```yaml
# Headers manquants ou mal configurés
X-Frame-Options: MISSING
Strict-Transport-Security: max-age=31536000 # Manque includeSubDomains
X-Content-Type-Options: MISSING
Referrer-Policy: MISSING
Permissions-Policy: MISSING
```

### 4. CONFIGURATION DE SÉCURITÉ (OWASP #5)

#### CORS Trop Permissif
```typescript
// VULNÉRABLE
cors: {
  origin: '*',
  credentials: true
}

// CORRIGÉ
cors: {
  origin: [
    'https://drainfortin.com',
    'https://app.drainfortin.com'
  ],
  credentials: true,
  maxAge: 86400
}
```

#### CSP (Content Security Policy) Manquant
```typescript
// Ajout nécessaire
const cspHeader = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.drainfortin.com wss://",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
};
```

### 5. WEBHOOKS NON SÉCURISÉS

#### Validation HMAC Manquante
```typescript
// backend/supabase/functions/vapi-webhook/index.ts
// VULNÉRABLE - Pas de validation complète

// CORRIGÉ
import { createHmac, timingSafeEqual } from 'crypto';

export const validateWebhook = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const computed = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  // Protection timing attack
  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computed)
  );
};

// Anti-replay protection
const processedRequests = new Set<string>();
export const preventReplay = (requestId: string, timestamp: number) => {
  // Reject old requests (>5 minutes)
  if (Date.now() - timestamp > 5 * 60 * 1000) {
    throw new Error('Request too old');
  }
  
  // Reject duplicates
  if (processedRequests.has(requestId)) {
    throw new Error('Duplicate request');
  }
  
  processedRequests.add(requestId);
  // Cleanup old entries
  setTimeout(() => processedRequests.delete(requestId), 10 * 60 * 1000);
};
```

---

## 🔐 GESTION DES SECRETS - PLAN D'ACTION

### Architecture Recommandée
```
┌─────────────────┐
│  HashiCorp      │
│     Vault       │ ← Source de vérité
└────────┬────────┘
         │
    ┌────▼────┐
    │ GitHub  │
    │ Secrets │ ← CI/CD seulement
    └────┬────┘
         │
┌────────▼────────┐
│   Supabase      │
│   Vault         │ ← Runtime secrets
└─────────────────┘
```

### Migration des Secrets
```bash
# Script de migration complet
#!/bin/bash

# 1. Extraction des secrets actuels
echo "Extracting current secrets..."
node scripts/extract-secrets.js > secrets.json

# 2. Rotation
echo "Rotating all secrets..."
node scripts/rotate-secrets.js

# 3. Upload vers Vault
echo "Uploading to Vault..."
vault kv put secret/drain-fortin/prod @secrets.json

# 4. Cleanup
shred -vfz secrets.json

# 5. Mise à jour des références
echo "Updating references..."
find . -type f -name "*.ts" -o -name "*.js" | xargs sed -i 's/process\.env\./vault\./g'
```

---

## 🚦 RATE LIMITING - IMPLÉMENTATION

### Configuration par Endpoint
```typescript
// backend/supabase/functions/_shared/middleware/rate-limit.ts
export const rateLimitConfig = {
  // Auth endpoints - très restrictif
  '/auth/login': { max: 5, window: 300 }, // 5 tentatives / 5 min
  '/auth/register': { max: 3, window: 3600 }, // 3 / heure
  '/auth/reset': { max: 3, window: 3600 },
  
  // API endpoints - modéré
  '/api/*': { max: 100, window: 60 }, // 100 / minute
  
  // Webhooks - permissif mais surveillé
  '/webhook/*': { max: 1000, window: 60 }, // 1000 / minute
  
  // Public - restrictif
  '/public/*': { max: 30, window: 60 } // 30 / minute
};

// Implementation avec Redis
export class RateLimiter {
  constructor(private redis: Redis) {}
  
  async check(key: string, limit: number, window: number): Promise<boolean> {
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, window);
    }
    
    if (current > limit) {
      const ttl = await this.redis.ttl(key);
      throw new RateLimitError(`Rate limit exceeded. Retry in ${ttl}s`);
    }
    
    return true;
  }
}
```

---

## 🔍 SCAN DES DÉPENDANCES

### Vulnérabilités NPM
```bash
# Résultat npm audit
┌─────────────┬──────────────────────────────┐
│ Severity    │ Count                        │
├─────────────┼──────────────────────────────┤
│ Critical    │ 0                            │
│ High        │ 2                            │
│ Moderate    │ 5                            │
│ Low         │ 12                           │
└─────────────┴──────────────────────────────┘

# Corrections requises
npm update vite@latest --save
npm update terser@latest --save
npm audit fix --force
```

### Dépendances à Risque
```json
{
  "high-risk": [
    "vite@5.4.19", // XSS vulnerability
    "terser@5.44.0" // Potential RCE
  ],
  "medium-risk": [
    "@supabase/supabase-js@2.57.0", // Update available
    "wouter@3.0.0" // Security patch needed
  ],
  "monitor": [
    "dompurify@3.2.6", // Keep updated
    "@sentry/browser@7.118.0" // Check configuration
  ]
}
```

---

## 📋 CHECKLIST DE SÉCURITÉ PRODUCTION

### Avant Déploiement (OBLIGATOIRE)
- [ ] Rotation complète des secrets
- [ ] Scan des vulnérabilités (npm audit clean)
- [ ] Tests de pénétration basiques
- [ ] Validation HMAC sur tous les webhooks
- [ ] Rate limiting actif sur tous les endpoints
- [ ] Headers de sécurité configurés
- [ ] CSP policy active
- [ ] HTTPS only (HSTS)
- [ ] Logs sans PII
- [ ] Backup des données chiffrées

### Configuration Production
```env
# .env.production (exemple sécurisé)
NODE_ENV=production
LOG_LEVEL=error

# Secrets via Vault seulement
VAULT_ADDR=https://vault.drainfortin.com
VAULT_TOKEN=${VAULT_TOKEN}
VAULT_NAMESPACE=production

# Security headers
ENABLE_HSTS=true
ENABLE_CSP=true
ENABLE_CORS_STRICT=true

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REDIS_URL=${REDIS_URL}

# Monitoring
SENTRY_DSN=${SENTRY_DSN}
SENTRY_ENVIRONMENT=production
```

---

## 🚀 SCRIPTS DE REMÉDIATION

### 1. Rotation des Secrets
```powershell
# scripts/security/rotate-secrets.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$Environment
)

Write-Host "🔄 Starting secret rotation for $Environment..."

# Generate new secrets
$newSecrets = @{
    JWT_SECRET = [System.Web.Security.Membership]::GeneratePassword(64, 10)
    HMAC_SECRET = [System.Web.Security.Membership]::GeneratePassword(64, 10)
    ENCRYPTION_KEY = [System.Web.Security.Membership]::GeneratePassword(32, 5)
}

# Update Vault
foreach ($key in $newSecrets.Keys) {
    vault kv put "secret/drain-fortin/$Environment/$key" value=$newSecrets[$key]
}

# Trigger deployment with new secrets
gh workflow run deploy-secrets.yml -f environment=$Environment

Write-Host "✅ Secret rotation complete!"
```

### 2. Security Scan
```bash
#!/bin/bash
# scripts/security/scan.sh

echo "🔍 Running security scan..."

# Dependency scan
echo "Checking dependencies..."
npm audit --audit-level=moderate

# Secret scan
echo "Scanning for secrets..."
trufflehog filesystem . --json > security-scan.json

# SAST scan
echo "Running static analysis..."
semgrep --config=auto --json -o sast-results.json .

# Generate report
echo "Generating report..."
node scripts/security/generate-report.js

echo "✅ Security scan complete! Check security-report.html"
```

---

## 📊 MÉTRIQUES DE SÉCURITÉ

### KPIs à Monitorer
```typescript
export const securityMetrics = {
  // Real-time
  failedLogins: new Counter('auth_failed_login_total'),
  rateLimitHits: new Counter('rate_limit_exceeded_total'),
  invalidTokens: new Counter('auth_invalid_token_total'),
  webhookFailures: new Counter('webhook_validation_failed_total'),
  
  // Daily
  uniqueIPs: new Gauge('unique_ips_24h'),
  suspiciousActivity: new Gauge('suspicious_requests_24h'),
  
  // Alerts
  alerts: {
    bruteForce: 'failed_logins > 10 per IP in 5min',
    ddos: 'rate_limit_hits > 1000 in 1min',
    scanning: 'unique_404s > 50 per IP in 10min'
  }
};
```

---

## 🎯 CONCLUSION

**État actuel**: CRITIQUE - Non sécurisé pour la production

**Temps estimé pour correction**: 2-3 jours intensifs

**Priorité absolue**:
1. Rotation des secrets (2h)
2. Fix CORS et headers (2h)
3. Validation webhooks (4h)
4. Rate limiting (4h)

**Budget sécurité recommandé**: 
- Outils: $500/mois (Snyk, GitGuardian)
- Audit externe: $5000 (ponctuel)
- Formation équipe: $2000

---

**Signé**: Claude Code - Security Lead  
**Classification**: CONFIDENTIEL  
**Distribution**: Équipe technique seulement