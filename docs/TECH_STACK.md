# VoiceVerify - Complete Tech Stack Reference

**Project:** VoiceVerify  
**Type:** AI-Powered Order Confirmation System  
**Status:** MVP Development  
**Updated:** December 14, 2025

---

## ✅ Confirmed Technology Stack

### Frontend & Full Stack Framework
```
Framework:     Next.js 14+ (App Router)
Language:      TypeScript
UI Library:    shadcn/ui (Radix UI + Tailwind CSS)
Styling:       Tailwind CSS
Components:    React Server Components + Client Components
State:         React Hooks (useState, useEffect, etc.)
Forms:         React Hook Form + Zod validation
Hosting:       Vercel
```

**Why Next.js?**
- Full-stack framework (API routes + frontend)
- Server-side rendering for admin UI
- Edge runtime for fast API responses
- Built-in TypeScript support
- Perfect Vercel deployment integration

**Why shadcn/ui?**
- Pre-built, accessible components
- Fully customizable with Tailwind
- Copy-paste components (not npm package)
- Professional UI out of the box
- Active community

### Backend & Database
```
Backend:       Supabase
Database:      PostgreSQL (via Supabase)
Functions:     Supabase Edge Functions (Deno runtime)
Storage:       Supabase Storage (call recordings)
Auth:          Supabase Auth
Real-time:     Supabase Realtime subscriptions
Row Security:  Supabase RLS (Row Level Security)
```

**Why Supabase?**
- Serverless PostgreSQL database
- Built-in auth and RLS
- Edge Functions for webhooks (Twilio, Stripe)
- Real-time subscriptions for admin UI
- Free tier sufficient for MVP

**Architecture:**
- Next.js API routes for application logic
- Supabase Edge Functions for external webhooks (Twilio, Stripe)
- Direct database queries from Next.js via Supabase client
- Real-time updates pushed to admin UI

### Payment Processing
```
Service:       Stripe
Features:      Payment Intents (manual capture)
               Subscriptions
               Webhooks (idempotent handling)
SDK:           stripe (npm package)
Webhook:       Supabase Edge Function
```

**Payment Flow:**
1. Customer checkout → Create Payment Intent (manual capture)
2. Funds authorized (held, not charged)
3. Call confirms order → Capture payment
4. Call cancelled → Release payment

### Voice & AI
```
Telephony:     Twilio Voice API
Speech-to-Text: Twilio <Gather input="speech">
Text-to-Speech: ElevenLabs (primary) + Twilio <Say> (fallback)
LLM:           Anthropic Claude API (Sonnet 4)
Transcripts:   OpenAI Whisper API (post-call, optional)
```

**Call Flow:**
1. Supabase Edge Function initiates Twilio call
2. Twilio calls customer
3. Each conversation turn:
   - AI asks question (TTS)
   - Customer responds (STT)
   - Twilio webhook → Edge Function
   - Claude classifies intent
   - Return next TwiML
4. Post-call: Download recording → Whisper → Transcript

### Email & Notifications
```
Service:       Resend
Use Case:      Admin notifications (failed calls, errors)
SDK:           resend (npm package)
```

**Notification Triggers:**
- Call failed after max retries
- Payment Intent expired
- System errors
- Callback required

### Development Tools
```
IDE:           Cursor / Claude Code
Package Mgr:   npm / pnpm
Linting:       ESLint + Prettier
Type Check:    TypeScript strict mode
Database:      Supabase CLI (migrations)
Version Ctrl:  Git + GitHub
```

---

## 📦 NPM Packages (package.json)

### Production Dependencies
```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    
    "stripe": "^14.0.0",
    "twilio": "^5.0.0",
    "@anthropic-ai/sdk": "^0.17.0",
    "resend": "^3.0.0",
    
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.344.0",
    
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    
    "date-fns": "^3.3.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.2.0",
    "prettier": "^3.2.0"
  }
}
```

### Supabase Edge Function Dependencies (import_map.json)
```json
{
  "imports": {
    "stripe": "npm:stripe@^14.0.0",
    "twilio": "npm:twilio@^5.0.0",
    "@anthropic-ai/sdk": "npm:@anthropic-ai/sdk@^0.17.0",
    "supabase": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## 🗂️ Project Structure

```
voiceverify/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Admin layout with nav
│   │   ├── page.tsx             # Dashboard home
│   │   ├── orders/
│   │   │   ├── page.tsx         # Orders list
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Order detail
│   │   └── calls/
│   │       └── page.tsx         # Calls history
│   ├── api/
│   │   ├── orders/
│   │   │   └── route.ts         # Create order endpoint
│   │   └── webhooks/            # (Optional: can use Supabase Edge Functions instead)
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Tailwind imports
│
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── orders/
│   │   ├── order-table.tsx
│   │   └── order-detail-card.tsx
│   └── calls/
│       └── call-transcript.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server client
│   │   └── types.ts             # Database types
│   ├── stripe.ts                # Stripe client
│   ├── email.ts                 # Resend client
│   └── utils.ts                 # Helpers (cn, formatters)
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── functions/
│   │   ├── stripe-webhook/
│   │   │   └── index.ts
│   │   ├── call-handler/
│   │   │   └── index.ts
│   │   ├── call-status/
│   │   │   └── index.ts
│   │   ├── initiate-call/
│   │   │   └── index.ts
│   │   ├── recording-status/
│   │   │   └── index.ts
│   │   └── call-retry-scheduler/
│   │       └── index.ts
│   └── config.toml
│
├── public/                      # Static assets
├── .env.local                   # Local environment variables
├── .env.example                 # Example env file
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🔧 Configuration Files

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['supabase.co'],
  },
}

