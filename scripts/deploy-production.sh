#!/bin/bash

# ==================================================
# Drain Fortin Production - Production Deployment Script
# ==================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/tmp/deploy-production-${TIMESTAMP}.log"

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

log_critical() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] CRITICAL: $1${NC}" | tee -a "$LOG_FILE"
}

# Error handler
error_handler() {
    log_error "Production deployment failed at line $1"
    log_critical "INITIATING ROLLBACK PROCEDURES"
    rollback_deployment
    exit 1
}

trap 'error_handler $LINENO' ERR

# Global variables for rollback
ROLLBACK_URL=""
DEPLOYMENT_ID=""

# Verify required environment variables
check_environment() {
    log "🔍 Checking production environment variables..."
    
    local required_vars=(
        "VERCEL_TOKEN"
        "VERCEL_ORG_ID"
        "VERCEL_PROJECT_ID"
        "SUPABASE_ACCESS_TOKEN"
        "SUPABASE_PROJECT_REF"
        "PRODUCTION_URL"
        "VAPI_API_KEY"
        "VAPI_ASSISTANT_ID"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log_success "All required environment variables are set"
}

# Enhanced pre-deployment checks for production
pre_deployment_checks() {
    log "🔒 Running enhanced production pre-deployment checks..."
    
    # Check if we're on the main branch
    local current_branch
    current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" ]]; then
        log_error "Production deployment must be from main branch (currently on: $current_branch)"
        exit 1
    fi
    
    # Check for uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log_error "You have uncommitted changes. Production deployment requires a clean working directory."
        exit 1
    fi
    
    # Ensure we're up to date with main
    log "🔄 Fetching latest changes..."
    git fetch origin main
    
    local behind_count
    behind_count=$(git rev-list --count HEAD..origin/main)
    if [[ $behind_count -gt 0 ]]; then
        log_error "Your branch is $behind_count commits behind origin/main. Please pull the latest changes."
        exit 1
    fi
    
    # Check if staging deployment was successful
    log "🌐 Verifying staging deployment..."
    if [[ -n "${STAGING_URL:-}" ]]; then
        if ! curl -f "$STAGING_URL/health" --max-time 10 &> /dev/null; then
            log_warning "Staging environment health check failed"
            read -p "Continue with production deployment? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        else
            log_success "Staging environment is healthy"
        fi
    fi
    
    # Final confirmation for production deployment
    log_warning "🚨 PRODUCTION DEPLOYMENT CONFIRMATION 🚨"
    echo
    echo "You are about to deploy to PRODUCTION environment:"
    echo "  - Branch: $current_branch"
    echo "  - Commit: $(git rev-parse --short HEAD)"
    echo "  - URL: $PRODUCTION_URL"
    echo
    read -p "Are you absolutely sure you want to proceed? (type 'DEPLOY' to confirm): " -r
    if [[ $REPLY != "DEPLOY" ]]; then
        log "Deployment cancelled by user"
        exit 1
    fi
    
    log_success "Production pre-deployment checks passed"
}

# Create rollback point
create_rollback_point() {
    log "💾 Creating rollback point..."
    
    # Get current production deployment info from Vercel
    local current_deployment
    current_deployment=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
        "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&target=production&limit=1")
    
    ROLLBACK_URL=$(echo "$current_deployment" | jq -r '.deployments[0].url // ""')
    
    if [[ -n "$ROLLBACK_URL" && "$ROLLBACK_URL" != "null" ]]; then
        log_success "Rollback point created: $ROLLBACK_URL"
        echo "ROLLBACK_URL=$ROLLBACK_URL" >> "$LOG_FILE"
    else
        log_warning "Could not determine current production deployment for rollback"
    fi
}

# Build and test with production settings
build_production() {
    log "🏗️ Building for production with comprehensive testing..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Install dependencies
    log "📦 Installing production dependencies..."
    npm ci --prefer-offline --no-audit --only=production
    npm ci --prefer-offline --no-audit  # Install dev deps for testing
    
    # Run comprehensive test suite
    log "🧪 Running comprehensive test suite..."
    npm run test:run -- --coverage --reporter=verbose
    
    # Check coverage threshold
    local coverage_file="coverage/coverage-summary.json"
    if [[ -f "$coverage_file" ]]; then
        local coverage_percent
        coverage_percent=$(node -p "JSON.parse(require('fs').readFileSync('$coverage_file')).total.lines.pct")
        if (( $(echo "$coverage_percent < 80" | bc -l) )); then
            log_error "Test coverage ($coverage_percent%) is below 80% threshold"
            exit 1
        fi
        log_success "Test coverage: $coverage_percent%"
    fi
    
    # Type checking
    log "📝 Running strict TypeScript checks..."
    npm run type-check || npx tsc --noEmit --strict
    
    # Linting with strict rules
    log "🔍 Running strict linting..."
    npm run lint -- --max-warnings 0
    
    # Build with production optimizations
    log "🔨 Building production bundle..."
    NODE_ENV=production npm run build
    
    # Bundle analysis
    local bundle_size
    bundle_size=$(du -sk dist | cut -f1)
    log "📦 Bundle size: ${bundle_size}KB"
    
    if [[ $bundle_size -gt 1000 ]]; then
        log_warning "Bundle size is large: ${bundle_size}KB. Consider optimization."
    fi
    
    log_success "Production build completed and validated"
}

