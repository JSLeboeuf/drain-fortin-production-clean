# 🚀 MCP GitHub Server

Serveur MCP (Model Context Protocol) pour connecter GitHub à ChatGPT avec authentification OAuth complète.

## ✨ Fonctionnalités

### 🔍 **Outils GitHub Disponibles**
- **🔎 `search_repositories`** : Recherche de repositories avec filtres avancés
- **📦 `get_repository`** : Détails complets d'un repository
- **📋 `list_issues`** : Gestion et consultation des issues
- **➕ `create_issue`** : Création d'issues avec labels et assignation
- **🔄 `get_pull_requests`** : Suivi des pull requests
- **👤 `get_user_profile`** : Profils utilisateurs détaillés
- **📁 `get_repository_contents`** : Exploration du contenu des repos
- **🔍 `search_code`** : Recherche de code dans GitHub

### 🔐 **Sécurité & Authentification**
- **OAuth 2.0 GitHub** : Authentification sécurisée
- **Rate Limiting** : Protection contre les abus (100 req/min)
- **CORS Configuré** : Origines autorisées contrôlées
- **Logs Détaillés** : Traçabilité complète des actions
- **HTTPS Enforced** : Sécurité des communications

### 📡 **Protocole MCP**
- **SSE (Server-Sent Events)** : Communication temps réel
- **JSON-RPC 2.0** : Protocole standardisé
- **Gestion d'erreurs** : Messages d'erreur structurés
- **Validation** : Schémas de données stricts

## 🚀 Démarrage Rapide

### 1. Configuration GitHub OAuth
```bash
# Créez une OAuth App sur https://github.com/settings/developers
# Récupérez Client ID et Client Secret
```

### 2. Installation
```bash
git clone <repository-url>
cd mcp-github-server
npm install
```

### 3. Configuration
```bash
cp .env.example .env
# Éditez .env avec vos vraies valeurs
```

### 4. Build et Démarrage
```bash
npm run build
npm start
```

### 5. Test
```bash
curl http://localhost:3001/health
# {"status":"healthy","timestamp":"2025-09-12T...","version":"1.0.0"}
```

## 📋 Configuration ChatGPT

### Interface Utilisateur
1. Ouvrez **ChatGPT**
2. Allez dans **Paramètres** → **Outils personnalisés**
3. Cliquez **"Créer un outil personnalisé"**

### Configuration
```
Nom : MCP GitHub Connector
Description : Connecteur GitHub pour ChatGPT - Recherche repos, gestion issues, profils utilisateurs
URL du serveur MCP : https://votredomaine.vercel.app/sse
Authentification : OAuth
```

## 💡 Exemples d'Utilisation

### Recherche de Repositories
```
Trouve-moi les repositories React les plus populaires avec plus de 1000 étoiles
```

### Gestion d'Issues
```
Montre-moi les issues ouvertes du repository microsoft/vscode
Crée une issue dans mon-repo pour "Bug: Login ne fonctionne pas"
```

### Exploration de Code
```
Cherche du code JavaScript qui utilise async/await dans le repo facebook/react
Montre-moi le contenu du fichier package.json dans vercel/next.js
```

### Profils Utilisateurs
```
Quel est le profil GitHub de gaearon ?
Combien de repositories publics a torvalds ?
```

## 🏗️ Architecture

```
mcp-github-server/
├── src/
│   ├── index.ts              # 🚀 Serveur principal Express + MCP
│   ├── tools/
│   │   └── github-tools.ts   # 🛠️ Outils GitHub (Octokit)
│   ├── auth/
│   │   └── oauth-manager.ts  # 🔐 Gestion OAuth GitHub
│   └── utils/
│       └── logger.ts         # 📝 Logging structuré
├── dist/                     # 📦 Build output
├── vercel.json              # ☁️ Configuration Vercel
└── DEPLOYMENT.md            # 📚 Guide déploiement
```

## 🔧 Technologies Utilisées

- **Runtime** : Node.js 18+
- **Framework** : Express.js
- **MCP** : @modelcontextprotocol/sdk
- **GitHub API** : @octokit/rest
- **OAuth** : @octokit/auth-oauth-app
- **Sécurité** : Helmet, CORS, Rate Limiting
- **Déploiement** : Vercel (recommandé)

## 🌐 Déploiement

### Option 1 : Vercel (Recommandé)
```bash
npm run build
vercel --prod
```

### Option 2 : Serveur Traditionnel
```bash
npm run build
NODE_ENV=production npm start
```

### Configuration Production
```bash
# Variables d'environnement
NODE_ENV=production
GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_client_secret
GITHUB_REDIRECT_URI=https://yourdomain.com/auth/github/callback
ALLOWED_ORIGINS=https://chat.openai.com
```

## 🔒 Sécurité

### Mesures Implémentées
- ✅ **OAuth 2.0** avec GitHub
- ✅ **Rate Limiting** (100 req/min)
- ✅ **CORS** configuré strictement
- ✅ **Validation d'entrée** complète
- ✅ **Logs de sécurité** détaillés
- ✅ **HTTPS** obligatoire

### Recommandations
- 🔄 **Rotation régulière** des tokens
- 👁️ **Monitoring des logs** d'accès
- 🚫 **Ne jamais commiter** les secrets
- 🔐 **Permissions minimales** pour OAuth

## 📊 Monitoring

### Endpoints de Santé
```bash
# État général
GET /health

# Logs récents
GET /logs

# Métriques OAuth
GET /metrics
```

### Logs Structurés
```javascript
{
  timestamp: "2025-09-12T10:30:00.000Z",
  level: "info",
  message: "GitHub API call successful",
  meta: { tool: "search_repositories", duration: 245 }
}
```

## 🐛 Dépannage

### Erreurs Courantes

#### "OAuth state invalid"
```bash
# Vérifiez l'URL de callback dans GitHub OAuth App
# Doit correspondre exactement à GITHUB_REDIRECT_URI
```

#### "Rate limit exceeded"
```bash
# Ajoutez un token personnel GitHub
# GITHUB_TOKEN=votre_token_personnel
```

#### "CORS error"
```bash
# Vérifiez ALLOWED_ORIGINS
# chat.openai.com doit être dans la liste
```

### Debug Mode
```bash
NODE_ENV=development npm run dev
# Logs détaillés activés
```

## 📚 Documentation Complète

- **[Déploiement](./DEPLOYMENT.md)** : Guide complet déploiement
- **[Configuration](./ENVIRONMENT.md)** : Variables d'environnement
- **[API](./API.md)** : Référence des outils disponibles

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 License

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

- 📧 **Email** : support@github-mcp.com
- 🐛 **Issues** : [GitHub Issues](https://github.com/your-repo/issues)
- 📖 **Documentation** : [Wiki complet](https://github.com/your-repo/wiki)

---

**🎉 Prêt à connecter GitHub à ChatGPT !**

Avec ce serveur MCP, ChatGPT peut maintenant :
- 🔍 **Explorer** des milliers de repositories
- 📋 **Gérer** les issues et PR
- 👤 **Analyser** les profils développeurs
- 📊 **Rechercher** du code spécifique
- 🔄 **Intégrer** GitHub dans vos conversations

**🚀 Déploiement en 5 minutes, puissance maximale !**
