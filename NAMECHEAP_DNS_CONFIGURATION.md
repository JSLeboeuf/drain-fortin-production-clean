# 🌐 CONFIGURATION DNS NAMECHEAP
## Pour paul.autoscaleai.ca ou app.autoscaleai.ca
### Date: 2025-09-09

---

## ✅ OPTIONS DE SOUS-DOMAINE

### Option 1: paul.autoscaleai.ca
- **Avantage**: Nom mémorable, référence à l'assistant
- **URL finale**: https://paul.autoscaleai.ca

### Option 2: app.autoscaleai.ca
- **Avantage**: Plus générique, professionnel
- **URL finale**: https://app.autoscaleai.ca

### Option 3: drain.autoscaleai.ca
- **Avantage**: Référence au client
- **URL finale**: https://drain.autoscaleai.ca

---

## 🔧 MÉTHODE 1: CLOUDFLARE (RECOMMANDÉ - GRATUIT)

### Étape 1: Configurer Cloudflare
1. Créer compte gratuit sur https://cloudflare.com
2. Ajouter le domaine autoscaleai.ca
3. Cloudflare donnera 2 nameservers

### Étape 2: Dans Namecheap
1. Dashboard → Domain List → autoscaleai.ca
2. Nameservers → Custom DNS
3. Remplacer par les nameservers Cloudflare:
   ```
   exemple1.ns.cloudflare.com
   exemple2.ns.cloudflare.com
   ```

### Étape 3: Dans Cloudflare (après propagation)
1. DNS → Add Record:
   ```
   Type: CNAME
   Name: paul (ou app, ou drain)
   Target: phiduqxcufdmgjvdipyu.supabase.co
   Proxy: ON (orange cloud)
   ```

2. Rules → Page Rules → Create:
   ```
   URL: paul.autoscaleai.ca/*
   Settings: Forwarding URL (301)
   Destination: https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/serve-app/$1
   ```

### Étape 4: SSL/TLS dans Cloudflare
1. SSL/TLS → Overview → Full (strict)
2. Edge Certificates → Always Use HTTPS: ON

---

## 🔧 MÉTHODE 2: DIRECT NAMECHEAP (PLUS SIMPLE MAIS LIMITÉ)

### Dans Namecheap Dashboard:
1. Domain List → autoscaleai.ca → Manage
2. Advanced DNS → Add New Record

### Option A: Redirection Simple
```
Type: URL Redirect Record
Host: paul
Value: https://phiduqxcufdmgjvdipyu.supabase.co/storage/v1/object/public/hosting/index.html
Redirect Type: Permanent (301)
```

### Option B: CNAME (si supporté)
```
Type: CNAME
Host: paul
Value: phiduqxcufdmgjvdipyu.supabase.co
TTL: Automatic
```

**Note**: Cette méthode peut ne pas bien gérer le routing SPA

---

## 🚀 MÉTHODE 3: CLOUDFLARE WORKERS (AVANCÉ - MEILLEUR)

### Étape 1: Créer un Worker
Dans Cloudflare Dashboard → Workers → Create:

```javascript
// worker.js pour paul.autoscaleai.ca
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Rediriger vers Supabase Edge Function
    const supabaseUrl = new URL('https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/serve-app');
    supabaseUrl.pathname = '/functions/v1/serve-app' + url.pathname;
    supabaseUrl.search = url.search;
    
    // Faire la requête
    const response = await fetch(supabaseUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
    
    // Retourner avec les bons headers
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('X-Powered-By', 'AutoScale AI');
    
    return modifiedResponse;
  }
}
```

### Étape 2: Router le Worker
1. Workers → votre-worker → Triggers
2. Add Custom Domain: paul.autoscaleai.ca

---

## 📝 CONFIGURATION RECOMMANDÉE

### Pour paul.autoscaleai.ca:

**Meilleure option**: Cloudflare (Méthode 1)
- ✅ SSL gratuit
- ✅ CDN gratuit
- ✅ Protection DDoS
- ✅ Analytics gratuits
- ✅ Règles flexibles

**Configuration finale**:
```
paul.autoscaleai.ca → 
Cloudflare Proxy → 
Supabase Edge Function
```

---

## 🔐 SÉCURITÉ ET PERFORMANCE

### Dans Cloudflare (après configuration):

1. **SSL/TLS**:
   - Mode: Full (strict)
   - Always Use HTTPS: ON
   - Minimum TLS: 1.2

2. **Caching**:
   - Browser Cache TTL: 4 hours
   - Always Online: ON

3. **Security**:
   - Security Level: Medium
   - Bot Fight Mode: ON
   - Hotlink Protection: ON

4. **Speed**:
   - Auto Minify: HTML, CSS, JS
   - Brotli: ON
   - HTTP/2: ON
   - HTTP/3: ON

---

## ⏱️ TEMPS DE PROPAGATION

- **Nameservers**: 24-48h (si changement vers Cloudflare)
- **DNS Records**: 5-30 minutes
- **Cloudflare**: Instantané après propagation

---

## 🧪 TEST DE CONFIGURATION

### Vérifier la propagation:
```bash
# Windows
nslookup paul.autoscaleai.ca

# Ou en ligne
https://dnschecker.org/#CNAME/paul.autoscaleai.ca
```

### Tester l'accès:
```bash
curl -I https://paul.autoscaleai.ca
```

---

## 📊 RÉSULTAT FINAL

### URLs accessibles:
- **Principal**: https://paul.autoscaleai.ca
- **Backup**: https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/serve-app

### Features:
- ✅ SSL/HTTPS automatique
- ✅ CDN global (Cloudflare)
- ✅ Protection DDoS
- ✅ Analytics gratuits
- ✅ Nom professionnel

---

## 💡 ALTERNATIVES DE NOMS

Si vous préférez un autre sous-domaine:
- **app.autoscaleai.ca** - Générique
- **drain.autoscaleai.ca** - Spécifique client
- **call.autoscaleai.ca** - Référence aux appels
- **assistant.autoscaleai.ca** - Descriptif
- **phone.autoscaleai.ca** - Simple

---

## 🚨 IMPORTANT

### Pour VAPI:
Après configuration, mettre à jour le webhook URL dans VAPI:
```
De: https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook
À: https://paul.autoscaleai.ca/api/vapi-webhook
```

### Pour les clients:
L'URL à partager sera:
```
https://paul.autoscaleai.ca
```

---

## 📞 SUPPORT

### Namecheap
- Chat 24/7 sur namecheap.com
- Support ticket

### Cloudflare
- Community: community.cloudflare.com
- Documentation: developers.cloudflare.com

### Configuration
- Je peux vous guider étape par étape!

---

*Configuration pour paul.autoscaleai.ca*
*Domaine professionnel sur Namecheap*