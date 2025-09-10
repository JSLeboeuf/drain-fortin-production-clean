# 🚀 Drain Fortin Production - CI/CD Pipeline Documentation

## Overview

This repository contains a comprehensive, enterprise-grade CI/CD pipeline for the Drain Fortin Production System. The pipeline implements DevOps best practices including automated testing, security scanning, deployment automation, monitoring, and rollback capabilities.

## 🏗️ Architecture

### System Components

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL (Supabase)
- **Infrastructure**: Docker containers, Vercel deployment
- **Monitoring**: Lighthouse, Artillery, Custom health checks

### Pipeline Structure

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Code Quality  │    │     Testing      │    │      Build      │
│   & Security    │───▶│   & Coverage     │───▶│ & Containerize  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Deploy to     │    │   Deploy to      │    │ Post-Deployment │
│    Staging      │───▶│   Production     │───▶│   Monitoring    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📋 Workflows

### 1. Main CI/CD Pipeline (`ci-cd.yml`)

**Triggers:**
- Push to `main`, `develop`, `feature/*`, `hotfix/*`, `release/*`
- Pull requests to `main`, `develop`
- Weekly security scans (Monday 2 AM UTC)
- Manual dispatch

**Stages:**
1. **Code Quality & Security**
   - ESLint, Prettier, TypeScript checks
   - CodeQL analysis
   - Dependency vulnerability scanning
   - SAST with Semgrep
   - License compliance
   - Secrets scanning

2. **Testing Pipeline**
   - Frontend unit tests (Node 18, 20, 22)
   - Backend Deno tests
   - E2E tests with Playwright (3 browsers)
   - Coverage enforcement (80% minimum)

3. **Build & Container**
   - Multi-stage Docker builds
   - SBOM generation
   - Container security scanning (Trivy, Snyk)
   - Image signing with Cosign

4. **Deployment**
   - Staging deployment (develop branch)
   - Production deployment (main branch)
   - Health checks and smoke tests
   - Performance validation

5. **Post-Deployment Monitoring**
   - Extended health monitoring
   - Load testing with Artillery
   - Performance regression testing
   - Availability monitoring

### 2. Pull Request Checks (`pr-checks.yml`)

**Features:**
- PR size analysis and complexity assessment
- Component-specific testing (frontend/backend)
- Security validation
- Bundle size analysis
- Automated PR comments with status

### 3. Security Scanning (`security.yml`)

**Comprehensive Security Coverage:**
- **Secrets**: TruffleHog, GitLeaks
- **Dependencies**: npm audit, Snyk, Deno deps
- **SAST**: CodeQL, Semgrep, ESLint Security
- **Containers**: Trivy, Snyk container scanning
- **Infrastructure**: Docker Compose, Dockerfile analysis

### 4. Emergency Rollback (`rollback.yml`)

**Manual Rollback Options:**
- Previous deployment rollback
- Specific commit rollback  
- Safe known-good state rollback

**Features:**
- Automated validation
- Frontend and backend rollback
- Post-rollback verification
- Incident tracking and reporting

## 🔧 Configuration

### Required Secrets

```bash
# Deployment
VERCEL_TOKEN=                    # Vercel deployment token
VERCEL_ORG_ID=                   # Vercel organization ID  
VERCEL_PROJECT_ID=               # Vercel project ID
SUPABASE_ACCESS_TOKEN=           # Supabase CLI access token
SUPABASE_PROJECT_REF=            # Production Supabase project reference
SUPABASE_PROJECT_REF_STAGING=    # Staging Supabase project reference

# API Integration
VAPI_API_KEY=                    # VAPI service API key
VAPI_ASSISTANT_ID=               # VAPI assistant configuration ID

# URLs
PRODUCTION_URL=                  # Production application URL
STAGING_URL=                     # Staging application URL
SUPABASE_URL=                    # Supabase project URL

# Notifications
SLACK_WEBHOOK_URL=               # Slack webhook for notifications

# Security (Optional)
SNYK_TOKEN=                      # Snyk security scanning token
GITLEAKS_LICENSE=                # GitLeaks license key
```

