# Quality Gate Script - Drain Fortin Production
# Validates code quality before deployment
# Author: Claude Code
# Date: 2025-09-08

param(
    [switch]$SkipTests = $false,
    [switch]$SkipSecurity = $false,
    [switch]$Verbose = $false,
    [switch]$FailFast = $false
)

$ErrorActionPreference = "Stop"
$script:hasErrors = $false
$script:results = @()

# Colors
function Write-Pass { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Fail { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Warn { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Step { Write-Host "`n🔄 $args" -ForegroundColor Blue }

# Quality checks
function Test-TypeScript {
    Write-Step "TypeScript Check"
    
    try {
        # Frontend TypeScript
        Set-Location frontend
        $output = npm run type-check 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Frontend TypeScript errors found"
            $script:hasErrors = $true
            return $false
        }
        Write-Pass "Frontend TypeScript OK"
        
        # Backend TypeScript
        Set-Location ../backend
        if (Test-Path "tsconfig.json") {
            $output = npx tsc --noEmit 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Fail "Backend TypeScript errors found"
                $script:hasErrors = $true
                return $false
            }
            Write-Pass "Backend TypeScript OK"
        }
        
        Set-Location ..
        return $true
    }
    catch {
        Write-Fail "TypeScript check failed: $_"
        $script:hasErrors = $true
        return $false
    }
}

function Test-Linting {
    Write-Step "Linting Check"
    
    try {
        # Frontend linting
        Set-Location frontend
        $output = npm run lint 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Frontend linting errors"
            if ($Verbose) { Write-Host $output }
            $script:hasErrors = $true
            return $false
        }
        Write-Pass "Frontend linting OK"
        
        Set-Location ..
        return $true
    }
    catch {
        Write-Fail "Linting failed: $_"
        $script:hasErrors = $true
        return $false
    }
}

function Test-Security {
    if ($SkipSecurity) {
        Write-Warn "Security check skipped"
        return $true
    }
    
    Write-Step "Security Audit"
    
    try {
        # Check for secrets in code
        Write-Info "Scanning for secrets..."
        $secrets = Select-String -Path "**/*.{js,ts,tsx,jsx,json}" -Pattern "api_key|apikey|secret|password|token" -CaseSensitive | 
                   Where-Object { $_.Line -notmatch "process\.env|import\.meta\.env|\$\{|//|/\*|\*.example" }
        
        if ($secrets.Count -gt 0) {
            Write-Fail "Found $($secrets.Count) potential secrets in code!"
            if ($Verbose) {
                $secrets | ForEach-Object { Write-Host "  $($_.Filename):$($_.LineNumber)" }
            }
            $script:hasErrors = $true
        } else {
            Write-Pass "No secrets found in code"
        }
        
        # NPM audit
        Write-Info "Running npm audit..."
        Set-Location frontend
        $auditOutput = npm audit --json 2>$null | ConvertFrom-Json
        
        if ($auditOutput.metadata.vulnerabilities.critical -gt 0) {
            Write-Fail "Critical vulnerabilities found: $($auditOutput.metadata.vulnerabilities.critical)"
            $script:hasErrors = $true
        } elseif ($auditOutput.metadata.vulnerabilities.high -gt 0) {
            Write-Warn "High vulnerabilities found: $($auditOutput.metadata.vulnerabilities.high)"
        } else {
            Write-Pass "No critical/high vulnerabilities"
        }
        
        Set-Location ..
        return -not $script:hasErrors
    }
    catch {
        Write-Fail "Security audit failed: $_"
        $script:hasErrors = $true
        return $false
    }
}

function Test-UnitTests {
    if ($SkipTests) {
        Write-Warn "Unit tests skipped"
        return $true
    }
    
    Write-Step "Unit Tests"
    
    try {
        # Frontend tests
        Set-Location frontend
        Write-Info "Running frontend tests..."
        $output = npm run test:run 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Frontend tests failed"
            if ($Verbose) { Write-Host $output }
            $script:hasErrors = $true
            return $false
        }
        Write-Pass "Frontend tests passed"
        
        # Backend tests
        Set-Location ../backend
        if (Test-Path "package.json") {
            Write-Info "Running backend tests..."
            $output = npm run test 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Fail "Backend tests failed"
                if ($Verbose) { Write-Host $output }
                $script:hasErrors = $true
                return $false
            }
            Write-Pass "Backend tests passed"
        }
        
        Set-Location ..
        return $true
    }
    catch {
        Write-Fail "Tests failed: $_"
        $script:hasErrors = $true
        return $false
    }
}

