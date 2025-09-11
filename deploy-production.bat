@echo off
echo ========================================
echo DRAIN FORTIN PRODUCTION DEPLOYMENT
echo ========================================

echo.
echo [1/5] Validating environment...
if not exist ".env" (
    echo ERROR: .env file not found
    exit /b 1
)

if not exist "frontend\.env.local" (
    echo ERROR: frontend\.env.local file not found  
    exit /b 1
)

echo [2/5] Installing dependencies...
cd frontend
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    exit /b 1
)

echo [3/5] Building production frontend...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend build failed
    exit /b 1
)

echo [4/5] Validating VAPI configuration...
cd ..
node scripts\vapi-validate.js
if %ERRORLEVEL% neq 0 (
    echo ERROR: VAPI validation failed
    exit /b 1
)

echo [5/5] Starting production preview...
cd frontend
start npm run preview

echo.
echo ========================================
echo ✅ PRODUCTION DEPLOYMENT COMPLETE
echo ========================================
echo.
echo 🌐 Preview: http://localhost:4173
echo 📊 Dashboard: Drain Fortin CRM v2.0.0
echo 🤖 VAPI Agent: Paul DrainFortin v4.2
echo.
echo Ready for Vercel deployment!
echo Run: vercel --prod
echo.
pause