### Environment Variables

```bash
# Pipeline Configuration
NODE_VERSION=20                  # Node.js version
DENO_VERSION=1.46               # Deno version
COVERAGE_THRESHOLD=80           # Test coverage minimum
PERFORMANCE_THRESHOLD=85        # Lighthouse performance minimum
```

### Branch Protection Rules

Recommended GitHub branch protection settings:

```yaml
main:
  - Require pull request reviews (2 reviewers)
  - Require status checks to pass
  - Require up-to-date branches
  - Include administrators
  - Required status checks:
    - "Code Quality & Security"
    - "Frontend Tests"
    - "Backend Tests" 
    - "E2E Tests"
    - "Build & Container"

develop:
  - Require status checks to pass
  - Required status checks:
    - "PR Validation"
    - "Frontend PR Checks"
    - "Security PR Checks"
```

## 🚀 Deployment Process

### Staging Deployment

1. **Automatic**: Push to `develop` branch
2. **Manual**: Use workflow dispatch to staging environment

```bash
# Local staging deployment
./scripts/deploy-staging.sh
```

### Production Deployment

1. **Automatic**: Push to `main` branch (after staging success)
2. **Manual**: Use workflow dispatch to production environment

```bash
# Local production deployment (requires confirmation)
./scripts/deploy-production.sh
```

### Deployment Features

- **Blue-Green Strategy**: Zero-downtime deployments
- **Health Checks**: Comprehensive validation before traffic switch
- **Rollback Points**: Automatic backup creation before deployment
- **Performance Gates**: Lighthouse score validation
- **Security Validation**: Headers and vulnerability checks

## 🔄 Rollback Procedures

### Emergency Rollback

1. **GitHub UI**: Go to Actions → Emergency Rollback → Run workflow
2. **Select Environment**: Production or Staging
3. **Choose Rollback Type**:
   - Previous deployment (safest)
   - Specific commit (requires SHA)
   - Safe known-good (tagged release)
4. **Provide Reason**: Required for audit trail

### Rollback Types

```yaml
Previous Deployment:  # Rolls back to last known working state
Specific Commit:      # Rolls back to exact commit (manual)
Safe Known Good:      # Rolls back to last tagged stable release
```

## 📊 Monitoring & Observability

### Health Checks

```bash
# Frontend Health
GET /health
Response: 200 OK

# Backend Health  
POST /functions/v1/vapi-webhook
Body: {"type":"health-check"}
Response: 200 OK
```

### Performance Monitoring

- **Lighthouse Audits**: Performance, Accessibility, SEO, Best Practices
- **Load Testing**: Artillery-based synthetic testing
- **Response Time Monitoring**: Sub-2 second SLA
- **Error Rate Tracking**: <0.1% error threshold

### Security Monitoring

- **Daily Vulnerability Scans**: Automated dependency checks
- **SAST Integration**: Code analysis on every commit
- **Container Scanning**: Image vulnerability assessment
- **Secret Detection**: Continuous monitoring for exposed credentials

## 🛡️ Security Features

### Multi-Layer Security

1. **Code Level**:
   - Static analysis (Semgrep, CodeQL)
   - Dependency scanning (npm audit, Snyk)
   - License compliance checking

2. **Container Level**:
   - Base image vulnerability scanning
   - Multi-stage builds for minimal attack surface
   - Non-root user execution

3. **Infrastructure Level**:
   - Security headers validation
   - HTTPS enforcement
   - Content Security Policy

4. **Runtime Level**:
   - Health monitoring
   - Performance anomaly detection
   - Error rate alerting

### Compliance Features

- **SBOM Generation**: Software Bill of Materials for each build
- **Audit Logs**: Complete deployment and rollback history
- **Security Reports**: Automated vulnerability reporting
- **License Compliance**: OSI-approved license verification

