#!/bin/bash

# ==================================================
# Drain Fortin Production - Staging Deployment Script
# ==================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/tmp/deploy-staging-${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Error handler
error_handler() {
    log_error "Deployment failed at line $1"
    log_error "Check the full log at: $LOG_FILE"
    exit 1
}

trap 'error_handler $LINENO' ERR

# Verify required environment variables
check_environment() {
    log "🔍 Checking environment variables..."
    
    local required_vars=(
        "VERCEL_TOKEN"
        "VERCEL_ORG_ID"
        "VERCEL_PROJECT_ID"
        "SUPABASE_ACCESS_TOKEN"
        "SUPABASE_PROJECT_REF_STAGING"
        "STAGING_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log_success "All required environment variables are set"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "🔧 Running pre-deployment checks..."
    
    # Check if we're on the develop branch
    local current_branch
    current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "develop" ]]; then
        log_warning "Not on develop branch (currently on: $current_branch)"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check for uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log_error "You have uncommitted changes. Please commit or stash them first."
        exit 1
    fi
    
    # Ensure we're up to date
    log "🔄 Fetching latest changes..."
    git fetch origin
    
    local behind_count
    behind_count=$(git rev-list --count HEAD..origin/develop)
    if [[ $behind_count -gt 0 ]]; then
        log_error "Your branch is $behind_count commits behind origin/develop. Please pull the latest changes."
        exit 1
    fi
    
    log_success "Pre-deployment checks passed"
}

# Build and test frontend
build_frontend() {
    log "🏗️ Building and testing frontend..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Install dependencies
    log "📦 Installing frontend dependencies..."
    npm ci --prefer-offline --no-audit
    
    # Run tests
    log "🧪 Running frontend tests..."
    npm run test:run
    
    # Type checking
    log "📝 Running TypeScript checks..."
    npm run type-check || npx tsc --noEmit
    
    # Linting
    log "🔍 Running ESLint..."
    npm run lint
    
    # Build
    log "🔨 Building frontend..."
    npm run build
    
    log_success "Frontend built and tested successfully"
}

# Deploy frontend to Vercel
deploy_frontend() {
    log "🚀 Deploying frontend to Vercel (Staging)..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Install Vercel CLI if not present
    if ! command -v vercel &> /dev/null; then
        log "📦 Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Deploy to staging
    local deployment_url
    deployment_url=$(vercel --prod=false --confirm --token="$VERCEL_TOKEN" --scope="$VERCEL_ORG_ID" 2>&1 | grep -o 'https://[^[:space:]]*' | tail -1)
    
    if [[ -n "$deployment_url" ]]; then
        log_success "Frontend deployed to: $deployment_url"
        echo "FRONTEND_STAGING_URL=$deployment_url" >> "$LOG_FILE"
    else
        log_error "Failed to extract deployment URL"
        exit 1
    fi
}

# Test and deploy backend
deploy_backend() {
    log "⚙️ Deploying backend to Supabase (Staging)..."
    
    cd "$PROJECT_ROOT/backend"
    
    # Install Supabase CLI if not present
    if ! command -v supabase &> /dev/null; then
        log "📦 Installing Supabase CLI..."
        npm install -g @supabase/cli
    fi
    
    # Test Deno code
    log "🧪 Running backend type checks..."
    find supabase/functions -name "*.ts" -exec deno check {} \;
    
    # Link to staging project
    log "🔗 Linking to Supabase staging project..."
    supabase link --project-ref "$SUPABASE_PROJECT_REF_STAGING"
    
    # Push database changes
    log "💾 Pushing database changes..."
    supabase db push
    
    # Deploy functions
    log "📤 Deploying Supabase functions..."
    supabase functions deploy --project-ref "$SUPABASE_PROJECT_REF_STAGING"
    
    log_success "Backend deployed successfully"
}

