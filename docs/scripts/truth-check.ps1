# Truth Check Script - Validation objective du système
# Vérifie les déclarations vs la réalité
# Author: Claude Code ULTRATHINK
# Date: 2025-09-08

param(
    [switch]$Verbose = $false,
    [switch]$GenerateReport = $false
)

$ErrorActionPreference = "Continue"
$script:results = @{}
$script:score = 0
$script:maxScore = 100

# Colors
function Write-Truth { Write-Host "✅ VÉRITÉ: $args" -ForegroundColor Green }
function Write-Lie { Write-Host "❌ FAUX: $args" -ForegroundColor Red }
function Write-Partial { Write-Host "⚠️  PARTIEL: $args" -ForegroundColor Yellow }
function Write-Check { Write-Host "🔍 Vérification: $args" -ForegroundColor Cyan }

Write-Host "`n═══════════════════════════════════════" -ForegroundColor Magenta
Write-Host "    TRUTH CHECK - DRAIN FORTIN v1.0    " -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# 1. Vérifier les tests backend
Write-Check "Tests Backend (déclaré: 100% coverage)"
$backendTests = Get-ChildItem -Path "backend/tests" -Filter "*.test.ts" -ErrorAction SilentlyContinue
if ($backendTests) {
    $testCount = $backendTests.Count
    if ($testCount -ge 20) {
        Write-Truth "$testCount tests trouvés"
        $script:score += 10
    } elseif ($testCount -ge 5) {
        Write-Partial "$testCount tests seulement (attendu: 20+)"
        $script:score += 5
    } else {
        Write-Lie "Seulement $testCount tests (déclaré: complet)"
        $script:score += 2
    }
} else {
    Write-Lie "Aucun test backend trouvé!"
}

# 2. Vérifier les tests frontend
Write-Check "Tests Frontend (déclaré: 94.6% coverage)"
$frontendTests = Get-ChildItem -Path "frontend/src" -Recurse -Filter "*.test.*" -ErrorAction SilentlyContinue
if ($frontendTests) {
    $testCount = $frontendTests.Count
    if ($testCount -ge 30) {
        Write-Truth "$testCount tests trouvés"
        $script:score += 10
    } elseif ($testCount -ge 10) {
        Write-Partial "$testCount tests (attendu: 30+)"
        $script:score += 5
    } else {
        Write-Lie "$testCount tests seulement"
        $script:score += 2
    }
} else {
    Write-Lie "Aucun test frontend!"
}

# 3. Vérifier la couverture réelle
Write-Check "Coverage réel"
try {
    Set-Location frontend -ErrorAction Stop
    $coverageOutput = npm run test:coverage --silent 2>&1 | Out-String
    if ($coverageOutput -match "(\d+\.?\d*)%") {
        $coverage = [float]$Matches[1]
        if ($coverage -ge 80) {
            Write-Truth "Coverage: $coverage%"
            $script:score += 15
        } elseif ($coverage -ge 50) {
            Write-Partial "Coverage: $coverage% (déclaré: 94.6%)"
            $script:score += 8
        } else {
            Write-Lie "Coverage: $coverage% (déclaré: 94.6%)"
            $script:score += 3
        }
    }
    Set-Location ..
} catch {
    Write-Lie "Impossible de mesurer la couverture"
}

# 4. Vérifier les secrets
Write-Check "Sécurité - Secrets (déclaré: 0 exposition)"
$secrets = Select-String -Path @("**/*.ts", "**/*.js", "**/*.json") -Pattern "api_key|apikey|secret|password" -ErrorAction SilentlyContinue | 
           Where-Object { $_.Line -notmatch "process\.env|import\.meta\.env|example" }

if ($secrets) {
    $secretCount = ($secrets | Measure-Object).Count
    if ($secretCount -eq 0) {
        Write-Truth "Aucun secret exposé"
        $script:score += 15
    } elseif ($secretCount -le 5) {
        Write-Partial "$secretCount secrets potentiels trouvés"
        $script:score += 7
    } else {
        Write-Lie "$secretCount secrets trouvés!"
        $script:score += 0
    }
} else {
    Write-Truth "Aucun secret détecté"
    $script:score += 15
}

# 5. Vérifier les migrations
Write-Check "Migrations DB (déclaré: idempotentes)"
$migrations = Get-ChildItem -Path "backend/supabase/migrations" -Filter "*.sql" -ErrorAction SilentlyContinue
if ($migrations) {
    $hasTransactions = $false
    $hasDownMigrations = $false
    
    foreach ($migration in $migrations) {
        $content = Get-Content $migration.FullName -Raw
        if ($content -match "BEGIN;|BEGIN TRANSACTION") {
            $hasTransactions = $true
        }
        if ($content -match "-- DOWN|DROP TABLE IF EXISTS") {
            $hasDownMigrations = $true
        }
    }
    
    if ($hasTransactions -and $hasDownMigrations) {
        Write-Truth "Migrations avec transactions et rollback"
        $script:score += 10
    } elseif ($hasTransactions -or $hasDownMigrations) {
        Write-Partial "Migrations partiellement sécurisées"
        $script:score += 5
    } else {
        Write-Lie "Migrations sans protection"
        $script:score += 2
    }
}

# 6. Vérifier le build
Write-Check "Build Production"
try {
    Set-Location frontend
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Truth "Build réussi"
        $script:score += 10
        
        # Vérifier la taille du bundle
        $distSize = (Get-ChildItem -Path "dist" -Recurse -ErrorAction SilentlyContinue | 
                    Measure-Object -Property Length -Sum).Sum / 1MB
        
        if ($distSize -le 1) {
            Write-Truth "Bundle optimisé: $([math]::Round($distSize, 2)) MB"
            $script:score += 5
        } elseif ($distSize -le 5) {
            Write-Partial "Bundle: $([math]::Round($distSize, 2)) MB"
            $script:score += 3
        } else {
            Write-Lie "Bundle trop gros: $([math]::Round($distSize, 2)) MB"
        }
    } else {
        Write-Lie "Build échoué!"
    }
    Set-Location ..
} catch {
    Write-Lie "Impossible de builder"
}

