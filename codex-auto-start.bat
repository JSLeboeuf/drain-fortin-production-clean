@echo off
REM 🚀 CODEX FULL AUTO START - ProductionCodex Agent
REM Démarrage automatique complet de Codex

echo 🚀 PRODUCTIONCODEX - CODEX FULL AUTO START
echo ===========================================

REM Vérifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installé !
    echo Téléchargez-le depuis https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js détecté

REM Démarrer Codex en mode full auto
echo.
echo 🔄 Démarrage de Codex en mode FULL AUTO...
echo.

node servers/codex/server.mjs --mode=production --auto-start --full-context --performance-max --mcp-bridge=enabled --agents=all --monitoring=active --optimization=ultra --project-root=. --log-level=info --timeout=300000 --retry-attempts=5 --streaming=true --model=gpt-4-turbo --temperature=0.1 --max-tokens=4096

echo.
echo ✅ Codex arrêté
echo.
pause
