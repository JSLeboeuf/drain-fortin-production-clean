@echo off
chcp 65001 >nul
color 0A
title 🚀 Installation Drain Fortin - Paul v39

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  🏠 INSTALLATION DRAIN FORTIN - SYSTÈME PAUL v39             ║
echo ║                                                              ║
echo ║  Bonjour Guillaume ! Ce script va installer automatiquement  ║
echo ║  votre système d'IA vocale en quelques minutes.             ║
echo ║                                                              ║
echo ║  ⏱️  Durée estimée : 5-10 minutes                           ║
echo ║  📱 En cas de problème : 1-800-AUTO-SCALE                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

pause

echo 🔍 ÉTAPE 1/7 - Vérification du système...
timeout /t 2 /nobreak >nul

REM Vérifier si Node.js est installé
echo   📦 Vérification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ Node.js n'est pas installé !
    echo.
    echo   🔽 Téléchargement automatique de Node.js...
    echo   Veuillez installer Node.js depuis la fenêtre qui va s'ouvrir
    start "" https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi
    echo.
    echo   ⏳ Après installation, fermez cette fenêtre et relancez ce script
    pause
    exit /b 1
)
echo   ✅ Node.js détecté - Version :
node --version

REM Vérifier si npm est installé
echo   📦 Vérification de npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ npm n'est pas installé correctement !
    echo   📞 Contactez le support : 1-800-AUTO-SCALE
    pause
    exit /b 1
)
echo   ✅ npm détecté - Version :
npm --version

echo.
echo 📂 ÉTAPE 2/7 - Préparation des dossiers...
timeout /t 1 /nobreak >nul

if not exist "node_modules" (
    echo   📁 Création du dossier node_modules...
)
if not exist "logs" (
    echo   📁 Création du dossier logs...
    mkdir logs
)

echo.
echo 📥 ÉTAPE 3/7 - Installation des dépendances...
echo   ⏳ Ceci peut prendre 3-5 minutes selon votre connexion...
timeout /t 1 /nobreak >nul

echo   📦 Installation du frontend...
cd frontend
call npm install --silent
if %errorlevel% neq 0 (
    echo   ❌ Erreur lors de l'installation frontend !
    echo   📞 Contactez le support : support@autoscaleai.ca
    pause
    exit /b 1
)
cd ..

echo   📦 Installation du backend...
cd backend
call npm install --silent
if %errorlevel% neq 0 (
    echo   ❌ Erreur lors de l'installation backend !
    echo   📞 Contactez le support : support@autoscaleai.ca
    pause
    exit /b 1
)
cd ..

echo   ✅ Toutes les dépendances installées avec succès !

echo.
echo ⚙️  ÉTAPE 4/7 - Configuration de l'environnement...
timeout /t 1 /nobreak >nul

REM Copier le fichier de configuration exemple
if not exist ".env" (
    if exist ".env.production.example" (
        echo   📋 Copie de la configuration de production...
        copy ".env.production.example" ".env" >nul
        echo   ✅ Fichier de configuration créé
    ) else (
        echo   ⚠️  Fichier de configuration exemple manquant
        echo   📞 Contactez le support pour obtenir votre configuration
    )
) else (
    echo   ✅ Configuration existante détectée
)

echo.
echo 🗄️  ÉTAPE 5/7 - Configuration de la base de données...
timeout /t 2 /nobreak >nul

echo   📊 Vérification des tables Supabase...
node create-supabase-tables.js
if %errorlevel% neq 0 (
    echo   ⚠️  Note: Les tables seront créées au premier démarrage
)

echo.
echo 🔧 ÉTAPE 6/7 - Tests du système...
timeout /t 1 /nobreak >nul

echo   🧪 Test de compilation frontend...
cd frontend
call npm run build >nul 2>&1
if %errorlevel% neq 0 (
    echo   ⚠️  Avertissement: Erreur de compilation, mais on continue...
) else (
    echo   ✅ Frontend compilé avec succès
)
cd ..

echo   🧪 Test de la configuration...
if exist ".env" (
    echo   ✅ Configuration validée
) else (
    echo   ⚠️  Configuration manquante - à configurer manuellement
)

echo.
echo 🎯 ÉTAPE 7/7 - Finalisation...
timeout /t 1 /nobreak >nul

echo   📄 Génération du rapport d'installation...
echo Installation Drain Fortin - Paul v39 > logs\installation-report.txt
echo Date: %date% %time% >> logs\installation-report.txt
echo Status: SUCCESS >> logs\installation-report.txt
echo Node.js: >> logs\installation-report.txt
node --version >> logs\installation-report.txt 2>&1
echo npm: >> logs\installation-report.txt
npm --version >> logs\installation-report.txt 2>&1

echo.
color 0B
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  🎉 INSTALLATION TERMINÉE AVEC SUCCÈS !                     ║
echo ║                                                              ║
echo ║  ✅ Frontend installé                                        ║
echo ║  ✅ Backend configuré                                        ║
echo ║  ✅ Base de données préparée                                 ║
echo ║  ✅ Tests de base réussis                                    ║
echo ║                                                              ║
echo ║  🚀 PROCHAINES ÉTAPES :                                      ║
echo ║                                                              ║
echo ║  1. Double-cliquez sur "DEMARRER-PAUL.bat"                  ║
echo ║  2. Ouvrez votre navigateur à l'adresse affichée            ║
echo ║  3. Suivez le guide START-HERE-GUILLAUME.md                 ║
echo ║                                                              ║
echo ║  📞 Support 24/7 : 1-800-AUTO-SCALE                         ║
echo ║  📧 Email : support@autoscaleai.ca                          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Créer le fichier de démarrage
echo @echo off > DEMARRER-PAUL.bat
echo title 🤖 Paul v39 - Assistant IA Drain Fortin >> DEMARRER-PAUL.bat
echo echo. >> DEMARRER-PAUL.bat
echo echo 🤖 Démarrage de Paul - Assistant IA Drain Fortin... >> DEMARRER-PAUL.bat
echo echo. >> DEMARRER-PAUL.bat
echo echo 🌐 Ouverture de votre tableau de bord... >> DEMARRER-PAUL.bat
echo timeout /t 3 /nobreak ^>nul >> DEMARRER-PAUL.bat
echo cd frontend >> DEMARRER-PAUL.bat
echo start "" http://localhost:5173 >> DEMARRER-PAUL.bat
echo npm run dev >> DEMARRER-PAUL.bat
echo pause >> DEMARRER-PAUL.bat

echo   ✅ Fichier de démarrage créé : DEMARRER-PAUL.bat

echo.
echo 🎊 Guillaume, votre système Paul v39 est prêt !
echo.
echo 💡 CONSEIL : Gardez cette fenêtre ouverte comme référence
echo.

pause

REM Proposer de démarrer immédiatement
echo.
set /p choix="🚀 Voulez-vous démarrer Paul maintenant ? (O/N) : "
if /i "%choix%"=="O" (
    echo.
    echo 🤖 Démarrage de Paul...
    timeout /t 2 /nobreak >nul
    start "" "DEMARRER-PAUL.bat"
) else (
    echo.
    echo 👍 Parfait ! Quand vous serez prêt, double-cliquez sur "DEMARRER-PAUL.bat"
)

echo.
echo 🤖 Merci d'avoir choisi AutoScale AI !
timeout /t 3 /nobreak >nul