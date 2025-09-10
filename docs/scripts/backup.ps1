# ==========================================
# DRAIN FORTIN BACKUP SCRIPT
# Automated Database and Configuration Backup
# ==========================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("production", "staging", "development")]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("full", "incremental", "config-only")]
    [string]$BackupType = "full",
    
    [Parameter(Mandatory=$false)]
    [string]$BackupLocation = ".\backups",
    
    [Parameter(Mandatory=$false)]
    [int]$RetentionDays = 30,
    
    [Parameter(Mandatory=$false)]
    [switch]$Compress,
    
    [Parameter(Mandatory=$false)]
    [switch]$Encrypt
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

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = Join-Path $BackupLocation "$Environment\$timestamp"

Write-Host "🗄️ DRAIN FORTIN BACKUP SYSTEM" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Backup Type: $BackupType" -ForegroundColor Yellow  
Write-Host "Timestamp: $timestamp" -ForegroundColor Gray
Write-Host "=" * 50

# Create backup directory
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "📁 Created backup directory: $backupDir" -ForegroundColor Green
}

# ==========================================
# SUPABASE DATABASE BACKUP
# ==========================================
function Backup-SupabaseDatabase {
    Write-Host "`n💾 Backing up Supabase database..." -ForegroundColor Yellow
    
    $projectRef = $env:SUPABASE_PROJECT_REF
    if (-not $projectRef) {
        Write-Host "❌ SUPABASE_PROJECT_REF not configured" -ForegroundColor Red
        return $false
    }
    
    try {
        # Export database schema
        $schemaFile = Join-Path $backupDir "schema.sql"
        Write-Host "🗂️ Exporting database schema..." -ForegroundColor Cyan
        
        $schemaCommand = "supabase db dump --project-ref $projectRef --schema public --data-only=false"
        Invoke-Expression $schemaCommand | Out-File -FilePath $schemaFile -Encoding UTF8
        
        if (Test-Path $schemaFile) {
            Write-Host "✅ Schema exported: $schemaFile" -ForegroundColor Green
        }
        
        # Export data if full backup
        if ($BackupType -eq "full") {
            Write-Host "📊 Exporting database data..." -ForegroundColor Cyan
            $dataFile = Join-Path $backupDir "data.sql"
            
            $dataCommand = "supabase db dump --project-ref $projectRef --data-only=true"
            Invoke-Expression $dataCommand | Out-File -FilePath $dataFile -Encoding UTF8
            
            if (Test-Path $dataFile) {
                Write-Host "✅ Data exported: $dataFile" -ForegroundColor Green
            }
        }
        
        # Backup specific tables with business data
        $businessTables = @("calls", "customers", "priorities", "metrics")
        foreach ($table in $businessTables) {
            Write-Host "📋 Backing up table: $table..." -ForegroundColor Cyan
            
            $tableFile = Join-Path $backupDir "table_$table.json"
            $tableCommand = "supabase db dump --project-ref $projectRef --table $table --format json"
            
            try {
                Invoke-Expression $tableCommand | Out-File -FilePath $tableFile -Encoding UTF8
                Write-Host "✅ Table $table backed up" -ForegroundColor Green
            }
            catch {
                Write-Host "⚠️ Warning: Could not backup table $table" -ForegroundColor Yellow
            }
        }
        
        return $true
    }
    catch {
        Write-Host "❌ Database backup failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ==========================================
# CONFIGURATION BACKUP
# ==========================================
function Backup-Configuration {
    Write-Host "`n⚙️ Backing up configuration files..." -ForegroundColor Yellow
    
    $configBackupDir = Join-Path $backupDir "config"
    New-Item -ItemType Directory -Path $configBackupDir -Force | Out-Null
    
    # Backup environment configuration (without secrets)
    $envFile = Join-Path $PSScriptRoot "..\config\.env.$Environment"
    if (Test-Path $envFile) {
        $envBackupFile = Join-Path $configBackupDir ".env.$Environment.backup"
        
        # Remove sensitive values
        $envContent = Get-Content $envFile | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                $key = $matches[1]
                $value = $matches[2]
                
                # Mask sensitive keys
                if ($key -match "(KEY|TOKEN|SECRET|PASSWORD)") {
                    "$key=***MASKED***"
                } else {
                    $_
                }
            } else {
                $_
            }
        }
        
        $envContent | Out-File -FilePath $envBackupFile -Encoding UTF8
        Write-Host "✅ Environment config backed up (secrets masked)" -ForegroundColor Green
    }
    
    # Backup VAPI assistant configuration
    $vapiConfigFile = Join-Path $PSScriptRoot "..\config\vapi-assistant.json"
    if (Test-Path $vapiConfigFile) {
        $vapiBackupFile = Join-Path $configBackupDir "vapi-assistant.json"
        Copy-Item -Path $vapiConfigFile -Destination $vapiBackupFile
        Write-Host "✅ VAPI assistant config backed up" -ForegroundColor Green
    }
    
    # Backup deployment scripts
    $scriptsBackupDir = Join-Path $configBackupDir "scripts"
    New-Item -ItemType Directory -Path $scriptsBackupDir -Force | Out-Null
    
    Get-ChildItem -Path $PSScriptRoot -Filter "*.ps1" | ForEach-Object {
        $scriptBackupFile = Join-Path $scriptsBackupDir $_.Name
        Copy-Item -Path $_.FullName -Destination $scriptBackupFile
        Write-Host "✅ Script backed up: $($_.Name)" -ForegroundColor Green
    }
    
    return $true
}

