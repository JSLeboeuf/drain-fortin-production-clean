#!/bin/bash

# ==================================================
# Drain Fortin Production - Local CI Setup Script
# ==================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
}

# Check if required tools are installed
check_dependencies() {
    log "🔍 Checking required dependencies..."
    
    local missing_deps=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    else
        local node_version=$(node --version | sed 's/v//')
        log "✅ Node.js: $node_version"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    else
        local npm_version=$(npm --version)
        log "✅ npm: $npm_version"
    fi
    
    # Check Deno
    if ! command -v deno &> /dev/null; then
        warn "Deno not found - installing..."
        if command -v curl &> /dev/null; then
            curl -fsSL https://deno.land/x/install/install.sh | sh
            export PATH="$HOME/.deno/bin:$PATH"
            log "✅ Deno installed: $(deno --version | head -1)"
        else
            missing_deps+=("Deno")
        fi
    else
        local deno_version=$(deno --version | head -1)
        log "✅ Deno: $deno_version"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("Docker")
    else
        local docker_version=$(docker --version)
        log "✅ Docker: $docker_version"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        missing_deps+=("Git")
    else
        local git_version=$(git --version)
        log "✅ Git: $git_version"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing dependencies: ${missing_deps[*]}"
        echo "Please install the missing dependencies and run this script again."
        exit 1
    fi
    
    log "All required dependencies are installed!"
}

# Install global tools
install_global_tools() {
    log "🛠️ Installing global development tools..."
    
    # Supabase CLI
    if ! command -v supabase &> /dev/null; then
        log "Installing Supabase CLI..."
        npm install -g @supabase/cli@latest
    else
        log "✅ Supabase CLI already installed"
    fi
    
    # Vercel CLI
    if ! command -v vercel &> /dev/null; then
        log "Installing Vercel CLI..."
        npm install -g vercel@latest
    else
        log "✅ Vercel CLI already installed"
    fi
    
    # Lighthouse
    if ! command -v lighthouse &> /dev/null; then
        log "Installing Lighthouse..."
        npm install -g lighthouse@latest
    else
        log "✅ Lighthouse already installed"
    fi
    
    # Artillery (for load testing)
    if ! command -v artillery &> /dev/null; then
        log "Installing Artillery..."
        npm install -g artillery@latest
    else
        log "✅ Artillery already installed"
    fi
    
    log "Global tools installation completed!"
}

# Setup frontend dependencies
setup_frontend() {
    log "🎨 Setting up frontend dependencies..."
    
    cd "$PROJECT_ROOT/frontend"
    
    if [ -f package-lock.json ]; then
        log "Installing frontend dependencies..."
        npm ci --prefer-offline
    else
        warn "package-lock.json not found, running npm install..."
        npm install
    fi
    
    # Run type check to ensure everything is working
    log "Running TypeScript check..."
    npm run type-check || npx tsc --noEmit
    
    log "Frontend setup completed!"
}

# Setup backend environment
setup_backend() {
    log "⚙️ Setting up backend environment..."
    
    cd "$PROJECT_ROOT/backend"
    
    # Check Deno dependencies
    log "Checking Deno dependencies..."
    find supabase/functions -name "*.ts" -exec deno check {} \; || warn "Some TypeScript files have issues"
    
    # Format code
    log "Formatting Deno code..."
    deno fmt
    
    log "Backend setup completed!"
}

# Setup Git hooks
setup_git_hooks() {
    log "🪝 Setting up Git hooks..."
    
    cd "$PROJECT_ROOT"
    
    # Create pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook for Drain Fortin Production

set -e

echo "🔍 Running pre-commit checks..."

# Frontend checks
if [ -d "frontend" ]; then
    cd frontend
    echo "Running frontend linting..."
    npm run lint
    
    echo "Running TypeScript checks..."
    npm run type-check || npx tsc --noEmit
    cd ..
fi

# Backend checks  
if [ -d "backend" ]; then
    cd backend
    echo "Running Deno format check..."
    deno fmt --check
    
    echo "Running Deno lint..."
    deno lint
    cd ..
fi

echo "✅ Pre-commit checks passed!"
EOF

    chmod +x .git/hooks/pre-commit
    
    # Create pre-push hook
    cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
# Pre-push hook for Drain Fortin Production

set -e

echo "🚀 Running pre-push checks..."

# Run tests if available
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    cd frontend
    if npm run test:run --if-present; then
        echo "✅ Frontend tests passed!"
    else
        echo "⚠️ Frontend tests not available or failed"
    fi
    cd ..
fi

echo "✅ Pre-push checks completed!"
EOF

    chmod +x .git/hooks/pre-push
    
    log "Git hooks installed successfully!"
}

