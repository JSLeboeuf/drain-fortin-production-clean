#!/bin/bash

# Script pour lancer tous les tests
echo -e "\033[36m🚀 Lancement de tous les tests...\033[0m"

# Tests Frontend
echo -e "\n\033[33m📦 Tests Frontend...\033[0m"
cd frontend
npm test -- --run

# Tests Backend
echo -e "\n\033[33m📦 Tests Backend...\033[0m"
cd ../backend
npm test -- --run

# Retour au répertoire racine
cd ..

echo -e "\n\033[32m✅ Tests terminés!\033[0m"
echo -e "\033[36m📊 Voir TEST-REPORT-FINAL.md pour le rapport complet\033[0m"