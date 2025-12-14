# CLAUDE.md

# .clinerules

## Project Context

This is VoiceVerify - an AI-powered order confirmation system.

**CRITICAL**: Always refer to docs/PRD.md, docs/TECH_STACK.md, and docs/PROJECT_PLAN.md before making ANY decisions or writing code.

## Tech Stack (MUST FOLLOW - NO EXCEPTIONS)

- Next.js 14+ (App Router) - TypeScript strict mode
- shadcn/ui components + Tailwind CSS
- Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- Stripe (Payment Intents with manual capture)
- Twilio Voice API
- Claude API (Anthropic Sonnet 4)
- ElevenLabs TTS
- Resend (email)

## Key Architectural Rules (READ BEFORE CODING)

1. Payment Intent MUST use capture_method: 'manual'
2. Payment flow: Authorize → Call → Capture (if confirmed) OR Cancel (if cancelled)
3. ALL external webhooks (Stripe, Twilio) → Supabase Edge Functions
4. Next.js API routes ONLY for internal application logic
5. Use Supabase Realtime subscriptions for admin UI updates
6. RETRY_DELAY_MINUTES is configurable (default 120, set to 5 for testing)
7. English only for MVP

## File Organization

- /app - Next.js App Router (pages, layouts, API routes)
- /components/ui - shadcn/ui components (copy-paste, not npm)
- /lib - Utilities (supabase client, stripe client, email)
- /supabase/functions - Edge Functions (stripe-webhook, call-handler, etc.)
- /supabase/migrations - Database schema SQL files

## Required Reading Before Implementation

**ALWAYS read these FIRST before implementing ANY feature:**

1. docs/PRD.md - Complete product requirements (Payment Intent flow, state machine)
2. docs/TECH_STACK.md - Technology patterns, package.json, configuration
3. docs/PROJECT_PLAN.md - Phase-by-phase implementation guide

## Development Workflow

1. Read relevant documentation sections FIRST
2. Follow the EXACT tech stack specified (no substitutions)
3. Write TypeScript with strict mode enabled
4. Test locally with Stripe CLI and ngrok
5. Verify webhook signatures (Stripe + Twilio)
6. Use idempotent webhook handling (stripe_event_id)
7. Ask for clarification if ANYTHING conflicts with PRD

## Code Style Rules

- Use async/await (never .then)
- Prefer Server Components (use 'use client' sparingly)
- Follow Next.js 14 App Router patterns
- Use Zod for all validation
- Use React Hook Form for forms
- Use cn() utility for className merging
- Never hardcode API keys (use env variables)

## Database Rules

- Use Supabase migrations (never manual SQL in UI)
- All foreign keys with ON DELETE CASCADE
- All timestamps: TIMESTAMP WITH TIME ZONE
- Use JSONB for flexible data (responses, items)
- Enable Row Level Security (RLS)

## Webhook Rules

- ALWAYS verify signatures (Stripe + Twilio)
- ALWAYS check idempotency (stripe_event_id)
- ALWAYS return 200 OK quickly (don't timeout)
- Handle retries gracefully
- Log all webhook events

## When Stuck

1. Re-read the relevant section of PRD.md
2. Check TECH_STACK.md for examples
3. Check PROJECT_PLAN.md for phase order
4. Ask for clarification (don't guess)
   This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

This is a Next.js 16 project using the App Router pattern with TypeScript and Tailwind CSS 4.

### Project Structure

- `app/` - App Router pages and layouts
  - `layout.tsx` - Root layout with Geist font configuration
  - `page.tsx` - Home page
  - `globals.css` - Global styles and Tailwind imports
- `public/` - Static assets

### Key Technologies

- **Next.js 16** with App Router
- **React 19**
- **TypeScript** with strict mode
- **Tailwind CSS 4** via PostCSS

### Path Aliases

`@/*` maps to the project root (configured in tsconfig.json).
