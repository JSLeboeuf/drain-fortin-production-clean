# ==========================================
# DRAIN FORTIN HEALTH CHECK SCRIPT
# Comprehensive System Health Monitoring
# ==========================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("production", "staging", "development")]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [switch]$Detailed,
    
    [Parameter(Mandatory=$false)]
    [switch]$Json,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFile
)

# Import configuration
$configPath = Join-Path $PSScriptRoot "..\config\.env.$Environment"
if (Test-Path $configPath) {
    Get-Content $configPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

# Health check results
$healthResults = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC"
    environment = $Environment
    overall_status = "healthy"
    services = @{}
    metrics = @{}
    alerts = @()
}

Write-Host "🏥 DRAIN FORTIN HEALTH CHECK" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Timestamp: $($healthResults.timestamp)" -ForegroundColor Gray
Write-Host "=" * 50

# ==========================================
# FRONTEND HEALTH CHECK
# ==========================================
function Test-Frontend {
    Write-Host "`n🎨 Checking Frontend..." -ForegroundColor Yellow
    
    $frontendUrl = if ($Environment -eq "production") { 
        "https://drainfortin.com" 
    } else { 
        "https://$Environment.drainfortin.com" 
    }
    
    $result = @{
        status = "unknown"
        response_time_ms = 0
        status_code = 0
        ssl_valid = $false
        errors = @()
    }
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $frontendUrl -Method GET -TimeoutSec 10 -UseBasicParsing
        $stopwatch.Stop()
        
        $result.status_code = $response.StatusCode
        $result.response_time_ms = $stopwatch.ElapsedMilliseconds
        $result.ssl_valid = $frontendUrl.StartsWith("https://")
        
        if ($response.StatusCode -eq 200) {
            $result.status = "healthy"
            Write-Host "✅ Frontend: OK ($($result.response_time_ms)ms)" -ForegroundColor Green
        } else {
            $result.status = "unhealthy"
            $result.errors += "HTTP $($response.StatusCode)"
            Write-Host "❌ Frontend: HTTP $($response.StatusCode)" -ForegroundColor Red
        }
    }
    catch {
        $result.status = "unhealthy"
        $result.errors += $_.Exception.Message
        Write-Host "❌ Frontend: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $result
}

