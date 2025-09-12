# 🚀 GUIDE COMPLET - Serveur MCP GitHub pour ChatGPT

## 🎯 Vue d'Ensemble

Ce guide vous explique comment créer et déployer un **serveur MCP (Model Context Protocol)** qui connecte **GitHub à ChatGPT** avec une authentification OAuth complète.

### ✨ Ce que vous allez créer :
- 🔍 **8 outils GitHub** accessibles dans ChatGPT
- 🔐 **Authentification OAuth** sécurisée
- 📡 **Communication temps réel** via SSE
- ☁️ **Déploiement Vercel** automatique
- 🛡️ **Sécurité maximale** avec rate limiting

---

## 📋 Prérequis

### Outils Nécessaires
- ✅ **Node.js 18+**
- ✅ **Compte GitHub**
- ✅ **Compte Vercel** (gratuit)
- ✅ **ChatGPT Plus** (pour les outils personnalisés)

### Connaissances Requises
- 🔧 **JavaScript/TypeScript** (basique)
- 🌐 **GitHub OAuth** (nous guidons)
- ☁️ **Vercel** (optionnel, nous expliquons)

---

## 🚀 ÉTAPE 1 : Création du Serveur MCP

### 1.1 Structure du Projet
```
mcp-github-server/
├── src/
│   ├── index.ts              # Serveur principal
│   ├── tools/github-tools.ts # Outils GitHub
│   ├── auth/oauth-manager.ts # Gestion OAuth
│   └── utils/logger.ts       # Logs
├── package.json
├── tsconfig.json
├── vercel.json              # Config déploiement
└── README.md
```

### 1.2 Installation des Dépendances
```bash
cd mcp-github-server
npm install
```

### 1.3 Build du Projet
```bash
npm run build
```

---

## 🔐 ÉTAPE 2 : Configuration GitHub OAuth

### 2.1 Créer une OAuth App
1. Allez sur : https://github.com/settings/developers
2. Cliquez : **"New OAuth App"**
3. Remplissez :
   ```
   Application name : MCP GitHub Connector
   Homepage URL : https://votredomaine.vercel.app
   Authorization callback URL : https://votredomaine.vercel.app/auth/github/callback
   ```

### 2.2 Permissions Requises
Cochez ces permissions :
- ✅ **repo** (accès aux repositories)
- ✅ **user** (informations utilisateur)
- ✅ **read:org** (lecture organisations)

### 2.3 Récupérer les Clés
- 🔑 **Client ID** : Visible immédiatement
- 🔐 **Client Secret** : Généré (gardez-le secret !)

### 2.4 Variables d'Environnement
Créez un fichier `.env` :
```bash
# GitHub OAuth
GITHUB_CLIENT_ID=votre_client_id_github
GITHUB_CLIENT_SECRET=votre_client_secret_github
GITHUB_REDIRECT_URI=https://votredomaine.vercel.app/auth/github/callback

# Optionnel : Token personnel pour plus de fonctionnalités
GITHUB_TOKEN=votre_token_personnel_github

# Sécurité
NODE_ENV=production
ALLOWED_ORIGINS=https://chat.openai.com
```

---

## ☁️ ÉTAPE 3 : Déploiement Vercel

### 3.1 Installation Vercel CLI
```bash
npm install -g vercel
```

### 3.2 Déploiement
```bash
cd mcp-github-server
vercel --prod
```

### 3.3 Configuration des Variables
Dans le dashboard Vercel, ajoutez :
```
GITHUB_CLIENT_ID = votre_client_id
GITHUB_CLIENT_SECRET = votre_client_secret
GITHUB_REDIRECT_URI = https://votredomaine.vercel.app/auth/github/callback
GITHUB_TOKEN = votre_token_personnel (optionnel)
NODE_ENV = production
ALLOWED_ORIGINS = https://chat.openai.com
```

### 3.4 URL du Serveur
Après déploiement, notez l'URL Vercel :
```
https://votredomaine.vercel.app
```

---

## 🎯 ÉTAPE 4 : Configuration ChatGPT

### 4.1 Accéder aux Outils Personnalisés
1. Ouvrez **ChatGPT**
2. Cliquez votre avatar (bas gauche)
3. **Paramètres** → **Outils personnalisés**
4. **Créer un outil personnalisé**

### 4.2 Configuration de Base
```
Nom : MCP GitHub Connector
Description : Connecteur GitHub complet pour ChatGPT - Recherche repos, gestion issues, profils utilisateurs, exploration code
URL du serveur MCP : https://votredomaine.vercel.app/sse
```

### 4.3 Configuration OAuth
```
Type d'authentification : OAuth
URL d'autorisation : https://votredomaine.vercel.app/auth/github
Client ID : votre_github_client_id
Client Secret : votre_github_client_secret
Scopes : repo,user,read:org
```

### 4.4 Test de l'Intégration
Essayez dans ChatGPT :
```
Bonjour ! Montre-moi les repositories React les plus populaires.
```

---

## 🛠️ ÉTAPE 5 : Outils Disponibles

### 🔍 **Outils de Recherche**
| Outil | Description | Exemple |
|-------|-------------|---------|
| `search_repositories` | Recherche repos avec filtres | "Repos React > 1000 étoiles" |
| `search_code` | Recherche de code | "useState dans facebook/react" |
| `get_user_profile` | Profil utilisateur | "Profil de torvalds" |

