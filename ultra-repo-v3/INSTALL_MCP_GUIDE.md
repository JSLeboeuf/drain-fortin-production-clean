# 🛠️ GUIDE D'INSTALLATION DES MCP 2025

## Configuration Rapide des Meilleurs MCP

### 1. **Serena MCP** 🚀 (LE PLUS RÉCENT)
```bash
# Installation via uvx (recommandé)
uvx --from git+https://github.com/oraios/serena serena start-mcp-server

# Configuration dans votre MCP config
{
  "serena": {
    "command": "uvx",
    "args": [
      "--from",
      "git+https://github.com/oraios/serena",
      "serena",
      "start-mcp-server"
    ]
  }
}
```

### 2. **Playwright MCP** 🎭 (TESTS E2E)
```bash
# Installation npm
npm install -g @playwright/mcp

# Configuration
{
  "playwright": {
    "command": "npx",
    "args": ["@playwright/mcp@latest"]
  }
}
```

### 3. **Magic MCP** ✨ (UI COMPONENTS)
```bash
# Installation via npm
npm install -g @magic-mcp/server

# Configuration
{
  "magic": {
    "command": "npx",
    "args": ["@magic-mcp/server@latest"]
  }
}
```

### 4. **Context7 MCP** 📚 (DOCUMENTATION)
```bash
# Installation
npm install -g @context7/mcp

# Configuration
{
  "context7": {
    "command": "npx",
    "args": ["@context7/mcp@latest"]
  }
}
```

### 5. **GitHub MCP** 🐙 (NOUVEAU 2025)
```bash
# Installation
npm install -g @modelcontextprotocol/server-github

# Configuration avec token GitHub
{
  "github": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-github@latest"],
    "env": {
      "GITHUB_TOKEN": "your_github_token_here"
    }
  }
}
```

### 6. **Database MCP** 🗄️ (NOUVEAU 2025)
```bash
# Installation
npm install -g @modelcontextprotocol/server-database

# Configuration pour PostgreSQL
{
  "database": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-database@latest"],
    "env": {
      "DATABASE_URL": "postgresql://user:pass@localhost:5432/dbname"
    }
  }
}
```

## ⚡ Installation Automatisée

### Script PowerShell (Windows)
```powershell
# install-mcp-servers.ps1
$servers = @(
    "@playwright/mcp",
    "@magic-mcp/server",
    "@context7/mcp",
    "@modelcontextprotocol/server-github",
    "@modelcontextprotocol/server-database",
    "@modelcontextprotocol/server-slack"
)

foreach ($server in $servers) {
    Write-Host "Installation de $server..." -ForegroundColor Green
    npm install -g $server
}

Write-Host "✅ Tous les MCP installés !" -ForegroundColor Green
```

### Script Bash (Linux/Mac)
```bash
#!/bin/bash
# install-mcp-servers.sh

servers=(
    "@playwright/mcp"
    "@magic-mcp/server"
    "@context7/mcp"
    "@modelcontextprotocol/server-github"
    "@modelcontextprotocol/server-database"
    "@modelcontextprotocol/server-slack"
    "@modelcontextprotocol/server-docker"
)

for server in "${servers[@]}"; do
    echo "Installation de $server..."
    npm install -g "$server"
done

echo "✅ Tous les MCP installés !"
```

## 🔧 Configuration Avancée

### Configuration Complète pour VSCode/Cursor
```json
{
  "mcp": {
    "servers": {
      "serena": {
        "command": "uvx",
        "args": [
          "--from",
          "git+https://github.com/oraios/serena",
          "serena",
          "start-mcp-server"
        ],
        "env": {
          "SERENA_PROJECT_ROOT": "${workspaceFolder}",
          "SERENA_LOG_LEVEL": "info"
        }
      },
      "magic": {
        "command": "npx",
        "args": ["@magic-mcp/server@latest"],
        "env": {
          "MAGIC_THEME": "dark",
          "MAGIC_FRAMEWORK": "react"
        }
      },
      "playwright": {
        "command": "npx",
        "args": ["@playwright/mcp@latest"],
        "env": {
          "PLAYWRIGHT_BROWSERS_PATH": "0"
        }
      },
      "context7": {
        "command": "npx",
        "args": ["@context7/mcp@latest"],
        "env": {
          "CONTEXT7_CACHE_DIR": "~/.cache/context7"
        }
      },
      "github": {
        "command": "npx",
        "args": ["@modelcontextprotocol/server-github@latest"],
        "env": {
          "GITHUB_TOKEN": "${env:GITHUB_TOKEN}",
          "GITHUB_API_URL": "https://api.github.com"
        }
      },
      "database": {
        "command": "npx",
        "args": ["@modelcontextprotocol/server-database@latest"],
        "env": {
          "DATABASE_URL": "${env:DATABASE_URL}",
          "DB_SSL": "true"
        }
      }
    }
  }
}
```