# Deploy to production with monitoring
deploy_production() {
    log "🚀 Deploying to production with enhanced monitoring..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Deploy frontend
    log "🎨 Deploying frontend to Vercel (Production)..."
    local deployment_output
    deployment_output=$(vercel --prod --confirm --token="$VERCEL_TOKEN" --scope="$VERCEL_ORG_ID" 2>&1)
    
    local production_url
    production_url=$(echo "$deployment_output" | grep -o 'https://[^[:space:]]*' | tail -1)
    
    if [[ -n "$production_url" ]]; then
        log_success "Frontend deployed to: $production_url"
        echo "PRODUCTION_DEPLOYMENT_URL=$production_url" >> "$LOG_FILE"
    else
        log_error "Failed to deploy frontend or extract deployment URL"
        exit 1
    fi
    
    # Deploy backend
    cd "$PROJECT_ROOT/backend"
    
    log "⚙️ Deploying backend to Supabase (Production)..."
    
    # Link to production project
    supabase link --project-ref "$SUPABASE_PROJECT_REF"
    
    # Deploy database changes (if any)
    log "💾 Applying database changes..."
    supabase db push
    
    # Deploy functions
    log "📤 Deploying Supabase functions..."
    supabase functions deploy --project-ref "$SUPABASE_PROJECT_REF"
    
    # Update VAPI configuration
    log "🤖 Updating VAPI Assistant configuration..."
    if [[ -f "$PROJECT_ROOT/config/vapi-assistant.json" ]]; then
        curl -X PUT "https://api.vapi.ai/assistant/$VAPI_ASSISTANT_ID" \
            -H "Authorization: Bearer $VAPI_API_KEY" \
            -H "Content-Type: application/json" \
            -d @"$PROJECT_ROOT/config/vapi-assistant.json"
        log_success "VAPI configuration updated"
    else
        log_warning "VAPI configuration file not found"
    fi
    
    log_success "Production deployment completed"
}

# Comprehensive production health checks
production_health_checks() {
    log "❤️ Running comprehensive production health checks..."
    
    # Wait for deployment to stabilize
    log "⏳ Waiting for deployment to stabilize (45 seconds)..."
    sleep 45
    
    # Multiple health check attempts
    local max_attempts=5
    local success_count=0
    
    for attempt in $(seq 1 $max_attempts); do
        log "🔍 Health check attempt $attempt/$max_attempts..."
        
        # Frontend health check
        if curl -f "$PRODUCTION_URL/health" --max-time 10 --silent &> /dev/null; then
            ((success_count++))
            log "✅ Frontend health check $attempt: PASS"
        else
            log "❌ Frontend health check $attempt: FAIL"
        fi
        
        # Backend health check
        if curl -f "${SUPABASE_URL}/functions/v1/vapi-webhook" \
            -H "Content-Type: application/json" \
            -d '{"type":"health-check"}' \
            --max-time 15 --silent &> /dev/null; then
            log "✅ Backend health check $attempt: PASS"
        else
            log "❌ Backend health check $attempt: FAIL"
        fi
        
        # VAPI integration test
        if curl -f "https://api.vapi.ai/assistant/$VAPI_ASSISTANT_ID" \
            -H "Authorization: Bearer $VAPI_API_KEY" \
            --max-time 10 --silent &> /dev/null; then
            log "✅ VAPI integration check $attempt: PASS"
        else
            log "❌ VAPI integration check $attempt: FAIL"
        fi
        
        sleep 10
    done
    
    if [[ $success_count -lt 3 ]]; then
        log_error "Health checks failed too many times ($success_count/$max_attempts successes)"
        exit 1
    fi
    
    log_success "Production health checks completed successfully"
}