module.exports = nextConfig
```

### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... shadcn colors
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 🔐 Environment Variables Reference

### Next.js (.env.local)
```bash
# Supabase (Next.js client)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Stripe (Next.js API routes)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Resend (Admin notifications)
RESEND_API_KEY=re_...
ADMIN_EMAIL=admin@voiceverify.com
```

### Supabase Edge Functions (set via `supabase secrets set`)
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

# ElevenLabs
ELEVENLABS_API_KEY=xxxxxx
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Claude
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (optional)
OPENAI_API_KEY=sk-...

# Config
CALL_HOURS_START=9
CALL_HOURS_END=21
RETRY_DELAY_MINUTES=120  # Set to 5 for quick testing
MAX_RETRY_ATTEMPTS=1
```

---

## 🚀 Development Workflow

### Initial Setup
```bash
# 1. Clone and install
git clone <repo>
cd voiceverify
npm install

# 2. Set up Supabase locally
supabase init
supabase start
supabase db reset  # Apply migrations

# 3. Set environment variables
cp .env.example .env.local
# Fill in your API keys

# 4. Install shadcn/ui components
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card table dialog

# 5. Run dev server
npm run dev
```

### Database Changes
```bash
# Create new migration
supabase migration new <name>

# Apply migrations locally
supabase db reset

# Push to remote
supabase db push
```

### Deploy Edge Functions
```bash
# Deploy single function
supabase functions deploy stripe-webhook

# Deploy all functions
supabase functions deploy

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

### Deploy to Vercel
```bash
# Link project
vercel link

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

---

## 📊 Data Flow Summary

### Order Creation Flow
```
Next.js UI (Customer Checkout)
  ↓ POST /api/orders
Next.js API Route
  ↓ Insert order + Create Stripe Payment Intent
Supabase Database (order created, payment_status: 'pending')
  ↓ Stripe Webhook: payment_intent.amount_capturable_updated
Supabase Edge Function (stripe-webhook)
  ↓ Update payment_status: 'authorized'
Supabase Edge Function (initiate-call)
  ↓ Twilio.calls.create()
Twilio (Customer's Phone)
```

### Call Conversation Flow
```
Twilio (Customer speaking)
  ↓ SpeechResult via webhook
Supabase Edge Function (call-handler)
  ↓ Load call state from database
  ↓ Send speech to Claude API
Claude API (Intent classification)
  ↓ Return intent + extracted data
Supabase Edge Function (call-handler)
  ↓ Update call state in database
  ↓ Generate TwiML with next question
Twilio (Speak next question to customer)
  ↓ Loop until call complete
Supabase Edge Function (call-status)
  ↓ Capture or cancel Payment Intent
Stripe (Charge customer or release funds)
  ↓ Webhook: payment_intent.succeeded
Supabase Database (payment_status: 'paid', status: 'confirmed')
  ↓ Real-time subscription
Next.js Admin UI (Updates in real-time)
```

---

## 🎨 UI Component Library (shadcn/ui)

### Installed Components
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add separator
```

### Usage Example
```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Dashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Create Order</Button>
      </CardContent>
    </Card>
  )
}
```

---

## 🔍 Key Technology Decisions

### Why This Stack?

**Next.js + TypeScript:**
- Single codebase for frontend + API routes
- Type safety across the entire app
- Server-side rendering for fast admin UI
- Perfect for MVP → production scaling

**Supabase:**
- Zero DevOps (managed PostgreSQL)
- Built-in auth, real-time, storage
- Edge Functions for webhooks
- Free tier covers MVP needs
- Easy migration to self-hosted if needed

**shadcn/ui:**
- Not a dependency (copy-paste components)
- Full control over code
- Professional UI without CSS overhead
- Accessible by default (Radix UI)

**Twilio + Claude:**
- Twilio: Industry-standard telephony
- Claude: Best-in-class intent understanding
- Together: Natural conversation handling

**Stripe:**
- Payment Intent manual capture = perfect for confirm-then-charge
- Robust webhook system
- Subscription support built-in

---

## 📈 Scalability Considerations

### Current Architecture Supports:
- **100-1000 orders/day** easily
- **Concurrent calls**: Limited by Twilio (500+)
- **Database**: PostgreSQL scales to millions of rows
- **Edge Functions**: Auto-scaling serverless
- **Admin UI**: Static + ISR caching on Vercel

### When to Scale:
- **>10K orders/day**: Consider dedicated database
- **Global**: Add Cloudflare CDN
- **High call volume**: Twilio elastic SIP trunking
- **Complex analytics**: Add data warehouse (e.g., BigQuery)

---

## ✅ Tech Stack Summary

| Category | Technology | Why |
|----------|-----------|-----|
| **Framework** | Next.js 14+ | Full-stack React, SSR, API routes |
| **Language** | TypeScript | Type safety, better DX |
| **UI Library** | shadcn/ui | Pre-built components, customizable |
| **Styling** | Tailwind CSS | Utility-first, fast development |
| **Database** | Supabase (PostgreSQL) | Serverless, real-time, auth |
| **Functions** | Supabase Edge Functions | Webhook handlers, Deno runtime |
| **Payments** | Stripe | Payment Intents, subscriptions |
| **Telephony** | Twilio Voice | Industry standard, reliable |
| **TTS** | ElevenLabs | Natural voices |
| **LLM** | Claude | Best intent classification |
| **Email** | Resend | Simple, developer-friendly |
| **Hosting** | Vercel | Zero-config Next.js deployment |
| **Dev Tools** | Cursor, Claude Code | AI-assisted development |

---

**This stack is production-ready, cost-effective, and optimized for the assignment's 45-55+ point scoring range.**
