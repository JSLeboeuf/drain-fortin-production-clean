@echo off
REM 🚀 FORCE EXPLORER RESTART - ProductionCodex Agent
REM Forcer le redémarrage de l'Explorateur Windows

echo 🚀 PRODUCTIONCODEX - FORCE EXPLORER RESTART
echo ============================================

echo 🔍 Vérification de l'état actuel d'Explorer...
tasklist /fi "imagename eq explorer.exe" 2>nul
if %errorlevel% neq 0 (
    echo ❌ Explorer.exe n'est pas en cours d'exécution
) else (
    echo ✅ Explorer.exe est en cours d'exécution
)

echo.
echo 🔄 Arrêt forcé d'Explorer...
taskkill /f /im explorer.exe >nul 2>&1

timeout /t 2 /nobreak >nul

echo 🚀 Redémarrage d'Explorer...
start explorer.exe

timeout /t 3 /nobreak >nul

echo ✅ Explorer redémarré avec succès !
echo.
echo 📋 Actions supplémentaires recommandées :
echo • Appuyez sur Win + E pour ouvrir l'Explorateur de fichiers
echo • Vérifiez que votre bureau s'affiche correctement
echo • Si problèmes persistants, redémarrez votre ordinateur
echo.
pause