# Performance validation
performance_validation() {
    log "⚡ Running production performance validation..."
    
    # Install Lighthouse if not available
    if ! command -v lighthouse &> /dev/null; then
        npm install -g lighthouse
    fi
    
    # Run Lighthouse audit
    log "🔍 Running Lighthouse performance audit..."
    lighthouse "$PRODUCTION_URL" \
        --chrome-flags="--headless --no-sandbox" \
        --output=json \
        --output-path="$PROJECT_ROOT/lighthouse-production-${TIMESTAMP}.json" \
        --quiet
    
    # Extract performance metrics
    local performance_score
    performance_score=$(node -p "Math.round(JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/lighthouse-production-${TIMESTAMP}.json')).categories.performance.score * 100)")
    
    local accessibility_score
    accessibility_score=$(node -p "Math.round(JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/lighthouse-production-${TIMESTAMP}.json')).categories.accessibility.score * 100)")
    
    log "📊 Performance score: $performance_score%"
    log "♿ Accessibility score: $accessibility_score%"
    
    # Check thresholds
    if [[ $performance_score -lt 85 ]]; then
        log_error "Performance score ($performance_score%) is below 85% threshold"
        exit 1
    fi
    
    if [[ $accessibility_score -lt 90 ]]; then
        log_error "Accessibility score ($accessibility_score%) is below 90% threshold"
        exit 1
    fi
    
    # Response time check
    local response_time
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "$PRODUCTION_URL")
    
    log "⏱️ Response time: ${response_time}s"
    
    if (( $(echo "$response_time > 2" | bc -l) )); then
        log_warning "Response time is above 2 seconds: ${response_time}s"
    fi
    
    log_success "Performance validation completed"
}

# Security validation
security_validation() {
    log "🔒 Running production security validation..."
    
    # Check security headers
    log "🛡️ Validating security headers..."
    
    local headers_check=0
    
    if curl -I "$PRODUCTION_URL" --silent | grep -i "strict-transport-security" &> /dev/null; then
        log "✅ HSTS header present"
        ((headers_check++))
    else
        log "❌ HSTS header missing"
    fi
    
    if curl -I "$PRODUCTION_URL" --silent | grep -i "x-content-type-options" &> /dev/null; then
        log "✅ X-Content-Type-Options header present"
        ((headers_check++))
    else
        log "❌ X-Content-Type-Options header missing"
    fi
    
    if curl -I "$PRODUCTION_URL" --silent | grep -i "x-frame-options" &> /dev/null; then
        log "✅ X-Frame-Options header present"
        ((headers_check++))
    else
        log "❌ X-Frame-Options header missing"
    fi
    
    if curl -I "$PRODUCTION_URL" --silent | grep -i "content-security-policy" &> /dev/null; then
        log "✅ CSP header present"
        ((headers_check++))
    else
        log "❌ CSP header missing"
    fi
    
    if [[ $headers_check -lt 3 ]]; then
        log_error "Critical security headers missing ($headers_check/4 present)"
        exit 1
    fi
    
    log_success "Security validation completed ($headers_check/4 headers present)"
}

# Rollback deployment
rollback_deployment() {
    log_critical "🔄 INITIATING EMERGENCY ROLLBACK..."
    
    if [[ -n "$ROLLBACK_URL" && "$ROLLBACK_URL" != "null" ]]; then
        log "🔙 Rolling back to: $ROLLBACK_URL"
        
        # Attempt to rollback via Vercel API
        local rollback_response
        rollback_response=$(curl -s -X POST "https://api.vercel.com/v13/deployments" \
            -H "Authorization: Bearer $VERCEL_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "emergency-rollback",
                "project": "'$VERCEL_PROJECT_ID'",
                "target": "production",
                "gitSource": {
                    "type": "github",
                    "ref": "main",
                    "sha": "'$(git rev-parse HEAD~1)'"
                }
            }' || echo "rollback-failed")
        
        if [[ "$rollback_response" == "rollback-failed" ]]; then
            log_critical "Automatic rollback failed - manual intervention required"
            log_critical "Previous working URL: $ROLLBACK_URL"
        else
            log_warning "Rollback initiated - monitoring required"
        fi
    else
        log_critical "No rollback point available - manual intervention required immediately"
    fi
    
    # Send critical alert
    send_critical_alert "PRODUCTION DEPLOYMENT FAILED - ROLLBACK INITIATED"
}

