# ⚡ DÉMARRAGE RAPIDE - MCP GitHub Server

## 🎯 En 5 Minutes Chrono

### 1. Préparation (2 min)
```bash
# Aller dans le dossier
cd mcp-github-server

# Installer les dépendances
npm install

# Créer les variables d'environnement
# Copiez le contenu ci-dessous dans un fichier .env
```

### 2. Variables d'Environnement (.env)
```bash
# GitHub OAuth (obligatoire)
GITHUB_CLIENT_ID=votre_client_id_github
GITHUB_CLIENT_SECRET=votre_client_secret_github
GITHUB_REDIRECT_URI=http://localhost:3001/auth/github/callback

# Optionnel pour plus de fonctionnalités
GITHUB_TOKEN=votre_token_personnel_github

# Configuration
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,https://chat.openai.com
```

### 3. Build & Démarrage (1 min)
```bash
# Build du projet
npm run build

# Démarrage du serveur
npm start
```

### 4. Test Local (30 sec)
```bash
# Test de santé
curl http://localhost:3001/health

# Doit retourner :
# {"status":"healthy","timestamp":"2025-09-12T...","version":"1.0.0"}
```

### 5. Test OAuth (30 sec)
Ouvrez dans votre navigateur :
```
http://localhost:3001/auth/github
```
- Devrait rediriger vers GitHub pour autorisation
- Après autorisation : retour avec token

---

## 🚀 Déploiement Production (Vercel)

### Option Rapide
```bash
# Installation Vercel CLI
npm install -g vercel

# Déploiement
npm run build
vercel --prod
```

### Variables Vercel
Ajoutez dans le dashboard Vercel :
```
GITHUB_CLIENT_ID = votre_client_id
GITHUB_CLIENT_SECRET = votre_client_secret
GITHUB_REDIRECT_URI = https://votredomaine.vercel.app/auth/github/callback
NODE_ENV = production
ALLOWED_ORIGINS = https://chat.openai.com
```

---

## 🎯 Configuration ChatGPT (2 min)

### 1. Interface
1. Ouvrez **ChatGPT**
2. **Paramètres** → **Outils personnalisés**
3. **Créer un outil personnalisé**

### 2. Configuration Minimale
```
Nom : MCP GitHub
Description : Connecteur GitHub pour ChatGPT
URL du serveur MCP : https://votredomaine.vercel.app/sse
```

### 3. OAuth
```
Type : OAuth
URL d'autorisation : https://votredomaine.vercel.app/auth/github
Client ID : votre_github_client_id
Client Secret : votre_github_client_secret
Scopes : repo,user,read:org
```

---

## 🧪 Tests Immédiats

### Test de Base
```
Salut ! Montre-moi les repositories React populaires.
```

### Tests Avancés
```
🔍 Recherche : "Trouve des repos Python d'analyse de données"
📋 Issues : "Liste les issues ouvertes dans facebook/react"
👤 Profil : "Profil GitHub de torvalds"
📁 Code : "Cherche useState dans vercel/next.js"
```

---

## 📋 Checklist Final

### ✅ Configuration Réussie
- [ ] Serveur MCP déployé (local ou Vercel)
- [ ] Variables d'environnement configurées
- [ ] OAuth GitHub fonctionnel
- [ ] ChatGPT connecté
- [ ] Tests réussis

### 🔧 Commandes Essentielles
```bash
# Démarrage développement
npm run dev

# Build production
npm run build

# Déploiement Vercel
vercel --prod

# Logs Vercel
vercel logs

# Test santé
curl https://domain.vercel.app/health
```

---

## 🎉 Vous êtes prêt !

**🚀 Votre serveur MCP GitHub est opérationnel !**

### Capacités Disponibles :
- 🔍 **Recherche** de repositories
- 📋 **Gestion** des issues et PR
- 👤 **Analyse** des profils utilisateurs
- 📁 **Exploration** du code
- 🔄 **Intégration** complète GitHub ↔ ChatGPT

### Prochaines Étapes :
1. **Explorez** : "Montre-moi les trends technologiques"
2. **Gérez** : "Crée une issue pour améliorer la doc"
3. **Analysez** : "Qui contribue le plus à ce projet ?"
4. **Apprenez** : "Explique-moi ce code dans ce repo"

---

## 🆘 Support Rapide

### Problèmes Courants :
```
❌ "Outil non disponible"
✅ Vérifiez l'URL SSE et les logs Vercel

❌ "Erreur OAuth"
✅ Vérifiez Client ID/Secret GitHub

❌ "Rate limit"
✅ Ajoutez GITHUB_TOKEN personnel
```

### Ressources :
- 📖 **[Guide Complet](./GUIDE-COMPLET.md)**
- 🔧 **[Configuration](./ENVIRONMENT.md)**
- 📚 **[README](./README.md)**

---

**⏱️ Total : 5 minutes pour une puissance maximale !**

**🎯 Prêt à transformer ChatGPT en assistant GitHub ultime !** 🚀
