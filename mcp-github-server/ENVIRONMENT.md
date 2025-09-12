# Configuration des Variables d'Environnement

## Fichier `.env`

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```bash
# === CONFIGURATION SERVEUR ===
PORT=3001
NODE_ENV=development

# === CONFIGURATION GITHUB OAUTH ===
# Créez une GitHub OAuth App sur https://github.com/settings/applications/new
GITHUB_CLIENT_ID=votre_client_id_github
GITHUB_CLIENT_SECRET=votre_client_secret_github
GITHUB_REDIRECT_URI=http://localhost:3001/auth/github/callback

# === CONFIGURATION GITHUB API ===
# Token personnel GitHub (optionnel, pour plus de fonctionnalités)
# Générez-le sur https://github.com/settings/tokens
GITHUB_TOKEN=votre_github_token_personnel

# === CONFIGURATION SÉCURITÉ ===
# Origines autorisées pour CORS (séparées par des virgules)
ALLOWED_ORIGINS=http://localhost:3000,https://chat.openai.com

# === CONFIGURATION LOGGING ===
LOG_LEVEL=info
```

## Configuration GitHub OAuth App

### 1. Créer l'Application OAuth
1. Allez sur [GitHub OAuth Apps](https://github.com/settings/applications/new)
2. Remplissez :
   - **Application name** : `MCP GitHub Server`
   - **Homepage URL** : `https://votredomaine.com` ou `http://localhost:3001`
   - **Authorization callback URL** : `http://localhost:3001/auth/github/callback`

### 2. Permissions Requises
- **Repository permissions** :
  - `Contents: Read` (pour lire le contenu des repos)
  - `Issues: Read and Write` (pour gérer les issues)
  - `Pull Requests: Read` (pour lire les PR)
  - `Metadata: Read` (toujours requis)

- **User permissions** :
  - `Email addresses: Read` (optionnel)

### 3. Récupérer les Clés
- **Client ID** : Visible sur la page de l'app
- **Client Secret** : Généré lors de la création (gardez-le secret !)

## Token Personnel GitHub (Optionnel)

Pour des fonctionnalités étendues :

1. Allez sur [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. Créez un "Classic" token avec les scopes :
   - `repo` (accès complet aux repositories)
   - `user` (informations utilisateur)
   - `read:org` (lecture organisations)

## Variables d'Environnement par Environnement

### Développement
```bash
NODE_ENV=development
GITHUB_REDIRECT_URI=http://localhost:3001/auth/github/callback
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Production
```bash
NODE_ENV=production
GITHUB_REDIRECT_URI=https://votredomaine.com/auth/github/callback
ALLOWED_ORIGINS=https://chat.openai.com,https://votredomaine.com
```

## Sécurité

- ✅ **Ne jamais commiter** le fichier `.env`
- ✅ **Utiliser HTTPS** en production
- ✅ **Régénérer régulièrement** les tokens
- ✅ **Limiter les permissions** au minimum nécessaire
- ✅ **Monitorer les logs** pour détecter les abus
