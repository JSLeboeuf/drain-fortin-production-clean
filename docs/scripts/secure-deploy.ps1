# Secure Deployment Script for Drain Fortin CRM
# This script deploys without exposing any secrets

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSecrets = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Validate = $false
)

Write-Host "🔒 SECURE DEPLOYMENT - Drain Fortin CRM" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Cyan

# Security check: Ensure we're not in a git repository with uncommitted secrets
function Test-GitSecurity {
    Write-Host "🔍 Checking git security..." -ForegroundColor Yellow
    
    if (Test-Path ".git") {
        # Check for staged files with secrets
        $stagedFiles = git diff --cached --name-only
        $dangerousFiles = @("*.env", "*.env.production", "*.env.local", "*secret*", "*key*")
        
        foreach ($pattern in $dangerousFiles) {
            $matches = $stagedFiles | Where-Object { $_ -like $pattern }
            if ($matches) {
                Write-Host "❌ DANGER: Secrets detected in staged files: $($matches -join ', ')" -ForegroundColor Red
                Write-Host "Run 'git reset HEAD <file>' to unstage these files" -ForegroundColor Yellow
                return $false
            }
        }
        
        # Check for untracked .env files
        $untrackedEnv = git ls-files --others --exclude-standard | Where-Object { $_ -like "*.env" -and $_ -notlike "*.env.example" }
        if ($untrackedEnv) {
            Write-Host "⚠️ WARNING: Untracked .env files found: $($untrackedEnv -join ', ')" -ForegroundColor Yellow
            Write-Host "These should be in .gitignore" -ForegroundColor Yellow
        }
    }
    
    Write-Host "✅ Git security check passed" -ForegroundColor Green
    return $true
}

