#!/bin/bash

echo "🚀 Déploiement du Serveur MCP GitHub sur Vercel"
echo "================================================"

# Vérifier si Vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI n'est pas installé."
    echo "Installez-le avec : npm i -g vercel"
    exit 1
fi

# Vérifier si le projet est buildé
if [ ! -d "dist" ]; then
    echo "🔨 Build du projet..."
    npm run build
fi

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env non trouvé !"
    echo "Créez-le à partir de ENVIRONMENT.md"
    echo ""
    echo "Contenu minimal requis :"
    echo "GITHUB_CLIENT_ID=votre_client_id"
    echo "GITHUB_CLIENT_SECRET=votre_client_secret"
    echo "GITHUB_REDIRECT_URI=https://votredomaine.vercel.app/auth/github/callback"
    exit 1
fi

echo "📦 Déploiement sur Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Déploiement réussi !"
    echo ""
    echo "📋 Prochaines étapes :"
    echo "1. Copiez l'URL Vercel (ex: https://mon-projet.vercel.app)"
    echo "2. Dans ChatGPT → Paramètres → Outils personnalisés"
    echo "3. URL du serveur MCP : https://mon-projet.vercel.app/sse"
    echo "4. Configurez OAuth avec vos clés GitHub"
    echo ""
    echo "🔗 Testez avec : curl https://mon-projet.vercel.app/health"
    echo ""
    echo "🎉 Prêt à utiliser GitHub dans ChatGPT !"
else
    echo ""
    echo "❌ Échec du déploiement."
    echo "Vérifiez les logs Vercel et vos variables d'environnement."
    exit 1
fi
