# Environment Variables Reference

This document lists all environment variables used in the codebase and where they're used.

## Next.js Application (.env.local)

These variables are used in the Next.js application (client and server):

### Required Variables

```bash
# Supabase (Client-side)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase (Server-side)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Email Notifications
RESEND_API_KEY=re_...
ADMIN_EMAIL=admin@yourdomain.com
```

### Optional Variables

```bash
# App URL (for email links, defaults to http://localhost:3000)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Development Auth Bypass (development only)
DEV_BYPASS_AUTH=true

# Node Environment (usually set automatically)
NODE_ENV=development
```

## Supabase Edge Functions

These variables are set via `supabase secrets set` command:

### Required Variables

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
```

### Optional Variables

```bash
# Twilio Webhook Base URL (defaults to SUPABASE_URL)
TWILIO_WEBHOOK_BASE_URL=https://xxx.supabase.co

# OpenAI (optional, for transcript generation)
OPENAI_API_KEY=sk-...

# Call Configuration
CALL_HOURS_START=9          # Default: 9 (9 AM)
CALL_HOURS_END=21           # Default: 21 (9 PM)
RETRY_DELAY_MINUTES=120     # Default: 120 (2 hours)
```

## Variable Usage by File

### Next.js Files

| Variable | Used In |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `lib/stripe-client.ts` |
| `STRIPE_SECRET_KEY` | `lib/stripe.ts` |
| `RESEND_API_KEY` | `lib/email.ts` |
| `ADMIN_EMAIL` | `lib/email.ts` |
| `NEXT_PUBLIC_APP_URL` | `lib/email.ts` |
| `DEV_BYPASS_AUTH` | `middleware.ts`, `app/(dashboard)/layout.tsx` |
| `NODE_ENV` | `middleware.ts`, `app/(dashboard)/layout.tsx` |

### Supabase Edge Functions

| Variable | Used In |
|----------|---------|
| `SUPABASE_URL` | All edge functions |
| `SUPABASE_SERVICE_ROLE_KEY` | All edge functions |
| `STRIPE_SECRET_KEY` | `stripe-webhook/index.ts`, `call-status/index.ts` |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook/index.ts` |
| `TWILIO_ACCOUNT_SID` | `initiate-call/index.ts`, `recording-status/index.ts` |
| `TWILIO_AUTH_TOKEN` | `initiate-call/index.ts`, `call-handler/index.ts`, `recording-status/index.ts` |
| `TWILIO_PHONE_NUMBER` | `initiate-call/index.ts` |
| `TWILIO_WEBHOOK_BASE_URL` | `initiate-call/index.ts`, `call-handler/index.ts`, `call-retry-scheduler/index.ts`, `stripe-webhook/index.ts` |
| `ANTHROPIC_API_KEY` | `call-handler/index.ts` |
| `OPENAI_API_KEY` | `recording-status/index.ts` (optional) |
| `CALL_HOURS_START` | `initiate-call/index.ts` |
| `CALL_HOURS_END` | `initiate-call/index.ts` |
| `RETRY_DELAY_MINUTES` | `call-status/index.ts` |

## Setting Up Environment Variables

### For Next.js (.env.local)

1. Create a `.env.local` file in the project root
2. Add all required variables from the "Next.js Application" section above
3. Restart your Next.js dev server

### For Supabase Edge Functions

Set secrets using the Supabase CLI:

```bash
# Set individual secrets
supabase secrets set SUPABASE_URL=https://xxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
# ... etc

# Or set from a file
supabase secrets set --env-file .env.supabase
```

## Common Issues

1. **Missing NEXT_PUBLIC_ prefix**: Client-side variables must have `NEXT_PUBLIC_` prefix
2. **Wrong variable names**: Check spelling (e.g., `SUPABASE_SERVICE_ROLE_KEY` not `SUPABASE_SERVICE_KEY`)
3. **Edge function secrets**: These are separate from Next.js env vars and must be set via `supabase secrets set`
4. **Development vs Production**: Use test keys for development, live keys for production

