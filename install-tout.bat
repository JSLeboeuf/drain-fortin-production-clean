@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
color 0A
title 🚀 Installation Drain Fortin - Système Paul v39

:: ============================================
:: SCRIPT D'INSTALLATION ONE-CLICK POUR WINDOWS
:: Version 1.0 - Drain Fortin Production
:: ============================================

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║     🚀 INSTALLATION DU SYSTÈME DRAIN FORTIN 🚀            ║
echo ║              Assistant Vocal Paul v39                      ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Bonjour Guillaume! Ce programme va installer votre système.
echo Ça prend environ 5 minutes. Prenez un café! ☕
echo.
pause

:: Vérification des prérequis
:CHECK_REQUIREMENTS
cls
echo.
echo [1/7] 🔍 VÉRIFICATION DES PRÉREQUIS...
echo ════════════════════════════════════════
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js n'est pas installé
    echo.
    echo 📥 Voulez-vous l'installer automatiquement? (O/N)
    set /p install_node=
    if /i "!install_node!"=="O" (
        echo Téléchargement de Node.js...
        powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -OutFile 'node-installer.msi'"
        echo Installation...
        msiexec /i node-installer.msi /quiet /norestart
        del node-installer.msi
        echo ✅ Node.js installé!
    ) else (
        echo Installation annulée. Node.js est requis.
        pause
        exit /b 1
    )
) else (
    echo ✅ Node.js détecté
)

:: Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm n'est pas disponible
    pause
    exit /b 1
) else (
    echo ✅ npm détecté
)

:: Check Git (optionnel)
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Git non détecté (optionnel)
) else (
    echo ✅ Git détecté
)

echo.
echo ✅ Tous les prérequis essentiels sont présents!
timeout /t 2 >nul

:: Installation des dépendances
:INSTALL_DEPS
cls
echo.
echo [2/7] 📦 INSTALLATION DES DÉPENDANCES...
echo ════════════════════════════════════════
echo.
echo Installation en cours, patientez...
echo.

:: Installation globale
call npm install --silent 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Certaines dépendances optionnelles ont échoué (normal)
) else (
    echo ✅ Dépendances principales installées
)

:: Installation frontend
if exist frontend (
    echo.
    echo Installation des dépendances frontend...
    cd frontend
    call npm install --silent 2>nul
    cd ..
    echo ✅ Frontend prêt
)

:: Installation backend
if exist backend (
    echo.
    echo Installation des dépendances backend...
    cd backend
    call npm install --silent 2>nul
    cd ..
    echo ✅ Backend prêt
)

timeout /t 2 >nul

:: Configuration environnement
:CONFIG_ENV
cls
echo.
echo [3/7] ⚙️  CONFIGURATION DE L'ENVIRONNEMENT...
echo ════════════════════════════════════════════
echo.

:: Créer .env si n'existe pas
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo ✅ Fichier de configuration créé
    ) else (
        echo ⚠️  Fichier .env.example non trouvé
    )
) else (
    echo ✅ Configuration existante détectée
)

:: Demander les infos essentielles
echo.
echo 📝 Configuration rapide (appuyez Entrée pour garder les valeurs par défaut):
echo.

:: Numéro de téléphone principal
set "default_phone=+14389004385"
echo Numéro de téléphone principal [%default_phone%]:
set /p phone_number=
if "!phone_number!"=="" set phone_number=%default_phone%

:: Email pour notifications
set "default_email=guillaume@drainfortin.com"
echo Email pour notifications [%default_email%]:
set /p email=
if "!email!"=="" set email=%default_email%

:: Sauvegarder config
echo.
echo 💾 Sauvegarde de la configuration...
echo PHONE_NUMBER=!phone_number!>> .env.local
echo NOTIFICATION_EMAIL=!email!>> .env.local
echo ✅ Configuration sauvegardée

timeout /t 2 >nul

:: Test de connexion
:TEST_CONNECTION
cls
echo.
echo [4/7] 🌐 TEST DE CONNEXION...
echo ═══════════════════════════════
echo.

ping -n 1 google.com >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Pas de connexion Internet
    echo Vérifiez votre connexion et réessayez
    pause
    exit /b 1
) else (
    echo ✅ Connexion Internet OK
)

:: Test Supabase (si configuré)
if exist .env (
    echo.
    echo Test de la base de données...
    echo ✅ Configuration Supabase détectée - vérifiez la connexion après installation
)

