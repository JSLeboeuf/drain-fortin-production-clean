@echo off
echo =========================================
echo   DRAIN FORTIN - DEMARRAGE PRODUCTION
echo =========================================
echo.

echo [1/4] Verification environnement...
if not exist .env (
    echo ERREUR: Fichier .env manquant!
    exit /b 1
)

echo [2/4] Installation dependances si necessaire...
cd frontend
if not exist node_modules (
    echo Installation dependances frontend...
    call npm install --silent
)
cd ..

echo [3/4] Build production frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ERREUR: Build frontend echoue!
    exit /b 1
)
cd ..

echo [4/4] Demarrage serveur production...
cd frontend
echo.
echo =========================================
echo   SYSTEME PRET - http://localhost:4173
echo =========================================
echo.
call npm run preview

pause