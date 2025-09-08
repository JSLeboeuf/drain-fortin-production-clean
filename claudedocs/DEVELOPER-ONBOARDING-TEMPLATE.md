# Developer Onboarding Guide
## Drain Fortin Production System

Welcome to the Drain Fortin development team! This guide will get you from zero to productive contributor in 2 days.

---

## 🎯 Quick Start Checklist

### Day 1: Environment Setup
- [ ] **Prerequisites**: Install Node.js, Git, VS Code
- [ ] **Repository**: Clone and explore codebase structure
- [ ] **Environment**: Configure development environment
- [ ] **Services**: Set up local development services
- [ ] **Testing**: Run test suite and verify setup
- [ ] **First Run**: Launch application locally

### Day 2: Understanding & Contributing  
- [ ] **Architecture**: Learn system components and data flow
- [ ] **Business Logic**: Understand drain service operations
- [ ] **Code Walkthrough**: Review key files with mentor
- [ ] **Development Workflow**: Learn Git branching and PR process
- [ ] **First Contribution**: Pick up a "good first issue"
- [ ] **Team Integration**: Join communication channels

---

## 🛠️ Prerequisites

### Required Software
```bash
# Node.js (LTS version)
node --version  # Should be v20.x or higher
npm --version   # Should be v10.x or higher

# Git
git --version  # Any recent version

# Recommended: VS Code with extensions
# - TypeScript and JavaScript Language Features
# - ESLint
# - Prettier
# - GitLens
```

### Recommended Tools
- **PowerShell 7+** (Windows) or **Zsh/Bash** (macOS/Linux)
- **Supabase CLI**: For database management
- **Vercel CLI**: For deployment testing
- **Postman/Insomnia**: For API testing

---

## 📁 Repository Setup

### 1. Clone Repository
```bash
# Clone the repository
git clone https://github.com/your-org/drain-fortin-production-clean.git
cd drain-fortin-production-clean

# Checkout development branch
git checkout -b setup/your-name
```

### 2. Explore Project Structure
```
drain-fortin-production-clean/
├── frontend/                 # React dashboard (TypeScript + Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-based pages
│   │   ├── lib/             # Utilities and configuration
│   │   └── types/           # TypeScript type definitions
│   ├── package.json         # Dependencies and scripts
│   └── vite.config.ts       # Build configuration
├── backend/                 # Supabase backend
│   └── supabase/
│       ├── functions/       # Edge functions (Deno/TypeScript)
│       │   ├── vapi-webhook/    # Main webhook handler
│       │   └── _shared/         # Shared utilities and services
│       └── migrations/      # Database schema changes
├── config/                  # Configuration files
│   ├── vapi-assistant.json  # VAPI assistant configuration
│   └── .env.example         # Environment variable template
├── scripts/                 # Deployment and utility scripts
│   ├── deploy.ps1           # Production deployment
│   └── dev-setup.ps1        # Development environment setup
└── docs/                    # Documentation (this guide!)
```

### 3. Install Dependencies
```bash
# Frontend dependencies
cd frontend
npm install

# Optional: Install global tools
npm install -g @supabase/cli vercel typescript
```

---

## 🔐 Environment Configuration

### 1. Environment Variables
```bash
# Copy environment template
cp config/.env.example config/.env.local

# Edit with your development credentials
# Note: Ask team lead for development keys
```

### Required Environment Variables
```env
# Supabase (Local Development)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_key

# VAPI (Development)
VAPI_API_KEY=vapi_dev_your_key
VAPI_WEBHOOK_SECRET=your_webhook_secret
VAPI_ASSISTANT_ID=asst_dev_your_id

# Twilio (Development - Optional)
TWILIO_ACCOUNT_SID=AC_test_account
TWILIO_AUTH_TOKEN=test_auth_token
TWILIO_PHONE_NUMBER=+15005550006  # Twilio test number
```

### 2. Development Services Setup

