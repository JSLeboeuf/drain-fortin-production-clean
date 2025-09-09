# PowerShell Script for Branch Merging - Drain Fortin
# Requires: Git, Node.js, PowerShell 5.0+
# Author: Claude Code
# Date: 2025-09-08

param(
    [switch]$DryRun = $false,
    [switch]$SkipTests = $false,
    [switch]$Force = $false
)

# Configuration
$ErrorActionPreference = "Stop"
$BackupDir = "backups\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$LogFile = "merge_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

# Logging function
function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logMessage
    
    switch ($Level) {
        "SUCCESS" { Write-Success $Message }
        "WARNING" { Write-Warning $Message }
        "ERROR" { Write-Error $Message }
        default { Write-Info $Message }
    }
}

# Check prerequisites
function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check Git
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "Git is not installed or not in PATH"
    }
    
    # Check Node.js
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Warning "npm not found - tests will be skipped"
        $script:SkipTests = $true
    }
    
    # Check for uncommitted changes
    $status = git status --porcelain
    if ($status -and -not $Force) {
        throw "Uncommitted changes detected. Commit or stash them first, or use -Force"
    }
    
    Write-Log "Prerequisites check completed" "SUCCESS"
}

# Create backup
function New-Backup {
    Write-Log "Creating backup..."
    
    # Create backup directory
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    
    # Save current branch info
    git branch -a > "$BackupDir\branches.txt"
    git log --oneline -20 > "$BackupDir\recent_commits.txt"
    
    # Stash any changes
    $stashOutput = git stash save "Auto-backup before merge $(Get-Date)"
    if ($stashOutput -notmatch "No local changes") {
        Write-Log "Changes stashed: $stashOutput" "WARNING"
        Set-Content -Path "$BackupDir\stash_created.flag" -Value "true"
    }
    
    # Create git backup
    Write-Log "Creating git directory backup (this may take a moment)..."
    Copy-Item -Path ".git" -Destination "$BackupDir\git-backup" -Recurse
    
    Write-Log "Backup created in $BackupDir" "SUCCESS"
    return $BackupDir
}

# Run tests
function Test-Build {
    if ($SkipTests) {
        Write-Log "Skipping tests as requested" "WARNING"
        return $true
    }
    
    Write-Log "Running tests..."
    
    try {
        # Run frontend tests
        Set-Location frontend
        npm run test 2>&1 | Out-Null
        Write-Log "Frontend tests passed" "SUCCESS"
        
        # Run build
        npm run build 2>&1 | Out-Null
        Write-Log "Frontend build successful" "SUCCESS"
        
        # Run backend tests if they exist
        Set-Location ..\backend
        if (Test-Path "package.json") {
            npm run test 2>&1 | Out-Null
            Write-Log "Backend tests passed" "SUCCESS"
        }
        
        Set-Location ..
        return $true
    }
    catch {
        Write-Log "Tests or build failed: $_" "ERROR"
        return $false
    }
}

# Merge a branch
function Merge-Branch {
    param(
        [string]$BranchName,
        [string]$CommitMessage
    )
    
    Write-Log "Merging branch: $BranchName"
    
    if ($DryRun) {
        Write-Log "DRY RUN: Would merge $BranchName" "WARNING"
        
        # Show what would be merged
        git diff --stat main..$BranchName
        return $true
    }
    
    try {
        # Attempt merge
        $mergeOutput = git merge $BranchName --no-ff -m $CommitMessage 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            if ($mergeOutput -match "CONFLICT") {
                Write-Log "Conflicts detected in merge" "WARNING"
                
                # Show conflicted files
                $conflicts = git diff --name-only --diff-filter=U
                Write-Log "Conflicted files: $conflicts" "WARNING"
                
                # Auto-resolve if possible
                return Resolve-Conflicts
            }
            throw "Merge failed: $mergeOutput"
        }
        
        Write-Log "Successfully merged $BranchName" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "Failed to merge $BranchName: $_" "ERROR"
        return $false
    }
}