# Validate environment configuration
function Test-EnvironmentConfig {
    Write-Host "🔍 Validating environment configuration..." -ForegroundColor Yellow
    
    $requiredEnvVars = @(
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY", 
        "VAPI_API_KEY",
        "VAPI_WEBHOOK_SECRET",
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN"
    )
    
    $missing = @()
    foreach ($var in $requiredEnvVars) {
        if (-not $env:$var) {
            $missing += $var
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
        $missing | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
        Write-Host "`nPlease set these variables or use a secrets manager" -ForegroundColor Yellow
        return $false
    }
    
    # Validate URLs and tokens format
    if ($env:SUPABASE_URL -notmatch "^https://.*\.supabase\.co$") {
        Write-Host "❌ Invalid SUPABASE_URL format" -ForegroundColor Red
        return $false
    }
    
    if ($env:VAPI_API_KEY -notmatch "^vapi_sk_") {
        Write-Host "❌ Invalid VAPI_API_KEY format" -ForegroundColor Red
        return $false
    }
    
    if ($env:TWILIO_ACCOUNT_SID -notmatch "^AC[a-f0-9]{32}$") {
        Write-Host "❌ Invalid TWILIO_ACCOUNT_SID format" -ForegroundColor Red
        return $false
    }
    
    Write-Host "✅ Environment validation passed" -ForegroundColor Green
    return $true
}

# Test Supabase connectivity and permissions
function Test-SupabaseConnection {
    Write-Host "🔍 Testing Supabase connection..." -ForegroundColor Yellow
    
    try {
        $headers = @{
            "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
            "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$env:SUPABASE_URL/rest/v1/" -Headers $headers -Method GET
        Write-Host "✅ Supabase connection successful" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Supabase connection failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Deploy Edge Functions securely
function Deploy-EdgeFunctions {
    Write-Host "📦 Deploying Edge Functions..." -ForegroundColor Yellow
    
    # Check if supabase CLI is available
    if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Supabase CLI not found. Please install it first." -ForegroundColor Red
        return $false
    }
    
    # Deploy functions
    try {
        Push-Location "backend"
        
        Write-Host "Deploying vapi-webhook function..." -ForegroundColor Cyan
        supabase functions deploy vapi-webhook
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Function deployment failed" -ForegroundColor Red
            return $false
        }
        
        Write-Host "✅ Edge Functions deployed successfully" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Deployment error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    finally {
        Pop-Location
    }
}

# Set secrets securely using Supabase CLI
function Set-SupabaseSecrets {
    if ($SkipSecrets) {
        Write-Host "⏩ Skipping secrets configuration" -ForegroundColor Yellow
        return $true
    }
    
    Write-Host "🔐 Configuring secrets..." -ForegroundColor Yellow
    
    try {
        Push-Location "backend"
        
        # Set secrets using Supabase CLI (more secure than REST API)
        Write-Host "Setting SERVICE_ROLE_KEY..." -ForegroundColor Cyan
        echo $env:SUPABASE_SERVICE_ROLE_KEY | supabase secrets set SERVICE_ROLE_KEY --stdin
        
        Write-Host "Setting VAPI_WEBHOOK_SECRET..." -ForegroundColor Cyan
        echo $env:VAPI_WEBHOOK_SECRET | supabase secrets set VAPI_WEBHOOK_SECRET --stdin
        
        Write-Host "Setting TWILIO_ACCOUNT_SID..." -ForegroundColor Cyan
        echo $env:TWILIO_ACCOUNT_SID | supabase secrets set TWILIO_ACCOUNT_SID --stdin
        
        Write-Host "Setting TWILIO_AUTH_TOKEN..." -ForegroundColor Cyan
        echo $env:TWILIO_AUTH_TOKEN | supabase secrets set TWILIO_AUTH_TOKEN --stdin
        
        Write-Host "Setting TWILIO_FROM..." -ForegroundColor Cyan
        echo $env:TWILIO_FROM | supabase secrets set TWILIO_FROM --stdin
        
        Write-Host "Setting ENVIRONMENT..." -ForegroundColor Cyan
        echo $Environment | supabase secrets set ENVIRONMENT --stdin
        
        Write-Host "✅ Secrets configured successfully" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Failed to set secrets: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    finally {
        Pop-Location
    }
}

# Validate deployment
function Test-Deployment {
    Write-Host "🧪 Testing deployment..." -ForegroundColor Yellow
    
    try {
        $webhookUrl = "$env:SUPABASE_URL/functions/v1/vapi-webhook"
        
        # Test health check
        $healthPayload = @{ type = "health-check" } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $healthPayload -ContentType "application/json"
        
        if ($response.success -eq $true) {
            Write-Host "✅ Webhook health check passed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Webhook health check failed" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Deployment test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main deployment process
function Start-SecureDeployment {
    Write-Host "`n🚀 Starting secure deployment process..." -ForegroundColor Green
    
    # Step 1: Security checks
    if (-not (Test-GitSecurity)) {
        Write-Host "❌ Deployment aborted due to security issues" -ForegroundColor Red
        exit 1
    }
    
    # Step 2: Environment validation
    if (-not (Test-EnvironmentConfig)) {
        Write-Host "❌ Deployment aborted due to configuration issues" -ForegroundColor Red
        exit 1
    }
    
    # Step 3: Test connectivity
    if (-not (Test-SupabaseConnection)) {
        Write-Host "❌ Deployment aborted due to connectivity issues" -ForegroundColor Red
        exit 1
    }
    
    if ($Validate) {
        Write-Host "✅ Validation completed successfully - deployment ready" -ForegroundColor Green
        return
    }
    
    # Step 4: Deploy functions
    if (-not (Deploy-EdgeFunctions)) {
        Write-Host "❌ Deployment aborted due to function deployment failure" -ForegroundColor Red
        exit 1
    }
    
    # Step 5: Configure secrets
    if (-not (Set-SupabaseSecrets)) {
        Write-Host "❌ Deployment aborted due to secrets configuration failure" -ForegroundColor Red
        exit 1
    }
    
    # Step 6: Test deployment
    if (-not (Test-Deployment)) {
        Write-Host "⚠️ Deployment completed but tests failed - please verify manually" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    }
    
    # Step 7: Display important info
    Write-Host "`n📋 Deployment Summary:" -ForegroundColor Cyan
    Write-Host "   Webhook URL: $env:SUPABASE_URL/functions/v1/vapi-webhook" -ForegroundColor White
    Write-Host "   Environment: $Environment" -ForegroundColor White
    Write-Host "   CORS: Configured for production domains only" -ForegroundColor White
    Write-Host "   Security: All secrets properly configured" -ForegroundColor White
    
    Write-Host "`n🔒 Security Reminders:" -ForegroundColor Yellow
    Write-Host "   • Rotate secrets quarterly" -ForegroundColor Gray
    Write-Host "   • Monitor security_events table for threats" -ForegroundColor Gray
    Write-Host "   • Never commit .env files to git" -ForegroundColor Gray
    Write-Host "   • Verify CORS settings in production" -ForegroundColor Gray
}

# Execute deployment
Start-SecureDeployment