#### Option A: Full Local Setup (Recommended)
```bash
# Start Supabase local development
cd backend
supabase start

# This will start:
# - PostgreSQL database on port 54322
# - API Gateway on port 54321
# - Dashboard on port 54323
# - Inbucket (email testing) on port 54324
```

#### Option B: Remote Development Database
```bash
# Link to shared development project
cd backend
supabase link --project-ref your-dev-project-id

# Apply latest migrations
supabase db pull
```

---

## 🚀 First Run

### 1. Start Development Servers
```bash
# Terminal 1: Backend (if using local Supabase)
cd backend
supabase start

# Terminal 2: Frontend
cd frontend  
npm run dev
```

### 2. Verify Setup
1. **Frontend**: Open http://localhost:3000
   - Should see dashboard loading screen
   - Check browser console for errors

2. **Backend**: Open http://localhost:54323
   - Supabase dashboard should load
   - Verify tables exist: `vapi_calls`, `call_transcripts`, `tool_calls`

3. **API**: Test webhook endpoint
   ```bash
   curl -X POST http://localhost:54321/functions/v1/vapi-webhook \
     -H "Content-Type: application/json" \
     -d '{"type":"health-check"}'
   ```
   Should return: `{"success":true,"type":"health-check"}`

### 3. Run Tests
```bash
# Frontend tests
cd frontend
npm run test

# Integration tests (if available)
npm run test:integration

# All tests should pass ✅
```

---

## 🏗️ System Architecture Overview

### High-Level Data Flow
```
Customer Call → VAPI (GPT-4o) → Webhook → Supabase → Dashboard
                     ↓
              Business Functions → SMS Alerts → Team
```

### Key Components

#### 1. **VAPI Integration** (Voice AI)
- **Purpose**: Handles customer calls in French
- **Model**: GPT-4o-mini for low latency
- **Voice**: ElevenLabs Adam (French Canadian)
- **Functions**: 5 business functions for quotes, scheduling, etc.

#### 2. **Webhook Handler** (`backend/supabase/functions/vapi-webhook/`)
- **Purpose**: Process VAPI events and function calls
- **Security**: HMAC signature verification
- **Functions**: Service validation, pricing, priority classification
- **Database**: Store calls, transcripts, and analysis

#### 3. **React Dashboard** (`frontend/src/`)
- **Purpose**: Real-time monitoring and analytics
- **Stack**: React 18 + TypeScript + Vite + TanStack Query
- **Features**: Call tracking, priority alerts, performance metrics
- **Styling**: Tailwind CSS + shadcn/ui components

#### 4. **Supabase Backend**
- **Database**: PostgreSQL with real-time subscriptions
- **Auth**: Row-level security (RLS) policies
- **Edge Functions**: Global serverless functions (Deno runtime)
- **Storage**: File uploads and CDN

### Business Logic Deep Dive

#### Priority Classification System
```typescript
// P1: Emergency (flooding, backup) → Immediate SMS
if (/(inondation|refoulement|urgence)/.test(description)) 
  return { priority: 'P1', sla_seconds: 0 };

// P2: Municipal work → 2 hour SLA  
if (/(municipalit|ville de)/.test(description))
  return { priority: 'P2', sla_seconds: 7200 };

// P3: High-value jobs → 1 hour SLA
if (/gainage/.test(description) || value >= 3000)
  return { priority: 'P3', sla_seconds: 3600 };

// P4: Standard → 30 minute SLA
return { priority: 'P4', sla_seconds: 1800 };
```

#### Service Validation
```typescript
// Services we handle
const accepted = ['débouchage', 'racines', 'gainage', 'drain français'];

// Services we refuse  
const refused = ['fosse', 'piscine', 'gouttière', 'puisard'];
```

---

## 💻 Development Workflow

### Git Branching Strategy
```bash
# Main branches
main           # Production-ready code
develop        # Integration branch (if used)

# Feature branches
feature/add-sms-templates
fix/webhook-timeout-handling  
docs/api-documentation

# Branch naming convention
<type>/<short-description>
# Types: feature, fix, docs, refactor, test, chore
```