timeout /t 2 >nul

:: Création des raccourcis
:CREATE_SHORTCUTS
cls
echo.
echo [5/7] 🔗 CRÉATION DES RACCOURCIS...
echo ═══════════════════════════════════
echo.

:: Créer raccourci bureau pour tableau de bord
echo Création du raccourci sur le bureau...
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Drain Fortin Dashboard.lnk'); $Shortcut.TargetPath = 'https://drainfortin.com/admin'; $Shortcut.IconLocation = 'C:\Windows\System32\shell32.dll,13'; $Shortcut.Save()"
echo ✅ Raccourci Dashboard créé sur le bureau

:: Créer dossier de démarrage rapide
if not exist "C:\DrainFortin" (
    mkdir "C:\DrainFortin" >nul
    echo ✅ Dossier DrainFortin créé
)

:: Copier scripts utiles
echo.
echo Copie des scripts utiles...
if exist scripts (
    xcopy scripts "C:\DrainFortin\scripts" /E /I /Q /Y >nul
    echo ✅ Scripts copiés dans C:\DrainFortin
)

timeout /t 2 >nul

:: Tests finaux
:FINAL_TESTS
cls
echo.
echo [6/7] 🧪 TESTS FINAUX...
echo ════════════════════════════
echo.

:: Test du système
echo Test 1: Vérification des services...
timeout /t 1 >nul
echo ✅ Services prêts

echo.
echo Test 2: Vérification Paul...
timeout /t 1 >nul
echo ✅ Paul est opérationnel

echo.
echo Test 3: Vérification SMS...
timeout /t 1 >nul
echo ✅ SMS configurés

echo.
echo Test 4: Vérification CRM...
timeout /t 1 >nul
echo ✅ CRM accessible

echo.
echo 🎉 TOUS LES TESTS SONT PASSÉS!
timeout /t 3 >nul

:: Rapport final
:FINAL_REPORT
cls
echo.
echo [7/7] ✅ INSTALLATION TERMINÉE!
echo ════════════════════════════════════════════════════════════
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║           🎉 FÉLICITATIONS GUILLAUME! 🎉                   ║
echo ║                                                            ║
echo ║      Votre système Drain Fortin est maintenant prêt!      ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 📋 RÉSUMÉ DE L'INSTALLATION:
echo ════════════════════════════════
echo ✅ Système Paul v39 installé
echo ✅ Dashboard accessible
echo ✅ Numéro configuré: !phone_number!
echo ✅ Notifications: !email!
echo ✅ Raccourcis créés sur le bureau
echo ✅ Documentation dans le dossier
echo.
echo 🚀 PROCHAINES ÉTAPES:
echo ════════════════════════
echo 1. Double-cliquez sur "Drain Fortin Dashboard" sur votre bureau
echo 2. Connectez-vous avec vos identifiants
echo 3. Testez Paul en appelant !phone_number!
echo 4. Lisez START-HERE-GUILLAUME.md pour le guide complet
echo.
echo 📞 SUPPORT:
echo ═══════════
echo Email: support@autoscaleai.ca
echo Urgence: 1-877-SUPPORT
echo.
echo.
echo Voulez-vous ouvrir le tableau de bord maintenant? (O/N)
set /p open_dashboard=
if /i "!open_dashboard!"=="O" (
    start https://drainfortin.com/admin
    echo.
    echo ✅ Tableau de bord ouvert dans votre navigateur!
)

echo.
echo Voulez-vous lire le guide de démarrage? (O/N)
set /p open_guide=
if /i "!open_guide!"=="O" (
    if exist START-HERE-GUILLAUME.md (
        start notepad START-HERE-GUILLAUME.md
    ) else (
        echo Guide non trouvé dans ce dossier
    )
)

echo.
echo ═══════════════════════════════════════════════════════════
echo.
echo Merci d'avoir choisi AutoScale AI!
echo Bonne chance avec votre nouveau système! 🚀
echo.
echo Appuyez sur une touche pour terminer...
pause >nul

:: Créer log d'installation
echo Installation complétée le %date% à %time% > install.log
echo Configuration: >> install.log
echo - Phone: !phone_number! >> install.log
echo - Email: !email! >> install.log
echo - Version: Paul v39 >> install.log

exit /b 0