### 📋 **Gestion Issues & PR**
| Outil | Description | Exemple |
|-------|-------------|---------|
| `list_issues` | Lister les issues | "Issues ouvertes microsoft/vscode" |
| `create_issue` | Créer une issue | "Issue dans mon-repo: Bug login" |
| `get_pull_requests` | Lister les PR | "PR ouvertes facebook/react" |

### 📁 **Exploration**
| Outil | Description | Exemple |
|-------|-------------|---------|
| `get_repository` | Détails repo | "Détails microsoft/TypeScript" |
| `get_repository_contents` | Contenu fichiers | "README.md dans vercel/next.js" |

---

## 🧪 ÉTAPE 6 : Tests Fonctionnels

### Test de Base
```bash
# Test de santé
curl https://votredomaine.vercel.app/health

# Test OAuth
curl https://votredomaine.vercel.app/auth/github
```

### Tests dans ChatGPT
```
🔍 "Trouve-moi des repos Python d'analyse de données"
📋 "Crée une issue pour 'Bug: Login cassé'"
👤 "Profil GitHub de sindresorhus"
📁 "Contenu package.json de vercel/next.js"
```

---

## 🔧 ÉTAPE 7 : Maintenance & Monitoring

### Logs Vercel
```bash
vercel logs
```

### Métriques
```bash
curl https://votredomaine.vercel.app/health
```

### Mises à Jour
```bash
git pull origin main
npm run build
vercel --prod
```

---

## 🐛 Dépannage

### "Outil non disponible"
- ✅ Vérifiez l'URL SSE
- ✅ Testez la santé : `curl https://domain.vercel.app/health`
- ✅ Vérifiez les logs Vercel

### "Erreur OAuth"
- ✅ Vérifiez Client ID/Secret
- ✅ URL callback dans GitHub OAuth App
- ✅ Redémarrez ChatGPT

### "Rate limit exceeded"
- ✅ Ajoutez un token personnel GitHub
- ✅ Réduisez la fréquence des requêtes

---

## 📊 Fonctionnalités Avancées

### Recherche Avancée
```
# Par langage
"Repos Python avec plus de 5000 étoiles"

# Par topic
"Repos de machine learning populaires"

# Par organisation
"Repos de Google avec ML"
```

### Gestion de Projet
```
# Issues
"Liste toutes les issues prioritaires dans mon-projet"
"Crée une issue de bug avec labels priority-high"

# PR
"Voir les PR en attente de review"
"Merge status des PR dans microsoft/vscode"
```

### Analyse de Code
```
# Recherche spécifique
"Fonctions utilisant async/await dans facebook/react"
"Tests unitaires dans microsoft/TypeScript"

# Exploration
"Tous les fichiers de config dans vercel/next.js"
"Structure du dossier src dans microsoft/vscode"
```

---

## 🔒 Sécurité

### Mesures Implémentées
- ✅ **OAuth 2.0** obligatoire
- ✅ **Rate limiting** (100 req/min)
- ✅ **CORS** strict
- ✅ **HTTPS** forcé
- ✅ **Logs** détaillés
- ✅ **Validation** d'entrée

### Recommandations
- 🔄 **Rotation** des tokens régulière
- 👁️ **Monitoring** des logs
- 🚫 **Pas de commit** des secrets
- 🔐 **Permissions minimales**

---

## 📚 Ressources Supplémentaires

### Documentation
- **[README](./README.md)** : Documentation complète
- **[Déploiement](./DEPLOYMENT.md)** : Guide déploiement détaillé
- **[Configuration](./ENVIRONMENT.md)** : Variables d'environnement

### Outils de Développement
- **Postman** : Test des endpoints
- **Vercel CLI** : Gestion déploiement
- **GitHub CLI** : Gestion repositories

### Support
- 🐛 **Issues GitHub** : Signaler les problèmes
- 📧 **Email** : support@github-mcp.com
- 📖 **Wiki** : Documentation avancée

---

## 🎉 RÉSULTAT FINAL

### ✅ Ce que vous obtenez :
- 🔗 **Connexion GitHub ↔ ChatGPT**
- 🛠️ **8 outils puissants** disponibles
- 🔐 **Sécurité maximale** avec OAuth
- 📊 **Monitoring complet** des usages
- ☁️ **Déploiement serverless** sur Vercel

### 🚀 Capacités de ChatGPT :
```
"Recherche des repos React populaires"
"Crée une issue dans microsoft/vscode"
"Montre-moi le profil de gaearon"
"Cherche du code utilisant hooks dans facebook/react"
"Liste les PR ouvertes dans vercel/next.js"
```

### 💡 Exemples d'usage :
- **Développement** : Recherche de bibliothèques, exploration de code
- **Gestion** : Suivi des issues, création de tâches
- **Analyse** : Profils contributeurs, tendances technologiques
- **Apprentissage** : Exploration de projets open source

---

## 🎯 CONCLUSION

Vous avez maintenant un **serveur MCP complet** qui transforme ChatGPT en **puissant assistant GitHub** !

**⏱️ Temps total : 30 minutes**
**💰 Coût : Gratuit** (Vercel free tier)
**🔒 Sécurité : Entreprise-grade**

**🚀 Prêt à explorer GitHub avec ChatGPT !**

---

*Guide créé par Claude Code - 2025-09-12*
