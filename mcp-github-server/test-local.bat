@echo off
echo ============================================
echo 🧪 TEST LOCAL - Serveur MCP GitHub
echo ============================================
echo.
echo Ce script va :
echo 1. Verifier l'installation de Node.js
echo 2. Installer les dependances si necessaire
echo 3. Builder le projet
echo 4. Demarrer le serveur en mode test
echo.
echo Appuyez sur une touche pour continuer...
pause >nul

echo.
echo 🔍 Verification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installe !
    echo 📥 Telechargez-le sur https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js detecte
echo.

if not exist "node_modules" (
    echo 📦 Installation des dependances...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erreur lors de l'installation
        pause
        exit /b 1
    )
    echo ✅ Dependances installees
) else (
    echo ✅ Dependances deja presentes
)

echo.
echo 🔨 Build du projet...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Erreur lors du build
    pause
    exit /b 1
)

echo ✅ Build reussi
echo.

echo 🚀 Demarrage du serveur...
echo.
echo Le serveur sera accessible sur :
echo 📡 http://localhost:3001
echo 💚 http://localhost:3001/health
echo 🔐 http://localhost:3001/auth/github
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

npm start