## 🎯 Quality Gates

### Code Quality

- **ESLint**: Zero warnings policy
- **TypeScript**: Strict type checking
- **Prettier**: Consistent code formatting
- **Test Coverage**: 80% minimum coverage

### Performance

- **Bundle Size**: <500KB threshold
- **Lighthouse Performance**: 85% minimum score
- **Response Time**: <2 seconds for critical paths
- **Load Testing**: 5 concurrent users baseline

### Security

- **Vulnerability Threshold**: No high/critical vulnerabilities
- **Security Headers**: Required for production
- **Secret Detection**: Zero exposed credentials
- **Container Security**: No critical container vulnerabilities

## 📱 Notifications

### Slack Integration

The pipeline sends notifications for:

- ✅ Successful deployments
- ❌ Failed deployments  
- 🔄 Rollback operations
- 🚨 Security alerts
- 📊 Performance degradations

### Notification Format

```json
{
  "status": "success|failure|warning",
  "environment": "production|staging",
  "commit": "abc123...",
  "performance": "85%",
  "duration": "120s",
  "rollback_url": "https://..."
}
```

## 🔧 Maintenance

### Regular Tasks

- **Weekly**: Review security scan results
- **Monthly**: Update dependencies via Dependabot
- **Quarterly**: Review and update pipeline configuration
- **As Needed**: Investigate performance regressions

### Dependency Management

- **Dependabot**: Automated dependency updates
- **Grouped Updates**: Related packages updated together
- **Security Priority**: Critical vulnerabilities get immediate attention
- **Breaking Changes**: Major version updates require manual review

## 🆘 Troubleshooting

### Common Issues

#### Pipeline Failures

```bash
# Check workflow logs
gh run list --workflow=ci-cd.yml --limit=5
gh run view [RUN_ID] --log

# Re-run failed jobs
gh run rerun [RUN_ID] --failed
```

#### Deployment Issues

```bash
# Check deployment status
curl -f $PRODUCTION_URL/health

# Manual rollback
gh workflow run rollback.yml \
  -f environment=production \
  -f rollback_type=previous-deployment \
  -f reason="Manual rollback for investigation"
```

#### Performance Issues

```bash
# Run local performance test
lighthouse $PRODUCTION_URL --output=html --output-path=report.html

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s $PRODUCTION_URL
```

### Emergency Procedures

#### Complete System Failure

1. **Immediate**: Trigger emergency rollback
2. **Investigate**: Check logs and monitoring
3. **Communicate**: Notify stakeholders via Slack
4. **Document**: Create incident report
5. **Follow-up**: Post-incident review and improvements

#### Security Incident

1. **Immediate**: Run security workflow manually
2. **Assess**: Review vulnerability findings
3. **Patch**: Apply security updates
4. **Deploy**: Emergency deployment if critical
5. **Monitor**: Enhanced monitoring post-patch

## 📚 Additional Resources

### Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

### Tools

- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Artillery Load Testing](https://www.artillery.io/)
- [Semgrep Security](https://semgrep.dev/)
- [Snyk Security](https://snyk.io/)

### Monitoring

- [Uptime Robot](https://uptimerobot.com/) - External monitoring
- [Sentry](https://sentry.io/) - Error tracking
- [LogRocket](https://logrocket.com/) - Session replay

---

## 🤝 Contributing

For pipeline improvements:

1. Fork the repository
2. Create a feature branch: `git checkout -b pipeline/feature-name`
3. Make changes to `.github/workflows/` or `scripts/`
4. Test in staging environment first
5. Submit pull request with detailed description

## 📄 License

This CI/CD pipeline configuration is part of the Drain Fortin Production System and follows the same licensing terms as the main project.

---

**⚠️ Important**: This is a production-grade CI/CD system. Always test changes in staging before applying to production workflows.

**🚨 Emergency Contact**: For critical pipeline issues, contact the DevOps team via Slack or create a high-priority GitHub issue.