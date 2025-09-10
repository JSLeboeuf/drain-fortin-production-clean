# 🚀 Drain Fortin - Production System

**Version**: 1.0.0  
**Status**: PRODUCTION READY  
**Last Updated**: 2025-09-08

## 📋 Overview

Complete production system for Drain Fortin's AI-powered voice assistant and customer management platform.

### Key Features
- 🤖 **VAPI Voice Assistant** - GPT-4o powered French voice agent
- 📞 **Twilio Integration** - Phone system and SMS alerts
- 💾 **Supabase Backend** - Real-time database and edge functions
- 🎨 **React Dashboard** - Modern admin interface
- 📊 **Real-time Analytics** - Call tracking and metrics
- 🔒 **Enterprise Security** - HMAC validation, rate limiting

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Customer      │────▶│  VAPI Cloud  │────▶│   Twilio    │
│   Phone Call    │     │  GPT-4o      │     │   Phone     │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │ Supabase Backend │
                    │  - Webhook       │
                    │  - Database      │
                    │  - Functions     │
                    └──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │ React Dashboard  │
                    │  - Analytics     │
                    │  - Monitoring    │
                    └──────────────────┘
```

## 🚦 Quick Start

### Prerequisites
- Node.js 20+ LTS
- npm 10+
- Supabase CLI
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/drain-fortin-production-clean.git
cd drain-fortin-production-clean
```

2. **Setup environment**
```bash
cp config/.env.example config/.env.production
# Edit .env.production with your credentials
```

3. **Install dependencies**
```bash
cd frontend && npm install && cd ..
```

4. **Deploy**
```bash
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
```

## 📁 Project Structure

```
drain-fortin-production-clean/
├── frontend/               # React dashboard
│   ├── src/               # Source code
│   ├── package.json       # Dependencies
│   └── vite.config.ts     # Build config
├── backend/               # Supabase backend
│   └── supabase/
│       ├── functions/     # Edge functions
│       └── migrations/    # Database schema
├── config/                # Configuration
│   ├── vapi-assistant.json
│   └── .env.example
├── scripts/               # Deployment scripts
│   └── deploy.ps1
└── docs/                  # Documentation
```

## 🔑 Environment Variables

Required variables in `config/.env.production`:

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# VAPI
VAPI_API_KEY=xxx
VAPI_WEBHOOK_SECRET=xxx
VAPI_ASSISTANT_ID=xxx

# Twilio
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+15145296037
```

## 📞 VAPI Configuration

The voice assistant is configured with:
- **Model**: GPT-4o-mini (low latency)
- **Voice**: ElevenLabs Adam (French)
- **Language**: French Canadian
- **Functions**: 5 custom business functions
- **Latency**: <200ms target

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
vercel --prod
```

### Backend (Supabase)
```bash
cd backend
supabase link --project-ref your-project-ref
supabase db push
supabase functions deploy vapi-webhook
```

### VAPI Assistant
1. Login to VAPI dashboard
2. Import `config/vapi-assistant.json`
3. Update webhook URL to Supabase function
4. Configure phone number

## 🧪 Testing

### Local Development
```bash
# Frontend
cd frontend
npm run dev

# Supabase local
cd backend
supabase start
```

### Production Tests
```bash
# Test webhook
curl -X POST https://your-project.supabase.co/functions/v1/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"health-check"}'

# Test phone
Call: +1 (514) 529-6037
```

## 📊 Monitoring

### Dashboard Access
- **URL**: https://your-frontend-url.vercel.app
- **Metrics**: Real-time calls, priorities, SMS alerts
- **Logs**: Supabase dashboard → Functions → Logs

### Key Metrics
- Call volume by hour/day
- Average call duration
- Priority distribution (P1-P4)
- SMS alert success rate
- Conversion rate

## 🔒 Security

### Implemented Measures
- ✅ HMAC signature validation
- ✅ Rate limiting (100 req/min)
- ✅ Environment variable isolation
- ✅ CORS configuration
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection

### Best Practices
- Rotate secrets quarterly
- Monitor Supabase RLS policies
- Review function logs daily
- Update dependencies monthly

## 📝 Business Rules

### Services
- ✅ **Accepted**: Débouchage, Racines, Gainage, Drain français
- ❌ **Refused**: Fosses septiques, Piscines, Gouttières

### Pricing
- Minimum: $350
- Rive-sud: +$100
- Emergency: +$75

### Priorities
- **P1**: Flooding (immediate SMS)
- **P2**: Municipal (2h SLA)
- **P3**: High value (1h SLA)
- **P4**: Standard (30min SLA)

## 🆘 Troubleshooting

### Common Issues

**Frontend not loading**
- Check .env variables
- Verify Supabase URL
- Clear browser cache

**Webhook not responding**
- Check function logs
- Verify HMAC secret
- Test with health-check

**SMS not sending**
- Verify Twilio credentials
- Check phone number format
- Review Twilio logs

## 📚 Documentation

- [Frontend Guide](docs/frontend.md)
- [Backend API](docs/api.md)
- [VAPI Integration](docs/vapi.md)
- [Deployment Guide](docs/deployment.md)

## 👥 Support

**Technical Support**
- Email: support@drainfortin.com
- Phone: +1 (514) 555-0123

**Emergency**
- On-call: +1 (514) 555-0911
- Escalation: management@drainfortin.com

## 📄 License

Copyright © 2025 Drain Fortin. All rights reserved.

---

**Built with** ❤️ **by Drain Fortin Development Team**