# ==========================================
# SUPABASE BACKEND HEALTH CHECK
# ==========================================
function Test-Supabase {
    Write-Host "`n🗄️ Checking Supabase Backend..." -ForegroundColor Yellow
    
    $supabaseUrl = $env:SUPABASE_URL
    $result = @{
        status = "unknown"
        database_status = "unknown"
        functions_status = "unknown"
        response_time_ms = 0
        errors = @()
    }
    
    if (-not $supabaseUrl) {
        $result.status = "configuration_error"
        $result.errors += "SUPABASE_URL not configured"
        Write-Host "❌ Supabase: Configuration missing" -ForegroundColor Red
        return $result
    }
    
    try {
        # Test database connection
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $headers = @{
            "apikey" = $env:SUPABASE_ANON_KEY
            "Authorization" = "Bearer $($env:SUPABASE_ANON_KEY)"
        }
        
        $dbResponse = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/" -Headers $headers -Method GET -TimeoutSec 10
        
        if ($dbResponse.StatusCode -eq 200) {
            $result.database_status = "healthy"
        }
        
        # Test edge functions
        $functionUrl = "$supabaseUrl/functions/v1/vapi-webhook"
        $testPayload = @{ type = "health-check" } | ConvertTo-Json
        
        $funcResponse = Invoke-WebRequest -Uri $functionUrl -Method POST -Headers $headers -Body $testPayload -ContentType "application/json" -TimeoutSec 10
        
        $stopwatch.Stop()
        $result.response_time_ms = $stopwatch.ElapsedMilliseconds
        
        if ($funcResponse.StatusCode -eq 200) {
            $result.functions_status = "healthy"
            $result.status = "healthy"
            Write-Host "✅ Supabase: OK (DB: ✅, Functions: ✅, $($result.response_time_ms)ms)" -ForegroundColor Green
        } else {
            $result.functions_status = "unhealthy"
            $result.status = "degraded"
            $result.errors += "Functions: HTTP $($funcResponse.StatusCode)"
            Write-Host "⚠️ Supabase: Degraded (Functions error)" -ForegroundColor Yellow
        }
    }
    catch {
        $result.status = "unhealthy"
        $result.errors += $_.Exception.Message
        Write-Host "❌ Supabase: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $result
}

# ==========================================
# VAPI SERVICE HEALTH CHECK
# ==========================================
function Test-VAPI {
    Write-Host "`n📞 Checking VAPI Service..." -ForegroundColor Yellow
    
    $result = @{
        status = "unknown"
        api_status = "unknown"
        assistant_status = "unknown"
        phone_status = "unknown"
        response_time_ms = 0
        errors = @()
    }
    
    $vapiApiKey = $env:VAPI_API_KEY
    $assistantId = $env:VAPI_ASSISTANT_ID
    
    if (-not $vapiApiKey -or -not $assistantId) {
        $result.status = "configuration_error"
        $result.errors += "VAPI configuration missing"
        Write-Host "❌ VAPI: Configuration missing" -ForegroundColor Red
        return $result
    }
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $headers = @{
            "Authorization" = "Bearer $vapiApiKey"
            "Content-Type" = "application/json"
        }
        
        # Test VAPI API
        $apiResponse = Invoke-WebRequest -Uri "https://api.vapi.ai/assistant" -Headers $headers -Method GET -TimeoutSec 15
        
        if ($apiResponse.StatusCode -eq 200) {
            $result.api_status = "healthy"
        }
        
        # Test specific assistant
        $assistantResponse = Invoke-WebRequest -Uri "https://api.vapi.ai/assistant/$assistantId" -Headers $headers -Method GET -TimeoutSec 10
        
        $stopwatch.Stop()
        $result.response_time_ms = $stopwatch.ElapsedMilliseconds
        
        if ($assistantResponse.StatusCode -eq 200) {
            $assistantData = $assistantResponse.Content | ConvertFrom-Json
            $result.assistant_status = "healthy"
            $result.phone_status = if ($assistantData.phoneNumber) { "configured" } else { "not_configured" }
            
            $result.status = "healthy"
            Write-Host "✅ VAPI: OK (API: ✅, Assistant: ✅, Phone: $($result.phone_status), $($result.response_time_ms)ms)" -ForegroundColor Green
        }
    }
    catch {
        $result.status = "unhealthy"
        $result.errors += $_.Exception.Message
        Write-Host "❌ VAPI: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $result
}

# ==========================================
# TWILIO SERVICE HEALTH CHECK
# ==========================================
function Test-Twilio {
    Write-Host "`n📱 Checking Twilio Service..." -ForegroundColor Yellow
    
    $result = @{
        status = "unknown"
        account_status = "unknown"
        phone_status = "unknown"
        balance = "unknown"
        errors = @()
    }
    
    $accountSid = $env:TWILIO_ACCOUNT_SID
    $authToken = $env:TWILIO_AUTH_TOKEN
    
    if (-not $accountSid -or -not $authToken) {
        $result.status = "configuration_error"
        $result.errors += "Twilio configuration missing"
        Write-Host "❌ Twilio: Configuration missing" -ForegroundColor Red
        return $result
    }
    
    try {
        $credential = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("${accountSid}:${authToken}"))
        $headers = @{
            "Authorization" = "Basic $credential"
        }
        
        # Test account status
        $accountResponse = Invoke-WebRequest -Uri "https://api.twilio.com/2010-04-01/Accounts/$accountSid.json" -Headers $headers -Method GET -TimeoutSec 10
        
        if ($accountResponse.StatusCode -eq 200) {
            $accountData = $accountResponse.Content | ConvertFrom-Json
            $result.account_status = $accountData.status
            $result.balance = $accountData.balance
            
            # Test phone number
            $phoneResponse = Invoke-WebRequest -Uri "https://api.twilio.com/2010-04-01/Accounts/$accountSid/IncomingPhoneNumbers.json" -Headers $headers -Method GET -TimeoutSec 10
            
            if ($phoneResponse.StatusCode -eq 200) {
                $phoneData = $phoneResponse.Content | ConvertFrom-Json
                $result.phone_status = if ($phoneData.incoming_phone_numbers.Count -gt 0) { "configured" } else { "not_configured" }
                
                $result.status = "healthy"
                Write-Host "✅ Twilio: OK (Account: $($result.account_status), Balance: $($result.balance), Phone: $($result.phone_status))" -ForegroundColor Green
            }
        }
    }
    catch {
        $result.status = "unhealthy"
        $result.errors += $_.Exception.Message
        Write-Host "❌ Twilio: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $result
}

# ==========================================
# SSL CERTIFICATE CHECK
# ==========================================
function Test-SSL {
    Write-Host "`n🔒 Checking SSL Certificates..." -ForegroundColor Yellow
    
    $domains = @(
        "drainfortin.com",
        "www.drainfortin.com"
    )
    
    $sslResults = @{}
    
    foreach ($domain in $domains) {
        try {
            $request = [System.Net.WebRequest]::Create("https://$domain")
            $response = $request.GetResponse()
            $cert = $request.ServicePoint.Certificate
            
            $expiryDate = [DateTime]::Parse($cert.GetExpirationDateString())
            $daysUntilExpiry = ($expiryDate - (Get-Date)).Days
            
            $sslResults[$domain] = @{
                valid = $true
                expiry_date = $expiryDate.ToString("yyyy-MM-dd")
                days_until_expiry = $daysUntilExpiry
                issuer = $cert.Issuer
            }
            
            $status = if ($daysUntilExpiry -gt 30) { "✅" } elseif ($daysUntilExpiry -gt 7) { "⚠️" } else { "❌" }
            Write-Host "$status SSL $domain`: Expires in $daysUntilExpiry days" -ForegroundColor $(if ($daysUntilExpiry -gt 30) { "Green" } elseif ($daysUntilExpiry -gt 7) { "Yellow" } else { "Red" })
            
            $response.Close()
        }
        catch {
            $sslResults[$domain] = @{
                valid = $false
                error = $_.Exception.Message
            }
            Write-Host "❌ SSL $domain`: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    return $sslResults
}

# ==========================================
# PERFORMANCE METRICS
# ==========================================
function Get-PerformanceMetrics {
    if (-not $Detailed) { return @{} }
    
    Write-Host "`n📊 Gathering Performance Metrics..." -ForegroundColor Yellow
    
    $metrics = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC"
        frontend_lighthouse_score = "not_measured"
        database_query_time = "not_measured"
        cdn_cache_hit_ratio = "not_measured"
    }
    
    # Add Lighthouse performance test (would require actual implementation)
    Write-Host "📈 Performance metrics collection not implemented in this version" -ForegroundColor Gray
    
    return $metrics
}

# ==========================================
# EXECUTE ALL HEALTH CHECKS
# ==========================================

# Run all health checks
$healthResults.services.frontend = Test-Frontend
$healthResults.services.supabase = Test-Supabase
$healthResults.services.vapi = Test-VAPI
$healthResults.services.twilio = Test-Twilio
$healthResults.services.ssl = Test-SSL

if ($Detailed) {
    $healthResults.metrics = Get-PerformanceMetrics
}

# Determine overall status
$unhealthyServices = $healthResults.services.GetEnumerator() | Where-Object { 
    $_.Value -is [hashtable] -and $_.Value.status -eq "unhealthy" 
}

$degradedServices = $healthResults.services.GetEnumerator() | Where-Object { 
    $_.Value -is [hashtable] -and $_.Value.status -eq "degraded" 
}

if ($unhealthyServices.Count -gt 0) {
    $healthResults.overall_status = "unhealthy"
    $healthResults.alerts += "Critical: $($unhealthyServices.Count) services are unhealthy"
} elseif ($degradedServices.Count -gt 0) {
    $healthResults.overall_status = "degraded" 
    $healthResults.alerts += "Warning: $($degradedServices.Count) services are degraded"
}

# ==========================================
# OUTPUT RESULTS
# ==========================================
Write-Host "`n" + "=" * 50
Write-Host "🏥 HEALTH CHECK SUMMARY" -ForegroundColor Cyan

$statusColor = switch ($healthResults.overall_status) {
    "healthy" { "Green" }
    "degraded" { "Yellow" }
    "unhealthy" { "Red" }
    default { "Gray" }
}

Write-Host "Overall Status: $($healthResults.overall_status.ToUpper())" -ForegroundColor $statusColor

if ($healthResults.alerts.Count -gt 0) {
    Write-Host "`nAlerts:" -ForegroundColor Red
    foreach ($alert in $healthResults.alerts) {
        Write-Host "  ⚠️ $alert" -ForegroundColor Yellow
    }
}

if ($Json) {
    $jsonOutput = $healthResults | ConvertTo-Json -Depth 10
    
    if ($OutputFile) {
        $jsonOutput | Out-File -FilePath $OutputFile -Encoding UTF8
        Write-Host "`n💾 Results saved to: $OutputFile" -ForegroundColor Cyan
    } else {
        Write-Host "`n📋 JSON Output:" -ForegroundColor Cyan
        Write-Host $jsonOutput
    }
}

# Exit with appropriate code
$exitCode = switch ($healthResults.overall_status) {
    "healthy" { 0 }
    "degraded" { 1 }
    "unhealthy" { 2 }
    default { 3 }
}

Write-Host "`nHealth check completed with exit code: $exitCode" -ForegroundColor Gray
exit $exitCode