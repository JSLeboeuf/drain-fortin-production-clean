# 🔐 VERCEL ENVIRONMENT VARIABLES SETUP

**CRITICAL:** Configure these environment variables in Vercel Dashboard before deployment

## 🚀 Vercel Dashboard Configuration

1. Go to: https://vercel.com/dashboard/[your-project]/settings/environment-variables
2. Add the following variables for **Production** environment:

### Required Environment Variables

```bash
# Supabase Configuration (NEW KEYS - ROTATED)
SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
SUPABASE_ANON_KEY=[ROTATE - Use new Supabase anon key]
SUPABASE_SERVICE_ROLE_KEY=[ROTATE - Use new Supabase service key]

# VAPI Configuration (NEW KEYS - ROTATED)  
VAPI_PUBLIC_KEY=[USE: 90d42a7e-d880-43d5-8bf3-13ba99d04dfe]
VAPI_PRIVATE_KEY=[USE: e7eeb0e4-be53-4771-a1cb-9a4c11bab5f4]
VAPI_WEBHOOK_SECRET=drain-fortin-webhook-41641106bc69091fa79ec55b85986fb1

# Application Settings
NODE_ENV=production
APP_NAME=Drain Fortin CRM
APP_URL=https://your-vercel-domain.vercel.app
API_URL=https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1

# Phone Configuration
PHONE_NUMBER=+14502803222
PHONE_DISPLAY=+1 (450) 280-3222

# Feature Flags
ENABLE_SMS=true
ENABLE_VOICE_AI=true
ENABLE_ANALYTICS=true
ENABLE_DEBUG=false
```

### Frontend-Specific Variables (with VITE_ prefix)

```bash
# Frontend Environment (for build process)
VITE_SUPABASE_URL=https://phiduqxcufdmgjvdipyu.supabase.co
VITE_SUPABASE_ANON_KEY=[SAME AS SUPABASE_ANON_KEY]
VITE_VAPI_PUBLIC_KEY=[USE: 90d42a7e-d880-43d5-8bf3-13ba99d04dfe]
VITE_APP_ENV=production
VITE_APP_NAME=CRM Drain Fortin
VITE_LOG_LEVEL=error
```

## 🔑 SECURITY REMINDERS

- **✅ COMPLETED:** Old keys have been removed from codebase
- **✅ COMPLETED:** New keys generated using secure random methods
- **🔒 ACTION REQUIRED:** Update Supabase dashboard with new service role key
- **🔒 ACTION REQUIRED:** Update VAPI dashboard with new private key
- **🔒 ACTION REQUIRED:** Configure webhook endpoint with new secret

## 📋 Verification Checklist

- [ ] All environment variables configured in Vercel
- [ ] New keys updated in respective service dashboards
- [ ] No sensitive data in git repository
- [ ] .env files excluded from version control
- [ ] Security headers validated in vercel.json

## 🚨 Next Steps

1. **Complete A3.1:** Configure all variables in Vercel dashboard
2. **Complete A3.2:** Test frontend environment variable loading
3. **Complete A3.3:** Validate security headers are applied
4. **Execute Validation Gate A:** Run security scan