## 🚀 Démarrage Rapide

### 1. Vérification des Prérequis
```bash
# Node.js version
node --version  # Minimum v18

# npm version
npm --version   # Minimum v8

# uv (optionnel pour Serena)
uv --version    # Recommandé pour Serena
```

### 2. Installation des Dépendances
```bash
# Mise à jour npm
npm install -g npm@latest

# Installation globale des MCP essentiels
npm install -g @playwright/mcp @magic-mcp/server @context7/mcp

# Installation uv pour Serena (optionnel)
pip install uv
```

### 3. Test des MCP
```bash
# Test Playwright
npx @playwright/mcp@latest --help

# Test Magic
npx @magic-mcp/server@latest --version

# Test Context7
npx @context7/mcp@latest --info
```

## 🐛 Dépannage

### Erreurs Courantes

#### **Erreur: "command not found: npx"**
```bash
# Solution: Réinstaller Node.js
npm install -g npx
```

#### **Erreur: "Permission denied"**
```bash
# Solution: Utiliser sudo (Linux/Mac)
sudo npm install -g @package-name

# ou configurer npm pour utilisateur local
npm config set prefix ~/.npm
```

#### **Erreur: "uvx not found"**
```bash
# Solution: Installer uv
pip install uv

# ou utiliser npx comme alternative
npx --package git+https://github.com/oraios/serena serena start-mcp-server
```

#### **Erreur GitHub Token**
```bash
# Générer un token: https://github.com/settings/tokens
# L'ajouter aux variables d'environnement
export GITHUB_TOKEN=your_token_here
```

### Logs et Debug
```bash
# Activer les logs détaillés
export MCP_DEBUG=true
export MCP_LOG_LEVEL=debug

# Vérifier les processus MCP
ps aux | grep mcp
```

## 📈 Performance et Optimisation

### Optimisations Recommandées

#### **Cache npm**
```bash
# Vider le cache npm
npm cache clean --force

# Régler la taille du cache
npm config set cache-max 1024000000  # 1GB
```

#### **Variables d'Environnement**
```bash
# Optimisations générales
export NODE_OPTIONS="--max-old-space-size=4096"
export UV_CACHE_DIR="$HOME/.cache/uv"

# Optimisations spécifiques MCP
export MCP_WORKER_THREADS=4
export MCP_MEMORY_LIMIT=2048MB
```

#### **Configuration Docker (si utilisé)**
```dockerfile
FROM node:18-alpine

# Optimisations pour MCP
ENV NODE_ENV=production
ENV MCP_WORKER_THREADS=2
ENV MCP_MEMORY_LIMIT=1024MB

# Installation des MCP
RUN npm install -g @playwright/mcp @magic-mcp/server

EXPOSE 3000
```

## 🔄 Mise à Jour des MCP

### Mise à Jour Automatique
```bash
# Script de mise à jour
npm update -g

# Mise à jour spécifique
npm install -g @playwright/mcp@latest
npm install -g @magic-mcp/server@latest

# Vérification des versions
npm list -g --depth=0
```

### Surveillance des Nouvelles Versions
```bash
# Surveiller les mises à jour npm
npm install -g npm-check-updates
ncu -g

# Notifications GitHub (via GitHub MCP)
# Automatique avec les webhooks configurés
```

## 🎯 Recommandations par Usage

### **Pour les Développeurs Frontend**
```json
{
  "recommended": ["magic", "playwright", "context7", "serena"]
}
```

### **Pour les Développeurs Backend**
```json
{
  "recommended": ["serena", "database", "context7", "docker"]
}
```

### **Pour les DevOps/Full-Stack**
```json
{
  "recommended": ["github", "docker", "database", "serena", "sequential"]
}
```

---

## 📞 Support et Communauté

- **Documentation Officielle**: https://modelcontextprotocol.io
- **GitHub Issues**: https://github.com/modelcontextprotocol/specification
- **Discord**: https://modelcontextprotocol.io/discord
- **Forum**: https://forum.modelcontextprotocol.io

---
*Guide mis à jour pour 2025 | Compatible SuperClaude Framework*
