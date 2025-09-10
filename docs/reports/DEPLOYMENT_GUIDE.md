# 🚀 Guide de Déploiement Production - Drain Fortin

## 📋 Prérequis

### Infrastructure
- **Serveur Web**: Nginx 1.20+ ou Apache 2.4+
- **Node.js**: v20.x LTS
- **Deno**: v1.40+ (pour Supabase Edge Functions)
- **PostgreSQL**: v15+ (via Supabase)
- **SSL/TLS**: Let's Encrypt ou certificat commercial
- **DNS**: Accès pour configuration drainfortin.com

### Services Tiers
- **Supabase**: Compte projet configuré
- **VAPI**: Compte avec webhook configuré
- **Cloudflare**: (Optionnel) Pour CDN et DDoS protection
- **Monitoring**: Sentry/DataDog (Recommandé)

## 🔧 Configuration Initiale

### 1. Variables d'Environnement

#### Frontend (.env.production)
```bash
# Supabase
VITE_SUPABASE_URL=https://iheusrchmjsrzjubrdby.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]

# Application
VITE_APP_DOMAIN=https://drainfortin.com
VITE_APP_ENV=production

# API Endpoints
VITE_API_BASE_URL=https://iheusrchmjsrzjubrdby.supabase.co/functions/v1
```

#### Backend (Supabase Dashboard)
```bash
# Service Keys
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]
VAPI_WEBHOOK_SECRET=[your-webhook-secret]
VAPI_API_KEY=[your-api-key]

# Security
ALLOWED_ORIGINS=https://drainfortin.com,https://www.drainfortin.com
RATE_LIMIT_MAX=30
RATE_LIMIT_WINDOW=60

# Environment
ENVIRONMENT=production
LOG_LEVEL=error
```

### 2. Database Setup

```sql
-- Exécuter les migrations dans l'ordre
psql -U postgres -d your_database < backend/supabase/migrations/00001_initial_schema.sql
psql -U postgres -d your_database < backend/supabase/migrations/20250108_secure_rls_policies.sql
psql -U postgres -d your_database < backend/supabase/migrations/20250108_add_audit_tables.sql
```

## 📦 Build et Déploiement

### Frontend

#### 1. Build Production
```bash
cd frontend
npm ci --production
npm run build

# Vérification du build
npm run preview
```

#### 2. Optimisations Post-Build
```bash
# Compression des assets
find dist -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -k {} \;

# Génération des sourcemaps séparés (optionnel)
npm run build:sourcemaps
```

#### 3. Déploiement Frontend
```bash
# Via rsync
rsync -avz --delete dist/ user@server:/var/www/drainfortin/

# Via SCP
scp -r dist/* user@server:/var/www/drainfortin/

# Via CI/CD (GitHub Actions)
# Voir .github/workflows/deploy.yml
```

### Backend (Supabase Edge Functions)

#### 1. Installation Supabase CLI
```bash
npm install -g supabase
supabase login
```

#### 2. Déploiement des Functions
```bash
cd backend
supabase link --project-ref iheusrchmjsrzjubrdby
supabase functions deploy vapi-webhook --no-verify-jwt
supabase functions deploy get-interventions
supabase functions deploy update-intervention
```

#### 3. Configuration des Secrets
```bash
supabase secrets set VAPI_WEBHOOK_SECRET="your-secret"
supabase secrets set VAPI_API_KEY="your-api-key"
```

## 🌐 Configuration Serveur Web

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name drainfortin.com www.drainfortin.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name drainfortin.com www.drainfortin.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/drainfortin.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drainfortin.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' data:; frame-ancestors 'none';" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Root directory
    root /var/www/drainfortin;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (if needed)
    location /api {
        proxy_pass https://iheusrchmjsrzjubrdby.supabase.co;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Log configuration
    access_log /var/log/nginx/drainfortin_access.log;
    error_log /var/log/nginx/drainfortin_error.log;
}
```

### Apache Configuration
```apache
<VirtualHost *:80>
    ServerName drainfortin.com
    ServerAlias www.drainfortin.com
    Redirect permanent / https://drainfortin.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName drainfortin.com
    ServerAlias www.drainfortin.com
    DocumentRoot /var/www/drainfortin

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/drainfortin.com/cert.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/drainfortin.com/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/drainfortin.com/chain.pem

    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Enable compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
    </IfModule>

    # SPA routing
    <Directory /var/www/drainfortin>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Cache static assets
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        Header set Cache-Control "max-age=31536000, public, immutable"
    </FilesMatch>

    ErrorLog ${APACHE_LOG_DIR}/drainfortin_error.log
    CustomLog ${APACHE_LOG_DIR}/drainfortin_access.log combined
</VirtualHost>
```

## 🔒 SSL/TLS Setup

### Let's Encrypt avec Certbot
```bash
# Installation
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Génération du certificat
sudo certbot --nginx -d drainfortin.com -d www.drainfortin.com

# Renouvellement automatique
sudo certbot renew --dry-run
sudo crontab -e
# Ajouter: 0 0,12 * * * certbot renew --quiet
```

## 🚀 Processus de Déploiement

### 1. Pre-Deployment Checklist
```bash
# Frontend
cd frontend
npm run test              # ✅ Tous les tests passent
npm run lint              # ✅ Aucune erreur de linting
npm run type-check        # ✅ Aucun problème TypeScript
npm run build             # ✅ Build réussi