### Making Changes

#### 1. Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

#### 2. Development Process
```bash
# Make changes
# Write/update tests
npm run test

# Check code quality
npm run lint
npm run type-check

# Commit with descriptive message
git add .
git commit -m "feat: add SMS template management

- Add CRUD operations for SMS templates
- Update webhook to use custom templates
- Add template validation and testing
- Include tests for template functionality"
```

#### 3. Pull Request Process
```bash
# Push to remote
git push origin feature/your-feature-name

# Create PR with template:
# - Clear description of changes
# - Link to any issues
# - Screenshots for UI changes  
# - Checklist of testing completed
```

### Code Review Checklist
- [ ] **Functionality**: Does it work as expected?
- [ ] **Tests**: Are new features tested?
- [ ] **Types**: TypeScript types properly defined?
- [ ] **Security**: No hardcoded secrets or vulnerabilities?
- [ ] **Performance**: No obvious performance issues?
- [ ] **Documentation**: Code is self-documenting or commented?

---

## 🧪 Testing Strategy

### Test Types and Tools

#### 1. **Frontend Testing** (Vitest + React Testing Library)
```bash
# Unit tests for components
npm run test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

#### 2. **Backend Testing** (Deno test)
```bash
# Edge function tests
cd backend/supabase/functions
deno test --allow-all vapi-webhook/test.ts

# Database migration tests
supabase test
```

#### 3. **Integration Testing**
```bash
# End-to-end API tests
npm run test:integration

# Webhook simulation tests
npm run test:webhook
```

### Writing Tests

#### Component Test Example
```typescript
// frontend/src/components/__tests__/CallsChart.test.tsx
import { render, screen } from '@testing-library/react';
import { CallsChart } from '../CallsChart';

describe('CallsChart', () => {
  it('should render chart with provided data', () => {
    const data = [
      { time: '10:00', calls: 5 },
      { time: '11:00', calls: 8 }
    ];
    
    render(<CallsChart data={data} />);
    expect(screen.getByTestId('chart-calls')).toBeInTheDocument();
    expect(screen.getByText('Appels des dernières 24h')).toBeInTheDocument();
  });
});
```

#### API Test Example
```typescript
// backend/supabase/functions/vapi-webhook/__tests__/webhook.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("webhook handles P1 emergency correctly", async () => {
  const payload = {
    type: 'call-ended',
    call: { id: 'test_call' },
    analysis: { 
      structuredData: { 
        description: 'inondation au sous-sol' 
      } 
    }
  };
  
  const response = await handleWebhook(payload);
  const result = await response.json();
  
  assertEquals(result.priority, 'P1');
  assertEquals(result.sla_seconds, 0);
});
```

---

## 🎯 Your First Contribution

### Good First Issues
Look for GitHub issues labeled:
- `good-first-issue` - Perfect for new contributors
- `documentation` - Help improve docs
- `frontend` / `backend` - Based on your strengths
- `bug` - Small bug fixes are great learning opportunities

### Suggested First Tasks
1. **Documentation**: Add JSDoc comments to a utility function
2. **Testing**: Write tests for an existing component
3. **UI**: Improve accessibility of a dashboard component
4. **Bug Fix**: Fix a small UI inconsistency
5. **Feature**: Add a new SMS template option

### Example First Contribution: Add JSDoc Documentation
```typescript
// Before: No documentation
function classifyPriority(description: string, value?: number) {
  // ... implementation
}

