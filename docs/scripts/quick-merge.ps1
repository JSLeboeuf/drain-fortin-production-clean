# Quick Merge Script - One-liner commands for experienced users
# Author: Claude Code
# Usage: .\quick-merge.ps1

Write-Host @"
=== QUICK MERGE COMMANDS ===

# 1. BACKUP & MERGE ALL (One command)
git stash save "pre-merge-backup" && git checkout main && git pull && git merge origin/chore/agents-md-and-frontend-test-fixes --no-ff -m "feat: Integrate AGENTS.md and test fixes" && git merge origin/fix/frontend-hardening-20250908 --no-ff -m "feat: Integrate frontend hardening" && echo "✅ All merged!"

# 2. DRY RUN (Check what would happen)
git merge-tree main origin/chore/agents-md-and-frontend-test-fixes origin/fix/frontend-hardening-20250908

# 3. QUICK ROLLBACK (Last merge)
git reset --hard HEAD~1

# 4. CONFLICT RESOLUTION (Auto-accept theirs)
git checkout --theirs . && git add -A && git commit --no-edit

# 5. VALIDATE MERGE
npm test && npm run build && git log --oneline -5

# 6. PUSH TO REMOTE
git push origin main --force-with-lease

# 7. CLEANUP OLD BRANCHES
git branch -d chore/agents-md-and-frontend-test-fixes fix/frontend-hardening-20250908 && git remote prune origin

"@ -ForegroundColor Cyan

Write-Host "Copy and run these commands as needed!" -ForegroundColor Yellow