# Generate comprehensive deployment report
generate_production_report() {
    log "📊 Generating comprehensive production deployment report..."
    
    local report_file="$PROJECT_ROOT/deployment-reports/production-${TIMESTAMP}.md"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
# 🚀 Production Deployment Report

## Deployment Information

**Date**: $(date -u)
**Environment**: 🔴 **PRODUCTION**
**Branch**: $(git branch --show-current)
**Commit**: $(git rev-parse HEAD)
**Commit Message**: $(git log -1 --pretty=%B)
**Deployed By**: $(git config user.name) ($(git config user.email))
**Deployment Duration**: $(($(date +%s) - start_time)) seconds

## URLs

- **Production URL**: $PRODUCTION_URL
- **Rollback URL**: ${ROLLBACK_URL:-"N/A"}

## Quality Gates

- ✅ Test Coverage: ${coverage_percent:-"N/A"}%
- ✅ Performance Score: ${performance_score:-"N/A"}%
- ✅ Accessibility Score: ${accessibility_score:-"N/A"}%
- ✅ Security Headers: ${headers_check:-"N/A"}/4
- ✅ Health Checks: Passed
- ✅ Response Time: ${response_time:-"N/A"}s

## Components Deployed

- 🎨 **Frontend**: React + TypeScript + Vite
  - Bundle Size: ${bundle_size:-"N/A"}KB
  - Deployed to: Vercel Production
  
- ⚙️ **Backend**: Supabase Edge Functions
  - Deployed to: Supabase Production
  - Database changes: Applied
  
- 🤖 **VAPI Integration**: Updated

## Post-Deployment Checklist

- [ ] Monitor error rates for 1 hour
- [ ] Check performance metrics
- [ ] Verify all integrations
- [ ] Monitor user feedback
- [ ] Update documentation

## Emergency Procedures

**Rollback Command**: 
\`\`\`bash
curl -X POST "https://api.vercel.com/v13/deployments" \\
  -H "Authorization: Bearer \$VERCEL_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "emergency-rollback",
    "project": "$VERCEL_PROJECT_ID",
    "target": "production"
  }'
\`\`\`

**Monitoring**: 
- Production URL: $PRODUCTION_URL
- Health endpoint: $PRODUCTION_URL/health
- Logs: \`$LOG_FILE\`

---

*Generated by deploy-production.sh at $(date -u)*
EOF

    log_success "Production deployment report saved to: $report_file"
}

# Send notifications
send_notifications() {
    log "📢 Sending production deployment notifications..."
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            -d "{
                \"text\": \"🚀 Production Deployment Successful\",
                \"blocks\": [
                    {
                        \"type\": \"section\",
                        \"text\": {
                            \"type\": \"mrkdwn\",
                            \"text\": \"*🔴 PRODUCTION DEPLOYMENT SUCCESSFUL* ✅\\n• Commit: \\\`$(git rev-parse --short HEAD)\\\`\\n• Performance: ${performance_score:-N/A}%\\n• Duration: $(($(date +%s) - start_time))s\\n• URL: $PRODUCTION_URL\\n• Rollback: ${ROLLBACK_URL:-N/A}\"
                        }
                    }
                ]
            }" &> /dev/null || log_warning "Failed to send Slack notification"
    fi
    
    # Email notification (if configured)
    if [[ -n "${EMAIL_RECIPIENTS:-}" ]]; then
        local subject="🚀 Production Deployment Successful - Drain Fortin"
        local body="Production deployment completed successfully at $(date -u). Performance: ${performance_score:-N/A}%. URL: $PRODUCTION_URL"
        
        # This would integrate with your email service
        log "Email notification prepared for: $EMAIL_RECIPIENTS"
    fi
}

# Send critical alert
send_critical_alert() {
    local message="$1"
    
    log_critical "$message"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            -d "{
                \"text\": \"🚨 CRITICAL PRODUCTION ALERT\",
                \"blocks\": [
                    {
                        \"type\": \"section\",
                        \"text\": {
                            \"type\": \"mrkdwn\",
                            \"text\": \"*🚨 CRITICAL PRODUCTION ALERT* 🚨\\n$message\\n• Time: $(date -u)\\n• Commit: \\\`$(git rev-parse --short HEAD)\\\`\\n• Logs: \\\`$LOG_FILE\\\`\"
                        }
                    }
                ]
            }" &> /dev/null || true
    fi
}

# Main production deployment function
main() {
    local start_time
    start_time=$(date +%s)
    
    log "🚀 Starting PRODUCTION deployment for Drain Fortin..."
    log_warning "🔴 This is a PRODUCTION deployment - proceed with extreme caution"
    log "📝 All actions will be logged to: $LOG_FILE"
    
    check_environment
    pre_deployment_checks
    create_rollback_point
    build_production
    deploy_production
    production_health_checks
    performance_validation
    security_validation
    generate_production_report
    send_notifications
    
    local total_time=$(($(date +%s) - start_time))
    log_success "🎉 PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY!"
    log_success "⏱️ Total time: ${total_time} seconds"
    log_success "🌐 Production URL: $PRODUCTION_URL"
    log_success "📊 Full report available in deployment-reports/"
    log_success "🔄 Rollback point: ${ROLLBACK_URL:-"N/A"}"
    
    log "🔍 Please monitor the application for the next hour"
    log "📈 Check performance dashboards and error rates"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi