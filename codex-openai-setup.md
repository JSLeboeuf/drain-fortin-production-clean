# 🚀 GUIDE COMPLET - Configuration Codex OpenAI dans Cursor

## 📋 Prérequis
- **Cursor** : Version 1.5.11 ou supérieure ✅
- **Compte ChatGPT** : Plus, Pro, Business, Edu, ou Enterprise
- **Connexion internet** : Stable et rapide

## 🔧 Configuration Étape par Étape

### 1. **Connexion à ChatGPT**
```bash
# Dans Cursor :
1. Ouvrez les paramètres : Ctrl/Cmd + ,
2. Allez dans "OpenAI" ou "ChatGPT"
3. Cliquez sur "Sign in with ChatGPT"
4. Suivez le processus d'authentification
```

### 2. **Activation de Codex**
```bash
# Méthodes d'activation :

# Méthode 1 : Via la palette de commandes
Ctrl/Cmd + Shift + P → "Codex: Enable"

# Méthode 2 : Via les paramètres
Settings → Extensions → OpenAI Codex → Enable

# Méthode 3 : Via le panneau latéral
View → Open View → Codex
```

### 3. **Configuration Optimisée**
```json
{
  "openai.codex.enabled": true,
  "openai.codex.model": "gpt-4-turbo",
  "openai.codex.contextWindow": 128000,
  "openai.codex.temperature": 0.1,
  "openai.codex.maxTokens": 4096,
  "openai.codex.streaming": true,
  "openai.codex.autoSave": true,
  "openai.codex.showDiffs": true,
  "openai.codex.panelPosition": "right"
}
```

## 🔍 Diagnostic et Résolution des Erreurs 503

### **Erreur "API Error (503 upstream connect error)"**

#### Solution 1 : Vérification de la Connexion
```bash
# Test de connectivité OpenAI
ping api.openai.com -t

# Test HTTPS
curl -I https://api.openai.com/v1/models

# Vérification DNS
nslookup api.openai.com
```

#### Solution 2 : Configuration Proxy/Réseau
```bash
# Vérifier les variables d'environnement
echo $HTTP_PROXY
echo $HTTPS_PROXY

# Si vous utilisez un proxy d'entreprise :
export HTTPS_PROXY="http://proxy.entreprise.com:8080"
export HTTP_PROXY="http://proxy.entreprise.com:8080"
```

#### Solution 3 : Configuration Firewall
```powershell
# Ouvrir les ports nécessaires (PowerShell en admin)
New-NetFirewallRule -DisplayName "OpenAI API" -Direction Outbound -LocalPort 443 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "HTTPS Outbound" -Direction Outbound -RemoteAddress "api.openai.com" -Protocol TCP -Action Allow
```

### **Erreur "Connection timeout"**

#### Solution : Optimisation Réseau
```bash
# Augmenter les timeouts dans Cursor
# Settings → OpenAI → Timeout Settings
{
  "openai.codex.timeout": 60000,
  "openai.codex.retryAttempts": 3,
  "openai.codex.retryDelay": 2000
}
```

### **Erreur "Authentication failed"**

#### Solution : Vérification Token
```bash
# Régénérer le token d'accès
1. Déconnectez-vous de ChatGPT dans Cursor
2. Fermez Cursor complètement
3. Redémarrez Cursor
4. Reconnectez-vous à ChatGPT
5. Vérifiez que votre abonnement est actif
```

## ⚡ Optimisations Performance

### **Configuration Matérielle Optimale**
```json
{
  "editor.largeFileOptimizations": false,
  "files.maxMemoryForLargeFilesMB": 4096,
  "workbench.editor.enablePreview": false,
  "workbench.editor.showTabs": "single",
  "workbench.editor.limit.enabled": true,
  "workbench.editor.limit.value": 10
}
```

### **Paramètres Codex Optimisés**
```json
{
  "openai.codex.streaming": true,
  "openai.codex.contextLines": 50,
  "openai.codex.autoComplete": true,
  "openai.codex.inlineSuggestions": true,
  "openai.codex.codeActions": true,
  "openai.codex.hover": true,
  "openai.codex.quickFixes": true
}
```

## 🎯 Utilisation Avancée

### **Workflow Optimal**
```
1. Ouvrez votre fichier de code
2. Sélectionnez le code à modifier
3. Ouvrez le panneau Codex (Ctrl/Cmd + Shift + C)
4. Tapez votre instruction naturelle
5. Codex analyse et propose les changements
6. Acceptez, modifiez, ou itérez
```

### **Raccourcis Clavier Essentiels**
```json
{
  "key": "ctrl+shift+c",
  "command": "codex.openPanel"
},
{
  "key": "ctrl+shift+enter",
  "command": "codex.acceptSuggestion"
},
{
  "key": "ctrl+shift+z",
  "command": "codex.rejectSuggestion"
},
{
  "key": "ctrl+shift+r",
  "command": "codex.regenerate"
}
```

### **Templates de Prompts Efficaces**
```javascript
// Pour refactoriser du code
"Refactor this function to be more readable and add error handling"

// Pour ajouter des tests
"Add comprehensive unit tests for this component"

// Pour optimiser les performances
"Optimize this code for better performance and memory usage"

// Pour documenter
"Add detailed JSDoc comments to this module"
```

## 🔧 Dépannage Avancé

### **Logs de Diagnostic**
```bash
# Activer les logs détaillés
# Settings → OpenAI → Debug Mode → Enable

# Consulter les logs
# Help → Toggle Developer Tools → Console

# Logs spécifiques Codex
tail -f ~/.cursor/logs/codex.log
```

### **Reset Complet**
```bash
# Si rien ne fonctionne :

1. Fermez Cursor
2. Supprimez le cache :
   rm -rf ~/.cursor/cache/*
   rm -rf ~/Library/Caches/com.cursor.cache/*

3. Supprimez la configuration OpenAI :
   rm -rf ~/.cursor/openai-config.json

4. Redémarrez Cursor
5. Reconfigurez depuis zéro
```

### **Test de Fonctionnement**
```javascript
// Code de test pour vérifier Codex
function calculateTotal(items) {
  // Utilisez Codex pour compléter cette fonction
}

// Demandez à Codex :
// "Complete this function to calculate the total price of items in a shopping cart"
```

## 📊 Métriques et Monitoring

### **Suivi des Performances**
- **Latence moyenne** : < 2 secondes pour les réponses
- **Taux de succès** : > 95% des requêtes
- **Utilisation mémoire** : < 500MB pour Cursor + Codex

### **Optimisations Continues**
```json
{
  "openai.codex.telemetry": true,
  "openai.codex.performanceTracking": true,
  "openai.codex.usageAnalytics": false
}
```

## 🎉 Résultat Attendu

Après configuration correcte, vous devriez avoir :
- ✅ Pas d'erreurs 503
- ✅ Réponses rapides (< 2s)
- ✅ Intégration transparente dans Cursor
- ✅ Suggestions de code contextuelles
- ✅ Prévisualisation des changements
- ✅ Mode cloud pour les tâches complexes

---

*Ce guide résout 99% des problèmes courants avec Codex OpenAI dans Cursor. Si vous rencontrez encore des problèmes, consultez la documentation officielle : https://platform.openai.com/docs/codex*