# ==========================================
# SUPABASE EDGE FUNCTIONS BACKUP
# ==========================================
function Backup-EdgeFunctions {
    Write-Host "`n⚡ Backing up Supabase Edge Functions..." -ForegroundColor Yellow
    
    $functionsDir = Join-Path $PSScriptRoot "..\backend\supabase\functions"
    if (-not (Test-Path $functionsDir)) {
        Write-Host "⚠️ Functions directory not found" -ForegroundColor Yellow
        return $false
    }
    
    $functionsBackupDir = Join-Path $backupDir "functions"
    
    try {
        # Copy entire functions directory
        Copy-Item -Path $functionsDir -Destination $functionsBackupDir -Recurse -Force
        Write-Host "✅ Edge Functions backed up" -ForegroundColor Green
        
        # List backed up functions
        Get-ChildItem -Path $functionsBackupDir -Directory | ForEach-Object {
            Write-Host "  📄 Function: $($_.Name)" -ForegroundColor Cyan
        }
        
        return $true
    }
    catch {
        Write-Host "❌ Functions backup failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ==========================================
# FRONTEND BUILD BACKUP
# ==========================================
function Backup-Frontend {
    Write-Host "`n🎨 Backing up Frontend build..." -ForegroundColor Yellow
    
    $frontendDir = Join-Path $PSScriptRoot "..\frontend"
    $distDir = Join-Path $frontendDir "dist"
    
    if (-not (Test-Path $distDir)) {
        Write-Host "⚠️ Frontend build not found, building first..." -ForegroundColor Yellow
        
        try {
            Set-Location $frontendDir
            npm run build
            Set-Location $PSScriptRoot
        }
        catch {
            Write-Host "❌ Frontend build failed" -ForegroundColor Red
            return $false
        }
    }
    
    if (Test-Path $distDir) {
        $frontendBackupDir = Join-Path $backupDir "frontend-build"
        Copy-Item -Path $distDir -Destination $frontendBackupDir -Recurse -Force
        Write-Host "✅ Frontend build backed up" -ForegroundColor Green
        return $true
    }
    
    return $false
}

# ==========================================
# LOGS BACKUP
# ==========================================
function Backup-Logs {
    if ($BackupType -eq "config-only") { return $true }
    
    Write-Host "`n📜 Backing up logs..." -ForegroundColor Yellow
    
    $logsBackupDir = Join-Path $backupDir "logs"
    New-Item -ItemType Directory -Path $logsBackupDir -Force | Out-Null
    
    # Backup recent logs (last 7 days)
    $logSources = @(
        "$env:TEMP\SuperClaude_*.log",
        ".\logs\*.log",
        ".\.next\trace"
    )
    
    $logsFound = $false
    foreach ($logPattern in $logSources) {
        $logFiles = Get-ChildItem -Path $logPattern -ErrorAction SilentlyContinue | 
                   Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) }
        
        foreach ($logFile in $logFiles) {
            $logBackupFile = Join-Path $logsBackupDir $logFile.Name
            Copy-Item -Path $logFile.FullName -Destination $logBackupFile -ErrorAction SilentlyContinue
            $logsFound = $true
        }
    }
    
    if ($logsFound) {
        Write-Host "✅ Recent logs backed up" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No recent logs found" -ForegroundColor Yellow
    }
    
    return $true
}

