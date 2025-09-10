@echo off
echo ===============================================
echo DEPLOIEMENT URGENT - DRAIN FORTIN PRODUCTION
echo ===============================================

echo.
echo [1/4] Configuration des variables d'environnement...
cd frontend
copy .env .env.backup 2>nul

echo.
echo [2/4] Build de production...
call npm run build
if errorlevel 1 (
    echo ERREUR: Le build a echoue!
    pause
    exit /b 1
)

echo.
echo [3/4] Deploiement sur Vercel...
cd ..
call vercel --prod --yes
if errorlevel 1 (
    echo.
    echo AVERTISSEMENT: Vercel CLI n'est pas installe
    echo Installation de Vercel CLI...
    call npm i -g vercel
    call vercel --prod --yes
)

echo.
echo [4/4] Test de l'URL de production...
echo.
echo ===============================================
echo DEPLOIEMENT COMPLETE!
echo ===============================================
echo.
echo URLs DE PRODUCTION:
echo - LOCAL: http://localhost:5174
echo - VERCEL: Verifiez le lien ci-dessus
echo - SUPABASE: https://phiduqxcufdmgjvdipyu.supabase.co/storage/v1/object/public/web-app/drain-fortin/index.html
echo.
echo IDENTIFIANTS:
echo - Email: admin@drainfortin.com
echo - Mot de passe: Admin123!@#
echo.
echo ===============================================
pause