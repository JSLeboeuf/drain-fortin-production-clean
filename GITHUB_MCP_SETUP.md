# 🔧 CONFIGURATION DU SERVEUR MCP GIT/GITHUB

## ✅ Installation Complétée

Le serveur MCP Git a été installé et configuré avec succès!

### Serveur installé:
- **Package**: `@cyanheads/git-mcp-server`
- **Version**: 2.3.2
- **Fonctionnalités**: Opérations Git complètes incluant:
  - Clone, commit, branch, diff, log
  - Push, pull, merge, rebase
  - Tag management, stash, worktree
  - Intégration GitHub

## 📝 Configuration Ajoutée

Le serveur a été ajouté à `claude_desktop_config.json`:

```json
"git": {
  "command": "npx",
  "args": ["-y", "@cyanheads/git-mcp-server"],
  "env": {},
  "description": "Git MCP Server - Complete Git operations including GitHub integration"
}
```

**Raccourci**: `git` - Tapez `/mcp git` pour l'activer

## 🔑 Configuration de l'Authentification GitHub

### Option 1: Utiliser GitHub CLI (Recommandé)
```bash
# Se connecter avec GitHub CLI
gh auth login

# Suivre les instructions pour:
# 1. Choisir GitHub.com
# 2. Protocole HTTPS
# 3. Authentifier avec browser
```

### Option 2: Token d'Accès Personnel
1. Aller sur https://github.com/settings/tokens
2. Cliquer "Generate new token (classic)"
3. Sélectionner les scopes:
   - `repo` (accès complet aux repos)
   - `workflow` (pour les GitHub Actions)
   - `read:org` (lecture des organisations)
4. Copier le token
5. Configurer Git:
```bash
git config --global github.token YOUR_TOKEN_HERE
```

### Option 3: Variables d'Environnement
Ajouter à vos variables d'environnement système:
- `GITHUB_TOKEN` = votre token
- `GH_TOKEN` = votre token (pour gh CLI)

## 🚀 Activation

Pour activer le serveur MCP Git:

1. **Fermer Claude Desktop** complètement
2. **Rouvrir Claude Desktop**
3. **Vérifier** avec `/mcp` - Vous devriez voir:
   - 8 serveurs au total (7 précédents + Git)
4. **Tester** avec `/mcp git` pour activer le serveur Git

## 📋 Commandes Disponibles

Une fois activé, le serveur Git MCP permet:

### Opérations de Base
- `git_status` - Voir le statut du repo
- `git_log` - Historique des commits
- `git_diff` - Voir les changements
- `git_add` - Ajouter des fichiers
- `git_commit` - Créer un commit
- `git_push` - Pousser vers GitHub
- `git_pull` - Récupérer depuis GitHub

### Opérations Branches
- `git_branch` - Gérer les branches
- `git_checkout` - Changer de branche
- `git_merge` - Fusionner des branches
- `git_rebase` - Rebaser

### Opérations Avancées
- `git_clone` - Cloner un repo
- `git_stash` - Gérer le stash
- `git_tag` - Gérer les tags
- `git_worktree` - Gérer les worktrees
- `git_cherry_pick` - Cherry-pick commits

## ✅ État Actuel

### Serveurs MCP Configurés: 8/8
1. ✅ Filesystem
2. ✅ Context7
3. ✅ Sequential Thinking
4. ✅ Magic
5. ✅ Playwright
6. ✅ MorphLLM
7. ✅ Serena
8. ✅ **Git (NOUVEAU)**

## 🔍 Vérification

Pour vérifier l'installation:
```powershell
# Vérifier le package installé
npm list -g @cyanheads/git-mcp-server

# Vérifier la configuration
powershell -File check-mcp.ps1
```

## 📚 Documentation

- **Package NPM**: https://www.npmjs.com/package/@cyanheads/git-mcp-server
- **GitHub du projet**: https://github.com/cyanheads/git-mcp-server

---

**Note**: Redémarrez Claude Desktop pour activer le serveur Git MCP!