# 7. Vérifier les dépendances vulnérables
Write-Check "Vulnérabilités NPM"
try {
    Set-Location frontend
    $auditOutput = npm audit --json 2>$null | ConvertFrom-Json
    
    $critical = $auditOutput.metadata.vulnerabilities.critical
    $high = $auditOutput.metadata.vulnerabilities.high
    
    if ($critical -eq 0 -and $high -eq 0) {
        Write-Truth "Aucune vulnérabilité critique/haute"
        $script:score += 10
    } elseif ($critical -eq 0) {
        Write-Partial "$high vulnérabilités hautes"
        $script:score += 5
    } else {
        Write-Lie "$critical critiques, $high hautes"
        $script:score += 0
    }
    Set-Location ..
} catch {
    Write-Partial "Audit non disponible"
    $script:score += 3
}

# 8. Vérifier la documentation
Write-Check "Documentation (déclaré: complète)"
$requiredDocs = @(
    "README.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    ".env.example",
    "docs/API.md",
    "docs/DEPLOYMENT.md"
)

$foundDocs = 0
foreach ($doc in $requiredDocs) {
    if (Test-Path $doc) {
        $foundDocs++
    }
}

if ($foundDocs -eq $requiredDocs.Count) {
    Write-Truth "Documentation complète"
    $script:score += 5
} elseif ($foundDocs -ge 3) {
    Write-Partial "$foundDocs/$($requiredDocs.Count) documents"
    $script:score += 3
} else {
    Write-Lie "Documentation manquante: $foundDocs/$($requiredDocs.Count)"
    $script:score += 1
}

# 9. Vérifier les optimisations
Write-Check "Optimisations Performance"
$optimizationFiles = @(
    "frontend/src/pages/Dashboard.optimized.tsx",
    "frontend/src/components/OptimizedImage.tsx",
    "frontend/src/hooks/usePerformance.ts",
    "backend/supabase/functions/_shared/services/cache-service.ts"
)

$foundOptimizations = 0
foreach ($file in $optimizationFiles) {
    if (Test-Path $file) {
        $foundOptimizations++
    }
}

if ($foundOptimizations -eq $optimizationFiles.Count) {
    Write-Truth "Toutes les optimisations présentes"
    $script:score += 10
} elseif ($foundOptimizations -gt 0) {
    Write-Partial "$foundOptimizations/$($optimizationFiles.Count) optimisations"
    $script:score += 5
} else {
    Write-Lie "Optimisations manquantes!"
}

# RÉSUMÉ
Write-Host "`n═══════════════════════════════════════" -ForegroundColor Magenta
Write-Host "           RÉSULTAT VÉRITÉ              " -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════" -ForegroundColor Magenta

$percentage = [math]::Round(($script:score / $script:maxScore) * 100, 1)

Write-Host "`nScore de Vérité: $script:score/$script:maxScore ($percentage%)" -ForegroundColor White

if ($percentage -ge 90) {
    Write-Truth "PRODUCTION READY CONFIRMÉ"
    $verdict = "✅ PRÊT"
} elseif ($percentage -ge 70) {
    Write-Partial "PARTIELLEMENT PRÊT - Corrections nécessaires"
    $verdict = "⚠️ PARTIEL"
} else {
    Write-Lie "PAS PRÊT POUR PRODUCTION"
    $verdict = "❌ NON PRÊT"
}

Write-Host "`nVerdict: $verdict" -ForegroundColor White

# Comparaison avec déclarations
Write-Host "`n📊 Déclaré vs Réalité:" -ForegroundColor Cyan
Write-Host "  Score déclaré: 92/100" -ForegroundColor Gray
Write-Host "  Score mesuré: $percentage/100" -ForegroundColor White
Write-Host "  Écart: $([math]::Round(92 - $percentage, 1)) points" -ForegroundColor $(if ($percentage -ge 85) {"Green"} elseif ($percentage -ge 70) {"Yellow"} else {"Red"})

if ($GenerateReport) {
    $report = @"
# RAPPORT DE VÉRITÉ - $(Get-Date -Format "yyyy-MM-dd HH:mm")

## Score Final: $percentage%
## Verdict: $verdict

### Détails:
- Tests Backend: $(if ($script:results.BackendTests) {"✅"} else {"❌"})
- Tests Frontend: $(if ($script:results.FrontendTests) {"✅"} else {"❌"})
- Coverage: $(if ($script:results.Coverage -ge 80) {"✅"} else {"❌"})
- Sécurité: $(if ($script:results.Security) {"✅"} else {"❌"})
- Build: $(if ($script:results.Build) {"✅"} else {"❌"})

### Recommandations:
$(if ($percentage -lt 70) {
"1. Augmenter la couverture de tests
2. Corriger les vulnérabilités
3. Compléter la documentation
4. Implémenter les optimisations manquantes"
} else {
"1. Maintenir la qualité
2. Monitorer en production
3. Améliorer continuellement"
})
"@
    
    $report | Out-File "TRUTH-REPORT-$(Get-Date -Format 'yyyyMMdd').md"
    Write-Host "`n📄 Rapport généré: TRUTH-REPORT-$(Get-Date -Format 'yyyyMMdd').md" -ForegroundColor Green
}

exit $(if ($percentage -ge 70) {0} else {1})