# 🎯 Configuration ChatGPT - Serveur MCP GitHub

## Interface Configuration

### 1. Accéder aux Outils Personnalisés
1. Ouvrez **ChatGPT** dans votre navigateur
2. Cliquez sur votre avatar (en bas à gauche)
3. Sélectionnez **"Paramètres"**
4. Cliquez sur **"Outils personnalisés"** (ou "Custom GPTs")
5. Cliquez sur **"Créer un outil personnalisé"**

### 2. Configuration de Base
```
Nom : MCP GitHub Connector
Description : Connecteur GitHub complet pour ChatGPT - Recherche repositories, gestion issues, profils utilisateurs, exploration code
Icône : 🔍 (ou upload une icône GitHub)
```

### 3. Configuration Technique
```
URL du serveur MCP : https://votredomaine.vercel.app/sse
Type d'authentification : OAuth
```

## Configuration OAuth Détaillée

### Paramètres OAuth
```
URL d'autorisation : https://votredomaine.vercel.app/auth/github
Client ID : [votre_github_client_id]
Client Secret : [votre_github_client_secret]
Scopes : repo,user,read:org
```

### 4. Configuration Avancée (Optionnel)
```json
{
  "headers": {
    "User-Agent": "MCP-GitHub-Connector/1.0.0",
    "Accept": "application/json"
  },
  "timeout": 30000,
  "retry": {
    "max_attempts": 3,
    "backoff_multiplier": 2
  }
}
```

## Test de l'Intégration

### 1. Test de Connexion
Une fois configuré, testez avec :
```
Bonjour ! Peux-tu me montrer les repositories React les plus populaires ?
```

### 2. Tests Fonctionnels
Essayez ces commandes :
```
🔍 Recherche repos
"Montre-moi les repositories JavaScript avec plus de 5000 étoiles"

📋 Gestion issues
"Quelles sont les issues ouvertes dans le repo facebook/react ?"

👤 Profils utilisateurs
"Quel est le profil GitHub de sindresorhus ?"

📁 Exploration code
"Cherche du code qui utilise useState dans le repo vercel/next.js"

🔄 Pull requests
"Liste les PR ouvertes dans microsoft/vscode"
```

## Dépannage

### Problème : "Outil non disponible"
**Solution :**
- Vérifiez que l'URL SSE est accessible
- Testez : `curl https://votredomaine.vercel.app/health`
- Vérifiez les logs Vercel

### Problème : "Erreur OAuth"
**Solution :**
- Vérifiez que Client ID/Secret sont corrects
- Vérifiez l'URL de callback dans GitHub OAuth App
- Redémarrez ChatGPT et réautorisez

### Problème : "Rate limit"
**Solution :**
- Ajoutez un token personnel GitHub dans les variables Vercel
- Réduisez la fréquence des requêtes

## Fonctionnalités Disponibles

### 🔍 Outils de Recherche
- `search_repositories` : Recherche avancée de repos
- `search_code` : Recherche de code spécifique
- `get_user_profile` : Profils utilisateurs détaillés

### 📋 Gestion Issues & PR
- `list_issues` : Consultation des issues
- `create_issue` : Création d'issues
- `get_pull_requests` : Suivi des PR

### 📁 Exploration
- `get_repository` : Détails complets d'un repo
- `get_repository_contents` : Exploration des fichiers
- `get_user_profile` : Informations utilisateurs

## Exemples d'Utilisation Avancée

### Recherche Spécialisée
```
Trouve-moi des repositories Python pour l'analyse de données avec plus de 1000 étoiles
```

### Gestion de Projet
```
Crée une issue dans mon-repo pour "Feature: Ajouter l'authentification OAuth"
Avec les labels: enhancement, priority-high
```

### Analyse de Code
```
Montre-moi tous les fichiers de configuration dans le repo microsoft/TypeScript
Cherche des fonctions qui utilisent async/await dans facebook/react
```

### Suivi Contributeurs
```
Qui sont les 10 contributeurs les plus actifs sur le repo vercel/next.js ?
Quel est le profil détaillé de gaearon ?
```

## Sécurité & Confidentialité

### 🔒 Données Sécurisées
- Toutes les communications chiffrées (HTTPS)
- Authentification OAuth GitHub obligatoire
- Tokens temporaires, pas de stockage persistant
- Rate limiting activé (100 req/min)

### 👁️ Transparence
- Logs détaillés des actions
- Possibilité de révoquer l'accès à tout moment
- Aucune donnée stockée sans consentement
- Conformité RGPD

## Support & Maintenance

### 🔄 Mises à Jour
- Le serveur se met à jour automatiquement sur Vercel
- Nouvelles fonctionnalités ajoutées régulièrement
- Compatibilité ChatGPT maintenue

### 🆘 Support
- **Documentation** : [README complet](./README.md)
- **Issues** : Signalez les problèmes sur GitHub
- **Logs** : Accédez aux logs via Vercel dashboard

---

## 🎉 Configuration Terminée !

Votre serveur MCP GitHub est maintenant connecté à ChatGPT !

**🚀 Vous pouvez maintenant :**
- 🔍 Explorer des milliers de repositories
- 📋 Gérer les issues et pull requests
- 👤 Analyser les profils développeurs
- 📊 Rechercher du code spécifique
- 🔄 Intégrer GitHub dans vos conversations

**💡 Astuce :** Commencez par demander "Montre-moi les repositories les plus populaires en [technologie]" pour tester l'intégration.

**🎯 Prêt à coder avec GitHub dans ChatGPT !**