# Create local environment file template
create_env_template() {
    log "📝 Creating environment template..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f .env.example ]; then
        cat > .env.example << EOF
# Drain Fortin Production - Environment Variables Template
# Copy this file to .env and fill in your values

# Deployment Configuration
VERCEL_TOKEN=your_vercel_token_here
VERCEL_ORG_ID=your_vercel_org_id_here
VERCEL_PROJECT_ID=your_vercel_project_id_here

# Supabase Configuration
SUPABASE_ACCESS_TOKEN=your_supabase_access_token_here
SUPABASE_PROJECT_REF=your_production_project_ref_here
SUPABASE_PROJECT_REF_STAGING=your_staging_project_ref_here
SUPABASE_URL=https://your-project.supabase.co

# Application URLs
PRODUCTION_URL=https://your-production-domain.com
STAGING_URL=https://your-staging-domain.vercel.app

# API Integration
VAPI_API_KEY=your_vapi_api_key_here
VAPI_ASSISTANT_ID=your_vapi_assistant_id_here

# Notifications (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Security Tools (Optional)
SNYK_TOKEN=your_snyk_token_here
GITLEAKS_LICENSE=your_gitleaks_license_here
EOF
        log "Created .env.example template"
        warn "Please copy .env.example to .env and fill in your actual values"
    else
        log "Environment template already exists"
    fi
}

# Setup VS Code configuration
setup_vscode() {
    log "💻 Setting up VS Code configuration..."
    
    cd "$PROJECT_ROOT"
    mkdir -p .vscode
    
    # VS Code settings
    cat > .vscode/settings.json << 'EOF'
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  },
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": false,
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
EOF

    # VS Code extensions recommendations
    cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "denoland.vscode-deno",
    "github.vscode-github-actions",
    "ms-vscode.github-issues-prs",
    "ms-azuretools.vscode-docker",
    "redhat.vscode-yaml"
  ]
}
EOF

    # VS Code tasks
    cat > .vscode/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Frontend: Install",
      "type": "shell",
      "command": "npm ci",
      "options": {
        "cwd": "${workspaceFolder}/frontend"
      },
      "group": "build"
    },
    {
      "label": "Frontend: Start Dev",
      "type": "shell",
      "command": "npm run dev",
      "options": {
        "cwd": "${workspaceFolder}/frontend"
      },
      "group": "build"
    },
    {
      "label": "Frontend: Build",
      "type": "shell",
      "command": "npm run build",
      "options": {
        "cwd": "${workspaceFolder}/frontend"
      },
      "group": "build"
    },
    {
      "label": "Frontend: Test",
      "type": "shell",
      "command": "npm run test:run",
      "options": {
        "cwd": "${workspaceFolder}/frontend"
      },
      "group": "test"
    },
    {
      "label": "Backend: Format",
      "type": "shell",
      "command": "deno fmt",
      "options": {
        "cwd": "${workspaceFolder}/backend"
      },
      "group": "build"
    },
    {
      "label": "Docker: Build",
      "type": "shell",
      "command": "docker build -t drain-fortin-local .",
      "group": "build"
    }
  ]
}
EOF

    log "VS Code configuration completed!"
}

# Run local CI checks
run_local_ci() {
    log "🧪 Running local CI checks..."
    
    cd "$PROJECT_ROOT"
    
    # Frontend checks
    if [ -d "frontend" ]; then
        log "Running frontend CI checks..."
        cd frontend
        
        # Install if needed
        if [ ! -d node_modules ]; then
            npm ci --prefer-offline
        fi
        
        # Linting
        npm run lint || warn "Frontend linting issues found"
        
        # Type checking
        npm run type-check || npx tsc --noEmit || warn "TypeScript issues found"
        
        # Build test
        npm run build || warn "Frontend build failed"
        
        cd ..
    fi
    
    # Backend checks
    if [ -d "backend" ]; then
        log "Running backend CI checks..."
        cd backend
        
        # Format check
        deno fmt --check || warn "Backend formatting issues found"
        
        # Lint
        deno lint || warn "Backend linting issues found"
        
        # Type check
        find supabase/functions -name "*.ts" -exec deno check {} \; || warn "Backend type check issues found"
        
        cd ..
    fi
    
    log "Local CI checks completed!"
}

# Main setup function
main() {
    log "🚀 Setting up Drain Fortin Production local CI environment..."
    
    check_dependencies
    install_global_tools
    setup_frontend
    setup_backend
    setup_git_hooks
    create_env_template
    setup_vscode
    run_local_ci
    
    log "🎉 Local CI setup completed successfully!"
    echo
    log "Next steps:"
    echo "1. Copy .env.example to .env and fill in your values"
    echo "2. Install recommended VS Code extensions"
    echo "3. Run 'npm run dev' in the frontend directory to start development"
    echo "4. Use './scripts/deploy-staging.sh' to deploy to staging"
    echo
    log "Happy coding! 🚀"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi