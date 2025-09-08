# Deploy Frontend to Supabase Storage for Static Hosting

Write-Host "🚀 Deploying Drain Fortin CRM to Supabase..." -ForegroundColor Green

# Configuration
$SUPABASE_URL = "https://phiduqxcufdmgjvdipyu.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTcwMjE4MSwiZXhwIjoyMDQxMjc4MTgxfQ.EEPp3Zr93E88K5q9Dh8iUe8dxJu7sJNJb7eXnW9lG1Q"
$BUCKET_NAME = "crm-frontend"

# Step 1: Build the frontend
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
Set-Location ".\frontend"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Create bucket if it doesn't exist
Write-Host "🪣 Setting up storage bucket..." -ForegroundColor Yellow

$headers = @{
    "apikey" = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type" = "application/json"
}

# Create bucket (will fail silently if exists)
$bucketBody = @{
    id = $BUCKET_NAME
    name = $BUCKET_NAME
    public = $true
    file_size_limit = 52428800
    allowed_mime_types = @("*/*")
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$SUPABASE_URL/storage/v1/bucket" -Method POST -Headers $headers -Body $bucketBody
    Write-Host "✅ Bucket created" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ Bucket already exists or created" -ForegroundColor Cyan
}

# Step 3: Upload files to Supabase Storage
Write-Host "📤 Uploading files to Supabase..." -ForegroundColor Yellow

$distPath = ".\dist"
$files = Get-ChildItem -Path $distPath -Recurse -File

foreach ($file in $files) {
    $relativePath = $file.FullName.Replace("$PWD\dist\", "").Replace("\", "/")
    
    # Determine content type
    $contentType = switch ($file.Extension) {
        ".html" { "text/html" }
        ".js" { "application/javascript" }
        ".css" { "text/css" }
        ".json" { "application/json" }
        ".svg" { "image/svg+xml" }
        ".png" { "image/png" }
        ".jpg" { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        default { "application/octet-stream" }
    }
    
    $uploadHeaders = @{
        "apikey" = $SUPABASE_KEY
        "Authorization" = "Bearer $SUPABASE_KEY"
        "Content-Type" = $contentType
        "x-upsert" = "true"
    }
    
    try {
        $fileContent = [System.IO.File]::ReadAllBytes($file.FullName)
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/storage/v1/object/$BUCKET_NAME/$relativePath" -Method POST -Headers $uploadHeaders -Body $fileContent
        Write-Host "  ✓ Uploaded: $relativePath" -ForegroundColor Gray
    } catch {
        Write-Host "  ✗ Failed: $relativePath - $_" -ForegroundColor Red
    }
}

# Step 4: Setup redirect rules for SPA
Write-Host "🔧 Configuring SPA routing..." -ForegroundColor Yellow

# Create a _redirects file for client-side routing
$redirectContent = "/*    /index.html   200"
$redirectHeaders = @{
    "apikey" = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type" = "text/plain"
    "x-upsert" = "true"
}

try {
    Invoke-RestMethod -Uri "$SUPABASE_URL/storage/v1/object/$BUCKET_NAME/_redirects" -Method POST -Headers $redirectHeaders -Body $redirectContent
    Write-Host "✅ SPA routing configured" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Could not configure SPA routing" -ForegroundColor Yellow
}

# Step 5: Display access URL
Write-Host "`n✨ Deployment Complete!" -ForegroundColor Green
Write-Host "📍 Your app is available at:" -ForegroundColor Cyan
Write-Host "   $SUPABASE_URL/storage/v1/object/public/$BUCKET_NAME/index.html" -ForegroundColor White
Write-Host "`n🎯 CRM Dashboard:" -ForegroundColor Cyan
Write-Host "   $SUPABASE_URL/storage/v1/object/public/$BUCKET_NAME/index.html#/crm" -ForegroundColor White

Set-Location ..

Write-Host "`n✅ Done!" -ForegroundColor Green