# Backend
cd backend
npm run test              # ✅ Tests backend passent
deno lint                 # ✅ Linting Deno OK
```

### 2. Deployment Script
```bash
#!/bin/bash
# deploy.sh

# Configuration
REMOTE_USER="deploy"
REMOTE_HOST="drainfortin.com"
REMOTE_PATH="/var/www/drainfortin"
LOCAL_BUILD="./frontend/dist"

echo "🚀 Starting deployment to production..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm ci --production
npm run build
cd ..

# Run tests
echo "🧪 Running tests..."
npm run test:ci
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Deployment aborted."
    exit 1
fi

# Deploy to server
echo "📤 Uploading to server..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    $LOCAL_BUILD/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

# Deploy backend functions
echo "☁️ Deploying Edge Functions..."
cd backend
supabase functions deploy --all
cd ..

# Clear CDN cache (if using Cloudflare)
echo "🔄 Clearing CDN cache..."
# curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
#      -H "Authorization: Bearer YOUR_API_TOKEN" \
#      -H "Content-Type: application/json" \
#      --data '{"purge_everything":true}'

echo "✅ Deployment complete!"
```

### 3. Rollback Procedure
```bash
#!/bin/bash
# rollback.sh

BACKUP_DIR="/var/backups/drainfortin"
LIVE_DIR="/var/www/drainfortin"

echo "⏪ Starting rollback..."

# List available backups
echo "Available backups:"
ls -la $BACKUP_DIR

read -p "Enter backup timestamp to restore: " TIMESTAMP

if [ -d "$BACKUP_DIR/$TIMESTAMP" ]; then
    rsync -avz --delete $BACKUP_DIR/$TIMESTAMP/ $LIVE_DIR/
    echo "✅ Rollback complete to $TIMESTAMP"
else
    echo "❌ Backup not found"
    exit 1
fi
```

## 📊 Monitoring et Logs

### 1. Application Monitoring
```javascript
// frontend/src/utils/monitoring.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 2. Server Monitoring
```bash
# Health check endpoint
curl https://drainfortin.com/api/health

# Log rotation
sudo nano /etc/logrotate.d/drainfortin
```

```logrotate
/var/log/nginx/drainfortin_*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
```

### 3. Uptime Monitoring
- **UptimeRobot**: Configure checks for https://drainfortin.com
- **Pingdom**: Alternative monitoring service
- **Custom healthcheck**: `/api/health` endpoint

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run tests
        run: |
          cd frontend
          npm run test:ci
          npm run lint
          npm run type-check

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Build frontend
        run: |
          cd frontend
          npm ci --production
          npm run build
      
      - name: Deploy to server
        uses: easingthemes/ssh-deploy@v4
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SOURCE: "frontend/dist/"
          REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
          REMOTE_USER: ${{ secrets.REMOTE_USER }}
          TARGET: "/var/www/drainfortin"
      
      - name: Deploy Edge Functions
        run: |
          npm install -g supabase
          cd backend
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy --all
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## 🔐 Post-Deployment Security

### 1. Security Scan
```bash
# Run security audit
npm audit --production
npx snyk test

# Check SSL configuration
nmap --script ssl-enum-ciphers -p 443 drainfortin.com
```

### 2. Performance Testing
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun --config=lighthouserc.js

# Load testing
npm install -g artillery
artillery quick --count 50 --num 100 https://drainfortin.com
```

### 3. Backup Configuration
```bash
# Database backup (via Supabase)
# Automated daily backups are configured in Supabase dashboard

# Application backup
#!/bin/bash
BACKUP_DIR="/var/backups/drainfortin/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
rsync -avz /var/www/drainfortin/ $BACKUP_DIR/
find /var/backups/drainfortin -type d -mtime +30 -exec rm -rf {} +
```

## 📱 Mobile & PWA Configuration

### manifest.json
```json
{
  "name": "Drain Fortin",
  "short_name": "DrainFortin",
  "description": "Système de gestion des interventions",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🆘 Troubleshooting

### Common Issues

#### 1. CORS Errors
```bash
# Vérifier les headers CORS
curl -I -H "Origin: https://drainfortin.com" \
  https://iheusrchmjsrzjubrdby.supabase.co/functions/v1/vapi-webhook
```

#### 2. Database Connection Issues
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';
```

#### 3. High Memory Usage
```bash
# Check Node.js memory
ps aux | grep node
# Restart if needed
pm2 restart all
```

## 📞 Support Contacts

- **Technical Lead**: technical@drainfortin.com
- **DevOps**: devops@drainfortin.com
- **Security**: security@drainfortin.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX

## ✅ Final Checklist

### Pre-Launch
- [ ] All environment variables configured
- [ ] SSL certificate installed and verified
- [ ] Database migrations executed
- [ ] Edge Functions deployed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] DNS records updated
- [ ] CDN configured (if applicable)

### Post-Launch
- [ ] Run security scan
- [ ] Performance testing completed
- [ ] User acceptance testing passed
- [ ] Documentation updated
- [ ] Team trained on deployment process
- [ ] Incident response plan reviewed
- [ ] First backup verified
- [ ] Monitoring alerts working

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-01-09  
**Next Review**: 2025-02-09  
**Status**: 🟢 PRODUCTION READY