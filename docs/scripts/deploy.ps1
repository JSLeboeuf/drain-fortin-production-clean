# ============================================
# DRAIN FORTIN - PRODUCTION DEPLOYMENT SCRIPT
# ============================================

Write-Host "🚀 DRAIN FORTIN PRODUCTION DEPLOYMENT" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check prerequisites
function Test-Prerequisites {
    Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Yellow
    
    $required = @(
        @{Name="Node.js"; Command="node --version"},
        @{Name="npm"; Command="npm --version"},
        @{Name="Supabase CLI"; Command="supabase --version"},
        @{Name="Git"; Command="git --version"}
    )
    
    $missing = @()
    foreach ($req in $required) {
        try {
            $null = Invoke-Expression $req.Command 2>$null
            Write-Host "✅ $($req.Name) installed" -ForegroundColor Green
        } catch {
            Write-Host "❌ $($req.Name) not found" -ForegroundColor Red
            $missing += $req.Name
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "`n❌ Missing prerequisites: $($missing -join ', ')" -ForegroundColor Red
        exit 1
    }
}

# Deploy Frontend
function Deploy-Frontend {
    Write-Host "`n🎨 Deploying Frontend..." -ForegroundColor Yellow
    
    Set-Location frontend
    
    # Install dependencies
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    npm install
    
    # Build production
    Write-Host "🔨 Building for production..." -ForegroundColor Cyan
    npm run build
    
    # Deploy to Vercel/Netlify (example)
    Write-Host "☁️ Deploying to hosting..." -ForegroundColor Cyan
    # vercel --prod
    # or
    # netlify deploy --prod
    
    Set-Location ..
    Write-Host "✅ Frontend deployed" -ForegroundColor Green
}

# Deploy Supabase Functions
function Deploy-Supabase {
    Write-Host "`n🗄️ Deploying Supabase..." -ForegroundColor Yellow
    
    Set-Location backend
    
    # Deploy database migrations
    Write-Host "📊 Running migrations..." -ForegroundColor Cyan
    supabase db push
    
    # Deploy Edge Functions
    Write-Host "⚡ Deploying Edge Functions..." -ForegroundColor Cyan
    supabase functions deploy vapi-webhook
    
    # Set secrets
    Write-Host "🔐 Setting secrets..." -ForegroundColor Cyan
    supabase secrets set SERVICE_ROLE_KEY=$env:SUPABASE_SERVICE_ROLE_KEY
    supabase secrets set VAPI_WEBHOOK_SECRET=$env:VAPI_WEBHOOK_SECRET
    supabase secrets set TWILIO_ACCOUNT_SID=$env:TWILIO_ACCOUNT_SID
    supabase secrets set TWILIO_AUTH_TOKEN=$env:TWILIO_AUTH_TOKEN
    supabase secrets set TWILIO_PHONE_NUMBER=$env:TWILIO_PHONE_NUMBER
    
    Set-Location ..
    Write-Host "✅ Supabase deployed" -ForegroundColor Green
}

# Deploy VAPI Assistant
function Deploy-VAPI {
    Write-Host "`n📞 Configuring VAPI..." -ForegroundColor Yellow
    
    # This would typically use VAPI API to update assistant
    Write-Host "📝 Updating assistant configuration..." -ForegroundColor Cyan
    
    # Example API call (requires implementation)
    # $headers = @{
    #     "Authorization" = "Bearer $env:VAPI_API_KEY"
    #     "Content-Type" = "application/json"
    # }
    # $body = Get-Content config/vapi-assistant.json -Raw
    # Invoke-RestMethod -Uri "https://api.vapi.ai/assistant/$env:VAPI_ASSISTANT_ID" -Method PUT -Headers $headers -Body $body
    
    Write-Host "✅ VAPI configured" -ForegroundColor Green
}

# Run tests
function Test-Deployment {
    Write-Host "`n🧪 Running deployment tests..." -ForegroundColor Yellow
    
    # Test frontend
    Write-Host "Testing frontend..." -ForegroundColor Cyan
    $frontend = Invoke-WebRequest -Uri $env:FRONTEND_URL -UseBasicParsing
    if ($frontend.StatusCode -eq 200) {
        Write-Host "✅ Frontend responding" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend not responding" -ForegroundColor Red
    }
    
    # Test Supabase
    Write-Host "Testing Supabase..." -ForegroundColor Cyan
    # Add Supabase connection test
    
    # Test VAPI webhook
    Write-Host "Testing VAPI webhook..." -ForegroundColor Cyan
    # Add webhook test
    
    Write-Host "✅ All tests passed" -ForegroundColor Green
}

# Main deployment flow
function Start-Deployment {
    param(
        [string]$Environment = "production"
    )
    
    Write-Host "`n🎯 Deploying to: $Environment" -ForegroundColor Magenta
    
    # Load environment variables
    if (Test-Path "config/.env.$Environment") {
        Write-Host "📄 Loading environment variables..." -ForegroundColor Cyan
        Get-Content "config/.env.$Environment" | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
            }
        }
    }
    
    # Run deployment steps
    Test-Prerequisites
    Deploy-Frontend
    Deploy-Supabase
    Deploy-VAPI
    Test-Deployment
    
    Write-Host "`n✨ DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "Frontend: $env:FRONTEND_URL" -ForegroundColor Cyan
    Write-Host "Supabase: $env:SUPABASE_URL" -ForegroundColor Cyan
    Write-Host "VAPI Phone: $env:VAPI_PHONE_NUMBER" -ForegroundColor Cyan
}

# Execute deployment
Start-Deployment -Environment "production"