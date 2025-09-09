# Production Backup Script
# Creates a complete backup of the production deployment

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "backup_v1.0.1_$timestamp"
$backupPath = "..\backups\$backupName"

Write-Host "🔄 Creating production backup: $backupName" -ForegroundColor Cyan

# Create backup directory
New-Item -ItemType Directory -Force -Path $backupPath | Out-Null

# Backup source code
Write-Host "📦 Backing up source code..." -ForegroundColor Yellow
Copy-Item -Path "frontend\*" -Destination "$backupPath\frontend" -Recurse -Force
Copy-Item -Path "backend\*" -Destination "$backupPath\backend" -Recurse -Force

# Backup configuration
Write-Host "⚙️ Backing up configuration..." -ForegroundColor Yellow
Copy-Item -Path "*.json" -Destination "$backupPath\" -Force
Copy-Item -Path "*.md" -Destination "$backupPath\" -Force
Copy-Item -Path ".github" -Destination "$backupPath\.github" -Recurse -Force

# Create backup manifest
$manifest = @{
    version = "1.0.1"
    timestamp = $timestamp
    files = (Get-ChildItem -Path $backupPath -Recurse | Measure-Object).Count
    size = [math]::Round((Get-ChildItem -Path $backupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    git_commit = git rev-parse HEAD
    git_branch = git branch --show-current
}

$manifest | ConvertTo-Json | Out-File "$backupPath\manifest.json"

# Create compressed archive
Write-Host "🗜️ Creating compressed archive..." -ForegroundColor Yellow
Compress-Archive -Path "$backupPath\*" -DestinationPath "$backupPath.zip" -Force

# Clean up uncompressed backup
Remove-Item -Path $backupPath -Recurse -Force

Write-Host "✅ Backup completed: $backupName.zip" -ForegroundColor Green
Write-Host "📊 Backup size: $($manifest.size) MB" -ForegroundColor Cyan
Write-Host "📁 Files backed up: $($manifest.files)" -ForegroundColor Cyan