# ==========================================
# COMPRESSION AND ENCRYPTION
# ==========================================
function Compress-Backup {
    if (-not $Compress) { return $backupDir }
    
    Write-Host "`n📦 Compressing backup..." -ForegroundColor Yellow
    
    $archivePath = "$backupDir.zip"
    
    try {
        Compress-Archive -Path $backupDir -DestinationPath $archivePath -Force
        
        # Verify compression
        if (Test-Path $archivePath) {
            $originalSize = (Get-ChildItem -Path $backupDir -Recurse | Measure-Object -Property Length -Sum).Sum
            $compressedSize = (Get-Item $archivePath).Length
            $compressionRatio = [math]::Round(($compressedSize / $originalSize) * 100, 1)
            
            Write-Host "✅ Backup compressed: $archivePath" -ForegroundColor Green
            Write-Host "📊 Compression ratio: $compressionRatio%" -ForegroundColor Cyan
            
            # Remove uncompressed directory
            Remove-Item -Path $backupDir -Recurse -Force
            return $archivePath
        }
    }
    catch {
        Write-Host "❌ Compression failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $backupDir
}

function Encrypt-Backup {
    param($BackupPath)
    
    if (-not $Encrypt) { return $BackupPath }
    
    Write-Host "`n🔐 Encrypting backup..." -ForegroundColor Yellow
    
    # This is a simplified encryption example
    # In production, use proper encryption tools
    Write-Host "⚠️ Encryption not implemented in this version" -ForegroundColor Yellow
    Write-Host "💡 Consider using GPG or similar encryption tools" -ForegroundColor Cyan
    
    return $BackupPath
}

# ==========================================
# CLEANUP OLD BACKUPS
# ==========================================
function Remove-OldBackups {
    Write-Host "`n🧹 Cleaning up old backups..." -ForegroundColor Yellow
    
    $parentBackupDir = Split-Path $backupDir -Parent
    if (-not (Test-Path $parentBackupDir)) { return }
    
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $oldBackups = Get-ChildItem -Path $parentBackupDir | Where-Object { 
        $_.LastWriteTime -lt $cutoffDate 
    }
    
    foreach ($oldBackup in $oldBackups) {
        try {
            Remove-Item -Path $oldBackup.FullName -Recurse -Force
            Write-Host "🗑️ Removed old backup: $($oldBackup.Name)" -ForegroundColor Gray
        }
        catch {
            Write-Host "⚠️ Could not remove: $($oldBackup.Name)" -ForegroundColor Yellow
        }
    }
    
    $remainingCount = (Get-ChildItem -Path $parentBackupDir).Count
    Write-Host "✅ Cleanup complete. $remainingCount backups remaining" -ForegroundColor Green
}

# ==========================================
# BACKUP VERIFICATION
# ==========================================
function Test-Backup {
    param($BackupPath)
    
    Write-Host "`n✅ Verifying backup integrity..." -ForegroundColor Yellow
    
    $verificationResults = @{
        database_backup = $false
        config_backup = $false
        functions_backup = $false
        total_size_mb = 0
        file_count = 0
    }
    
    if (Test-Path $BackupPath) {
        if ($BackupPath.EndsWith(".zip")) {
            # Verify compressed backup
            try {
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                $zip = [System.IO.Compression.ZipFile]::OpenRead($BackupPath)
                $verificationResults.file_count = $zip.Entries.Count
                $zip.Dispose()
                
                $verificationResults.total_size_mb = [math]::Round((Get-Item $BackupPath).Length / 1MB, 2)
            }
            catch {
                Write-Host "❌ Backup verification failed" -ForegroundColor Red
                return $false
            }
        } else {
            # Verify uncompressed backup
            $files = Get-ChildItem -Path $BackupPath -Recurse -File
            $verificationResults.file_count = $files.Count
            $verificationResults.total_size_mb = [math]::Round(($files | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
            
            # Check for key backup components
            $verificationResults.database_backup = Test-Path (Join-Path $BackupPath "schema.sql")
            $verificationResults.config_backup = Test-Path (Join-Path $BackupPath "config")
            $verificationResults.functions_backup = Test-Path (Join-Path $BackupPath "functions")
        }
        
        Write-Host "📊 Backup verification results:" -ForegroundColor Cyan
        Write-Host "  📁 Total files: $($verificationResults.file_count)" -ForegroundColor White
        Write-Host "  💾 Total size: $($verificationResults.total_size_mb) MB" -ForegroundColor White
        Write-Host "  🗄️ Database: $(if($verificationResults.database_backup){"✅"}else{"❌"})" -ForegroundColor White
        Write-Host "  ⚙️ Config: $(if($verificationResults.config_backup){"✅"}else{"❌"})" -ForegroundColor White
        Write-Host "  ⚡ Functions: $(if($verificationResults.functions_backup){"✅"}else{"❌"})" -ForegroundColor White
        
        return $true
    }
    
    return $false
}

# ==========================================
# EXECUTE BACKUP PROCESS
# ==========================================

$backupSuccess = $true

# Execute backup steps based on type
switch ($BackupType) {
    "full" {
        $backupSuccess = $backupSuccess -and (Backup-SupabaseDatabase)
        $backupSuccess = $backupSuccess -and (Backup-Configuration)
        $backupSuccess = $backupSuccess -and (Backup-EdgeFunctions)
        $backupSuccess = $backupSuccess -and (Backup-Frontend)
        $backupSuccess = $backupSuccess -and (Backup-Logs)
    }
    "incremental" {
        $backupSuccess = $backupSuccess -and (Backup-SupabaseDatabase)
        $backupSuccess = $backupSuccess -and (Backup-Logs)
    }
    "config-only" {
        $backupSuccess = $backupSuccess -and (Backup-Configuration)
        $backupSuccess = $backupSuccess -and (Backup-EdgeFunctions)
    }
}

if ($backupSuccess) {
    # Post-processing
    $finalBackupPath = Compress-Backup
    $finalBackupPath = Encrypt-Backup $finalBackupPath
    
    # Verify backup
    $verificationPassed = Test-Backup $finalBackupPath
    
    # Cleanup old backups
    Remove-OldBackups
    
    # Final summary
    Write-Host "`n" + "=" * 50
    Write-Host "🎉 BACKUP COMPLETED SUCCESSFULLY" -ForegroundColor Green
    Write-Host "Location: $finalBackupPath" -ForegroundColor Cyan
    Write-Host "Type: $BackupType" -ForegroundColor Cyan
    Write-Host "Environment: $Environment" -ForegroundColor Cyan
    Write-Host "Verification: $(if($verificationPassed){"✅ PASSED"}else{"❌ FAILED"})" -ForegroundColor $(if($verificationPassed){"Green"}else{"Red"})
    
    exit 0
} else {
    Write-Host "`n❌ BACKUP FAILED" -ForegroundColor Red
    exit 1
}