function Test-Coverage {
    if ($SkipTests) {
        return $true
    }
    
    Write-Step "Code Coverage"
    
    try {
        Set-Location frontend
        $coverage = npm run test:coverage --silent 2>&1 | Select-String "All files" | Out-String
        
        if ($coverage -match "(\d+\.?\d*)%") {
            $percent = [float]$Matches[1]
            if ($percent -lt 60) {
                Write-Fail "Coverage too low: $percent% (minimum: 60%)"
                $script:hasErrors = $true
            } elseif ($percent -lt 80) {
                Write-Warn "Coverage: $percent% (target: 80%)"
            } else {
                Write-Pass "Coverage: $percent%"
            }
        }
        
        Set-Location ..
        return $true
    }
    catch {
        Write-Warn "Coverage check failed: $_"
        return $true # Non-blocking
    }
}

function Test-Build {
    Write-Step "Build Validation"
    
    try {
        # Frontend build
        Set-Location frontend
        Write-Info "Building frontend..."
        $output = npm run build 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Frontend build failed"
            if ($Verbose) { Write-Host $output }
            $script:hasErrors = $true
            return $false
        }
        
        # Check bundle size
        $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        if ($distSize -gt 5) {
            Write-Warn "Bundle size large: $([math]::Round($distSize, 2)) MB"
        } else {
            Write-Pass "Bundle size: $([math]::Round($distSize, 2)) MB"
        }
        
        Set-Location ..
        return $true
    }
    catch {
        Write-Fail "Build failed: $_"
        $script:hasErrors = $true
        return $false
    }
}

function Test-Dependencies {
    Write-Step "Dependency Check"
    
    try {
        # Check for outdated packages
        Set-Location frontend
        $outdated = npm outdated --json 2>$null | ConvertFrom-Json
        
        $critical = @()
        foreach ($pkg in $outdated.PSObject.Properties) {
            if ($pkg.Value.wanted -ne $pkg.Value.latest) {
                $critical += $pkg.Name
            }
        }
        
        if ($critical.Count -gt 0) {
            Write-Warn "$($critical.Count) packages need updates"
            if ($Verbose) {
                $critical | ForEach-Object { Write-Host "  - $_" }
            }
        } else {
            Write-Pass "All dependencies up to date"
        }
        
        Set-Location ..
        return $true
    }
    catch {
        Write-Warn "Dependency check failed: $_"
        return $true # Non-blocking
    }
}

function Test-Documentation {
    Write-Step "Documentation Check"
    
    $requiredDocs = @(
        "README.md",
        ".env.example",
        "package.json"
    )
    
    $missing = @()
    foreach ($doc in $requiredDocs) {
        if (-not (Test-Path $doc)) {
            $missing += $doc
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Warn "Missing documentation: $($missing -join ', ')"
    } else {
        Write-Pass "Required documentation present"
    }
    
    return $true
}

# Main execution
function Start-QualityGate {
    Write-Host "`n" -NoNewline
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "     QUALITY GATE - DRAIN FORTIN      " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $startTime = Get-Date
    
    # Run all checks
    $checks = @(
        @{Name="TypeScript"; Function={Test-TypeScript}; Required=$true},
        @{Name="Linting"; Function={Test-Linting}; Required=$true},
        @{Name="Security"; Function={Test-Security}; Required=$true},
        @{Name="Tests"; Function={Test-UnitTests}; Required=$false},
        @{Name="Coverage"; Function={Test-Coverage}; Required=$false},
        @{Name="Build"; Function={Test-Build}; Required=$true},
        @{Name="Dependencies"; Function={Test-Dependencies}; Required=$false},
        @{Name="Documentation"; Function={Test-Documentation}; Required=$false}
    )
    
    foreach ($check in $checks) {
        $result = & $check.Function
        
        $script:results += @{
            Name = $check.Name
            Passed = $result
            Required = $check.Required
        }
        
        if ($FailFast -and -not $result -and $check.Required) {
            Write-Fail "Failed required check: $($check.Name)"
            break
        }
    }
    
    # Summary
    $duration = (Get-Date) - $startTime
    Write-Host "`n═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "           QUALITY GATE RESULTS         " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
    
    $passed = ($script:results | Where-Object { $_.Passed }).Count
    $total = $script:results.Count
    $requiredFailed = $script:results | Where-Object { $_.Required -and -not $_.Passed }
    
    Write-Host "`nChecks Passed: $passed/$total"
    Write-Host "Duration: $([math]::Round($duration.TotalSeconds, 2))s"
    
    if ($requiredFailed.Count -gt 0) {
        Write-Host "`n" -NoNewline
        Write-Fail "QUALITY GATE FAILED"
        Write-Host "`nRequired checks that failed:" -ForegroundColor Red
        $requiredFailed | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Red }
        exit 1
    } else {
        Write-Host "`n" -NoNewline
        Write-Pass "QUALITY GATE PASSED"
        
        if ($passed -lt $total) {
            Write-Warn "`nOptional checks failed: $($total - $passed)"
        }
        exit 0
    }
}

# Execute
try {
    Start-QualityGate
}
catch {
    Write-Fail "Quality gate error: $_"
    exit 1
}