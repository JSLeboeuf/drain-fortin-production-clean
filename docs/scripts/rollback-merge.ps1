# PowerShell Rollback Script - Drain Fortin
# Safely rollback merge operations
# Author: Claude Code
# Date: 2025-09-08

param(
    [string]$BackupPath = "",
    [string]$CommitHash = "",
    [int]$RevertLast = 0,
    [switch]$ListBackups = $false,
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

# List available backups
function Get-Backups {
    Write-Info "Available backups:"
    
    if (-not (Test-Path "backups")) {
        Write-Warning "No backups directory found"
        return
    }
    
    $backups = Get-ChildItem -Path "backups" -Directory | Sort-Object Name -Descending
    
    if ($backups.Count -eq 0) {
        Write-Warning "No backups found"
        return
    }
    
    foreach ($backup in $backups) {
        $branches = ""
        $stashed = ""
        
        if (Test-Path "$($backup.FullName)\branches.txt") {
            $branchCount = (Get-Content "$($backup.FullName)\branches.txt" | Measure-Object -Line).Lines
            $branches = "$branchCount branches"
        }
        
        if (Test-Path "$($backup.FullName)\stash_created.flag") {
            $stashed = "[STASH]"
        }
        
        Write-Host "  $($backup.Name) - $branches $stashed"
    }
}

# Restore from backup
function Restore-FromBackup {
    param([string]$Path)
    
    if (-not $Path) {
        # Use latest backup
        $latest = Get-ChildItem -Path "backups" -Directory | 
                  Sort-Object Name -Descending | 
                  Select-Object -First 1
        
        if (-not $latest) {
            throw "No backups found"
        }
        
        $Path = $latest.FullName
        Write-Warning "Using latest backup: $($latest.Name)"
    }
    
    if (-not (Test-Path $Path)) {
        throw "Backup path not found: $Path"
    }
    
    if (-not (Test-Path "$Path\git-backup")) {
        throw "Invalid backup: missing git-backup directory"
    }
    
    Write-Warning "This will restore from backup: $(Split-Path $Path -Leaf)"
    
    if (-not $Force) {
        $confirm = Read-Host "Are you sure? (yes/no)"
        if ($confirm -ne "yes") {
            Write-Info "Rollback cancelled"
            return
        }
    }
    
    Write-Info "Restoring from backup..."
    
    # Clean current state
    git reset --hard
    git clean -fd
    
    # Restore .git directory
    Write-Info "Restoring git directory..."
    Remove-Item -Path ".git" -Recurse -Force
    Copy-Item -Path "$Path\git-backup" -Destination ".git" -Recurse
    
    # Reset to HEAD
    git reset --hard
    
    # Restore stash if it was created
    if (Test-Path "$Path\stash_created.flag") {
        Write-Info "Restoring stashed changes..."
        git stash pop
    }
    
    Write-Success "Successfully restored from backup!"
    
    # Show current state
    git status
    git log --oneline -5
}

# Reset to specific commit
function Reset-ToCommit {
    param([string]$Hash)
    
    if (-not $Hash) {
        # Show recent commits
        Write-Info "Recent commits:"
        git log --oneline -10
        
        $Hash = Read-Host "`nEnter commit hash to reset to"
    }
    
    # Validate commit exists
    $commitExists = git cat-file -t $Hash 2>$null
    if (-not $commitExists) {
        throw "Invalid commit hash: $Hash"
    }
    
    # Show what will be lost
    Write-Warning "Commits that will be lost:"
    git log --oneline $Hash..HEAD
    
    if (-not $Force) {
        $confirm = Read-Host "`nProceed with reset? (yes/no)"
        if ($confirm -ne "yes") {
            Write-Info "Reset cancelled"
            return
        }
    }
    
    Write-Info "Resetting to commit $Hash..."
    
    # Stash current changes if any
    $stashOutput = git stash save "Backup before reset $(Get-Date)"
    if ($stashOutput -notmatch "No local changes") {
        Write-Info "Changes stashed"
    }
    
    # Perform reset
    git reset --hard $Hash
    git clean -fd
    
    Write-Success "Successfully reset to $Hash!"
    git log --oneline -5
}

# Revert recent merges
function Revert-Merges {
    param([int]$Count = 1)
    
    if ($Count -le 0) {
        Write-Info "How many merge commits to revert?"
        git log --merges --oneline -10
        $Count = [int](Read-Host "`nNumber of merges to revert")
    }
    
    # Get merge commits
    $merges = git log --merges --format="%H %s" -$Count
    
    if (-not $merges) {
        Write-Warning "No merge commits found"
        return
    }
    
    Write-Warning "Will revert these merges:"
    foreach ($merge in $merges) {
        Write-Host "  $merge"
    }
    
    if (-not $Force) {
        $confirm = Read-Host "`nProceed? (yes/no)"
        if ($confirm -ne "yes") {
            Write-Info "Revert cancelled"
            return
        }
    }
    
    # Revert each merge
    $hashes = $merges | ForEach-Object { $_.Split(' ')[0] }
    
    foreach ($hash in $hashes) {
        Write-Info "Reverting merge: $hash"
        
        try {
            git revert -m 1 $hash --no-edit
            Write-Success "Reverted: $hash"
        }
        catch {
            Write-Error "Failed to revert $hash"
            Write-Warning "You may need to resolve conflicts manually"
            return
        }
    }
    
    Write-Success "Successfully reverted $Count merge(s)!"
    git log --oneline -5
}

# Show current state
function Show-CurrentState {
    Write-Info "=== Current Repository State ==="
    
    Write-Host "`nBranch:"
    git branch --show-current
    
    Write-Host "`nRecent commits:"
    git log --oneline -5
    
    Write-Host "`nRecent merges:"
    git log --merges --oneline -5
    
    Write-Host "`nStatus:"
    git status --short
}

# Main menu
function Show-Menu {
    Write-Host "`n=== Git Rollback Utility ===" -ForegroundColor Cyan
    Write-Host "1. Restore from backup"
    Write-Host "2. Reset to specific commit"
    Write-Host "3. Revert recent merges"
    Write-Host "4. List available backups"
    Write-Host "5. Show current state"
    Write-Host "6. Exit"
    
    $choice = Read-Host "`nSelect option"
    
    switch ($choice) {
        "1" { 
            Get-Backups
            $path = Read-Host "`nBackup path (or press Enter for latest)"
            Restore-FromBackup -Path $path
        }
        "2" { 
            Reset-ToCommit
        }
        "3" { 
            $count = [int](Read-Host "Number of merges to revert")
            Revert-Merges -Count $count
        }
        "4" { 
            Get-Backups
            Show-Menu
        }
        "5" { 
            Show-CurrentState
            Show-Menu
        }
        "6" { 
            Write-Info "Exiting..."
            return
        }
        default { 
            Write-Warning "Invalid option"
            Show-Menu
        }
    }
}

# Main execution
Write-Host "Git Rollback Utility - Drain Fortin" -ForegroundColor Cyan

# Parameter-based execution
if ($ListBackups) {
    Get-Backups
}
elseif ($BackupPath) {
    Restore-FromBackup -Path $BackupPath
}
elseif ($CommitHash) {
    Reset-ToCommit -Hash $CommitHash
}
elseif ($RevertLast -gt 0) {
    Revert-Merges -Count $RevertLast
}
else {
    # Interactive menu
    Show-CurrentState
    Show-Menu
}

Write-Success "`n✅ Rollback utility completed"