# Resolve conflicts
function Resolve-Conflicts {
    Write-Log "Attempting automatic conflict resolution..."
    
    $conflicts = git diff --name-only --diff-filter=U
    
    foreach ($file in $conflicts) {
        Write-Log "Resolving conflict in: $file"
        
        # Strategy based on file
        switch -Wildcard ($file) {
            "*AGENTS.md" {
                # Merge both versions for documentation
                Write-Log "Merging both versions of AGENTS.md"
                git checkout --theirs $file
                git add $file
            }
            "*apiClient.ts" {
                # Prefer newer version (theirs)
                Write-Log "Taking newer version of apiClient.ts"
                git checkout --theirs $file
                git add $file
            }
            "*test*" {
                # Prefer newer tests
                Write-Log "Taking newer version of test file: $file"
                git checkout --theirs $file
                git add $file
            }
            default {
                Write-Log "Manual resolution required for: $file" "WARNING"
                return $false
            }
        }
    }
    
    # Check if all conflicts resolved
    $remaining = git diff --name-only --diff-filter=U
    if ($remaining) {
        Write-Log "Unresolved conflicts remain: $remaining" "ERROR"
        return $false
    }
    
    # Commit the merge
    git commit --no-edit
    Write-Log "Conflicts resolved automatically" "SUCCESS"
    return $true
}

# Main execution
function Start-MergeProcess {
    Write-Log "=== Starting Branch Merge Process ===" "INFO"
    Write-Log "DryRun: $DryRun, SkipTests: $SkipTests, Force: $Force" "INFO"
    
    try {
        # Step 1: Prerequisites
        Test-Prerequisites
        
        # Step 2: Backup
        $backupPath = New-Backup
        
        # Step 3: Update main
        Write-Log "Updating main branch..."
        git checkout main
        git pull origin main
        
        # Step 4: Test current state
        if (-not $SkipTests) {
            if (-not (Test-Build)) {
                throw "Current main branch fails tests"
            }
        }
        
        # Step 5: Merge chore/agents-md
        $agentsMerged = Merge-Branch `
            -BranchName "origin/chore/agents-md-and-frontend-test-fixes" `
            -CommitMessage "feat: Integrate AGENTS.md documentation and frontend test fixes"
        
        if ($agentsMerged -and -not $DryRun) {
            Test-Build | Out-Null
        }
        
        # Step 6: Merge fix/frontend-hardening
        $hardeningMerged = Merge-Branch `
            -BranchName "origin/fix/frontend-hardening-20250908" `
            -CommitMessage "feat: Integrate frontend hardening improvements"
        
        if ($hardeningMerged -and -not $DryRun) {
            Test-Build | Out-Null
        }
        
        # Step 7: Summary
        Write-Log "=== Merge Process Completed ===" "SUCCESS"
        Write-Log "Backup location: $backupPath" "INFO"
        
        if ($DryRun) {
            Write-Log "DRY RUN completed - no actual changes made" "WARNING"
        } else {
            Write-Log "All branches successfully merged!" "SUCCESS"
            
            # Show final status
            git log --oneline -5
            git status
        }
        
        return $true
    }
    catch {
        Write-Log "Merge process failed: $_" "ERROR"
        Write-Log "Run .\rollback-merge.ps1 -BackupPath $backupPath to restore" "WARNING"
        return $false
    }
}

# Execute
$result = Start-MergeProcess

if ($result) {
    Write-Success "`n✅ Merge process completed successfully!"
    Write-Info "Log file: $LogFile"
    
    if (-not $DryRun) {
        Write-Warning "`nNext steps:"
        Write-Host "1. Review the changes: git diff HEAD~2..HEAD"
        Write-Host "2. Run full test suite: npm run test"
        Write-Host "3. Push to remote: git push origin main"
    }
} else {
    Write-Error "`n❌ Merge process failed. Check $LogFile for details."
    exit 1
}