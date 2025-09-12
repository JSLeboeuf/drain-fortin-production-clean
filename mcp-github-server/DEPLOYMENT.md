# 🚀 Déploiement du Serveur MCP GitHub

## Prérequis

- Node.js 18+
- Compte GitHub avec OAuth App configurée
- Compte Vercel (pour le déploiement)
- Token GitHub personnel (optionnel mais recommandé)

## Configuration GitHub OAuth

### 1. Créer une OAuth App
1. Allez sur [GitHub Developer Settings](https://github.com/settings/developers)
2. Cliquez sur "New OAuth App"
3. Remplissez :
   - **Application name** : `MCP GitHub Connector`
   - **Homepage URL** : `https://votredomaine.vercel.app`
   - **Authorization callback URL** : `https://votredomaine.vercel.app/auth/github/callback`

### 2. Permissions
Cochez les permissions suivantes :
- `repo` (accès aux repositories)
- `user` (informations utilisateur)
- `read:org` (lecture organisations)

### 3. Récupérer les clés
- **Client ID** : Visible immédiatement
- **Client Secret** : Généré (gardez-le secret !)

## Configuration Token Personnel (Optionnel)

1. Allez sur [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. Créez un token "classic" avec scopes :
   - `repo` (accès complet)
   - `user` (profil utilisateur)
   - `read:org` (organisations)

## Déploiement Local (Développement)

### 1. Installation
```bash
cd mcp-github-server
npm install
```

### 2. Configuration
```bash
cp .env.example .env
# Éditez .env avec vos vraies valeurs
```

### 3. Build et démarrage
```bash
npm run build
npm start
```

### 4. Test
```bash
curl http://localhost:3001/health
# Devrait retourner {"status":"healthy",...}
```

## Déploiement Vercel (Production)

### 1. Préparation
```bash
npm run build
```

### 2. Déploiement
```bash
vercel --prod
```

### 3. Configuration des Variables d'Environnement
Dans le dashboard Vercel :
```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=https://votredomaine.vercel.app/auth/github/callback
GITHUB_TOKEN=your_personal_token (optionnel)
NODE_ENV=production
ALLOWED_ORIGINS=https://chat.openai.com
```

## Configuration ChatGPT

### 1. Accéder aux Outils Personnalisés
1. Ouvrez ChatGPT
2. Allez dans "Paramètres" → "Outils personnalisés"
3. Cliquez sur "Créer un outil personnalisé"

### 2. Configuration de l'Outil
```
Nom : MCP GitHub Connector
Description : Connecteur GitHub pour ChatGPT via MCP - Recherche repos, gestion issues, profils utilisateurs
URL du serveur MCP : https://votredomaine.vercel.app/sse
```

### 3. Authentification
Sélectionnez "OAuth" et configurez :
- **Type d'authentification** : OAuth 2.0
- **URL d'autorisation** : `https://votredomaine.vercel.app/auth/github`
- **URL de token** : Non nécessaire (géré par le serveur)
- **Client ID** : Votre GitHub Client ID
- **Client Secret** : Votre GitHub Client Secret
- **Scopes** : `repo,user,read:org`

## Test de l'Intégration

### 1. Test de Connexion
```bash
curl https://votredomaine.vercel.app/health
# Devrait retourner {"status":"healthy",...}
```

### 2. Test OAuth
1. Visitez : `https://votredomaine.vercel.app/auth/github`
2. Autorisez l'application GitHub
3. Devriez être redirigé avec un token

### 3. Test dans ChatGPT
Essayez ces commandes dans ChatGPT :
```
Recherche des repositories React les plus populaires
Montre-moi les issues ouvertes du repo microsoft/vscode
Quel est le profil GitHub de torvalds ?
```

## Monitoring et Logs

### Logs Vercel
```bash
vercel logs
```

### Santé du Service
```bash
curl https://votredomaine.vercel.app/health
```

## Sécurité

### Recommandations
- 🔒 **Rotation régulière** des tokens GitHub
- 🚫 **Ne jamais commiter** les secrets
- ✅ **Utiliser HTTPS** exclusivement
- 👁️ **Monitorer les logs** régulièrement
- 🔐 **Limiter les permissions** OAuth au minimum

### Rate Limiting
- **100 requêtes/minute** par défaut
- Configurable via les variables d'environnement
- Logging automatique des abus

## Dépannage

### Problèmes Courants

#### "Invalid OAuth state"
- Vérifiez que l'URL de callback correspond exactement
- Redémarrez le navigateur et réessayez

#### "GitHub API rate limit exceeded"
- Ajoutez un token personnel GitHub
- Réduisez la fréquence des requêtes

#### "CORS error"
- Vérifiez la configuration `ALLOWED_ORIGINS`
- Assurez-vous que l'origine est dans la liste

### Debug
```bash
# Logs détaillés
NODE_ENV=development npm run dev

# Test local
curl -H "Origin: https://chat.openai.com" \
     http://localhost:3001/sse
```

## Structure des Fichiers

```
mcp-github-server/
├── src/
│   ├── index.ts              # Serveur principal
│   ├── tools/
│   │   └── github-tools.ts   # Outils GitHub
│   ├── auth/
│   │   └── oauth-manager.ts  # Gestion OAuth
│   └── utils/
│       └── logger.ts         # Logging
├── dist/                     # Build output
├── package.json
├── tsconfig.json
├── vercel.json              # Config Vercel
├── ENVIRONMENT.md           # Guide config
└── DEPLOYMENT.md            # Ce fichier
```

## Support

Pour toute question :
- 📧 **Email** : support@votredomaine.com
- 📖 **Docs** : [Documentation complète](./README.md)
- 🐛 **Issues** : [GitHub Issues](https://github.com/votre-repo/issues)

---

**🎉 Déploiement réussi ! Votre serveur MCP GitHub est maintenant opérationnel avec ChatGPT !**
