# Script PowerShell pour lancer tous les tests
Write-Host "🚀 Lancement de tous les tests..." -ForegroundColor Cyan

# Tests Frontend
Write-Host "`n📦 Tests Frontend..." -ForegroundColor Yellow
Set-Location frontend
npm test -- --run

# Tests Backend
Write-Host "`n📦 Tests Backend..." -ForegroundColor Yellow
Set-Location ../backend
npm test -- --run

# Retour au répertoire racine
Set-Location ..

Write-Host "`n✅ Tests terminés!" -ForegroundColor Green
Write-Host "📊 Voir TEST-REPORT-FINAL.md pour le rapport complet" -ForegroundColor Cyan