// After: Fully documented
/**
 * Classifies a service request priority based on description and estimated value.
 * 
 * Uses keyword matching and value thresholds to determine urgency level and SLA.
 * P1 emergencies trigger immediate SMS alerts to the team.
 * 
 * @param description - Customer's description of the problem
 * @param value - Estimated job value in CAD (optional)
 * @returns Priority classification with SLA timing
 * 
 * @example
 * ```typescript
 * // Emergency flooding case
 * const emergency = classifyPriority("inondation au sous-sol");
 * // Returns: { priority: 'P1', reason: 'urgence_immediate', sla_seconds: 0 }
 * 
 * // High-value job
 * const premium = classifyPriority("gainage complet", 4500);
 * // Returns: { priority: 'P3', reason: 'high_value', sla_seconds: 3600 }
 * ```
 */
function classifyPriority(description: string, value?: number): {
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  reason: string;
  sla_seconds: number;
} {
  // ... implementation
}
```

---

## 👥 Team Communication

### Channels
- **GitHub Issues**: Feature requests, bugs, discussions
- **Pull Requests**: Code review and collaboration
- **Email**: For sensitive topics or external communication

### Communication Best Practices
- **Be specific**: Include relevant context and error messages
- **Be respectful**: We're all learning and improving together
- **Ask questions**: Better to ask than to assume
- **Share knowledge**: Document solutions you find

### Getting Help
1. **Check documentation** first (this guide, README, code comments)
2. **Search existing issues** - your question might be answered
3. **Ask in appropriate channel** with context and specifics
4. **Pair program** with a team member for complex issues

---

## 📚 Additional Resources

### Documentation
- **[API Documentation](./API-DOCUMENTATION-TEMPLATE.yaml)**: Complete API reference
- **[Architecture Guide](../DEVOPS-IMPLEMENTATION-GUIDE.md)**: System design and infrastructure
- **[README](../README.md)**: Quick start and overview

### External Documentation
- **[VAPI Documentation](https://vapi.ai/docs)**: Voice AI platform
- **[Supabase Documentation](https://supabase.com/docs)**: Backend platform
- **[React Documentation](https://react.dev)**: Frontend framework
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)**: Type system

### Tools and References
- **[Drain Service Industry Guide](https://example.com)**: Business context
- **[French Canadian Voice Guide](https://example.com)**: Language and cultural context
- **[Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)**: WCAG 2.1 AA compliance

---

## ✅ Onboarding Completion Checklist

### Day 1: Setup Complete
- [ ] Repository cloned and dependencies installed
- [ ] Development environment configured and running  
- [ ] Tests pass successfully
- [ ] Can access frontend dashboard at localhost:3000
- [ ] Can access Supabase dashboard at localhost:54323
- [ ] Webhook endpoint responds to health checks

### Day 2: Ready to Contribute
- [ ] Understand system architecture and data flow
- [ ] Familiar with priority classification business logic
- [ ] Know Git workflow and branching strategy
- [ ] Can write and run tests
- [ ] Have picked up first issue to work on
- [ ] Comfortable asking questions and getting help

### First Week: Productive Contributor
- [ ] First pull request submitted and merged
- [ ] Participated in code review process
- [ ] Added documentation or tests
- [ ] Comfortable with development workflow
- [ ] Understanding business requirements and user needs

---

## 🚀 Next Steps

Congratulations! You're now ready to contribute to the Drain Fortin Production System. 

### Immediate Action Items
1. **Complete setup checklist** above
2. **Pick your first issue** from GitHub Issues
3. **Introduce yourself** to the team
4. **Schedule code walkthrough** with a senior developer

### Learning Path
- **Week 1**: Focus on small contributions and understanding
- **Week 2**: Take on larger features or complex bug fixes  
- **Month 1**: Contribute to architecture decisions and mentoring

### Career Growth
- **Technical Skills**: Full-stack TypeScript, cloud architecture, AI integration
- **Domain Knowledge**: Service industry, customer support, business operations
- **Soft Skills**: Code review, documentation, team collaboration

---

**Welcome to the team!** 🎉

*Questions about this guide? Open an issue or ask a team member.*

---

**Last Updated**: 2025-09-08  
**Next Review**: 2025-10-08  
**Maintained By**: Drain Fortin Development Team