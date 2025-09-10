@echo off
REM 🚀 QUICK EXPLORER OPEN - ProductionCodex Agent
REM Ouverture rapide de l'Explorateur de fichiers

echo 🚀 PRODUCTIONCODEX - OUVERTURE RAPIDE EXPLORER
echo ===============================================

echo 🔄 Tentative d'ouverture de l'Explorateur...

REM Méthode 1 : Démarrage normal
start explorer.exe

timeout /t 1 /nobreak >nul

REM Méthode 2 : Ouverture du dossier utilisateur
start %userprofile%

timeout /t 1 /nobreak >nul

REM Méthode 3 : Ouverture du bureau
start shell:desktop

timeout /t 1 /nobreak >nul

REM Méthode 4 : Ouverture de Ce PC
start shell:mycomputer

echo ✅ Commandes d'ouverture envoyées !
echo.
echo 📋 Si l'explorateur ne s'ouvre toujours pas :
echo • Utilisez le script 'force-explorer.bat' pour un reset complet
echo • Redémarrez votre ordinateur
echo • Utilisez Ctrl + Shift + Esc pour le Gestionnaire des tâches
echo.
pause