# Run post-deployment tests
post_deployment_tests() {
    log "🧪 Running post-deployment tests..."
    
    # Wait for deployment to stabilize
    log "⏳ Waiting for deployment to stabilize..."
    sleep 30
    
    # Health check
    log "❤️ Checking frontend health..."
    local max_attempts=5
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f "$STAGING_URL/health" --max-time 10 &> /dev/null; then
            log_success "Frontend health check passed"
            break
        else
            if [[ $attempt -eq $max_attempts ]]; then
                log_error "Frontend health check failed after $max_attempts attempts"
                exit 1
            fi
            log_warning "Frontend health check failed (attempt $attempt/$max_attempts), retrying in 10 seconds..."
            sleep 10
            ((attempt++))
        fi
    done
    
    # Backend health check
    log "⚙️ Checking backend health..."
    if curl -f "${SUPABASE_URL}/functions/v1/vapi-webhook" \
        -H "Content-Type: application/json" \
        -d '{"type":"health-check"}' \
        --max-time 15 &> /dev/null; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        exit 1
    fi
    
    # Performance check
    log "⚡ Running performance check..."
    local response_time
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "$STAGING_URL")
    
    if (( $(echo "$response_time > 5" | bc -l) )); then
        log_warning "Response time is slow: ${response_time}s"
    else
        log_success "Response time is good: ${response_time}s"
    fi
    
    log_success "All post-deployment tests passed"
}

# Generate deployment report
generate_report() {
    log "📊 Generating deployment report..."
    
    local report_file="$PROJECT_ROOT/deployment-reports/staging-${TIMESTAMP}.md"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
# Staging Deployment Report

**Date**: $(date -u)
**Environment**: Staging
**Branch**: $(git branch --show-current)
**Commit**: $(git rev-parse HEAD)
**Deployed By**: $(git config user.name) ($(git config user.email))

## Deployment Details

- **Frontend URL**: $STAGING_URL
- **Backend**: Supabase Functions
- **Duration**: $(($(date +%s) - start_time)) seconds

## Health Checks

- ✅ Frontend health check passed
- ✅ Backend health check passed
- ✅ Performance check completed
- ✅ Response time: ${response_time:-"N/A"}s

## Components Deployed

- 🎨 Frontend (React + TypeScript + Vite)
- ⚙️ Backend (Supabase Edge Functions)

## Post-Deployment Tasks

- [ ] Manual testing
- [ ] Stakeholder review
- [ ] Performance monitoring
- [ ] Ready for production deployment

## Logs

Full deployment log: \`$LOG_FILE\`

---

*Generated by deploy-staging.sh*
EOF

    log_success "Deployment report saved to: $report_file"
}

# Notify deployment completion
notify_completion() {
    log "📢 Sending deployment notification..."
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            -d "{
                \"text\": \"🚀 Staging Deployment Completed\",
                \"blocks\": [
                    {
                        \"type\": \"section\",
                        \"text\": {
                            \"type\": \"mrkdwn\",
                            \"text\": \"*Staging Deployment Successful* ✅\\n• Branch: $(git branch --show-current)\\n• Commit: $(git rev-parse --short HEAD)\\n• URL: $STAGING_URL\\n• Duration: $(($(date +%s) - start_time))s\"
                        }
                    }
                ]
            }" &> /dev/null || log_warning "Failed to send Slack notification"
    fi
}

# Rollback function
rollback() {
    log_error "🔄 Initiating rollback..."
    # Implementation would depend on your rollback strategy
    # This is a placeholder for rollback logic
    log "Rollback functionality needs to be implemented based on your infrastructure"
}

# Main deployment function
main() {
    local start_time
    start_time=$(date +%s)
    
    log "🚀 Starting Drain Fortin staging deployment..."
    log "📝 Logs will be saved to: $LOG_FILE"
    
    check_environment
    pre_deployment_checks
    build_frontend
    deploy_frontend
    deploy_backend
    post_deployment_tests
    generate_report
    notify_completion
    
    local total_time=$(($(date +%s) - start_time))
    log_success "🎉 Staging deployment completed successfully in ${total_time} seconds!"
    log_success "🌐 Staging URL: $STAGING_URL"
    log_success "📊 Full report and logs available in deployment-reports/"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi