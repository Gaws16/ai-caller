# VoiceVerify - AI-Powered Order Confirmation System

An automated voice calling system that contacts customers after online purchase to confirm order details through natural conversation.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- **Payments**: Stripe (Payment Intents with manual capture)
- **Voice**: Twilio Voice API
- **AI**: Claude API (Anthropic Sonnet 4) for intent classification
- **TTS**: ElevenLabs
- **Email**: Resend

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Stripe account
- Twilio account with phone number
- Claude API key
- ElevenLabs API key
- Resend API key (optional)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ai-caller
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in all the required values in `.env.local`

   **For quick testing without authentication**, add this to `.env.local`:

   ```bash
   DEV_BYPASS_AUTH=true
   ```

   ⚠️ **Warning:** Only use this in development! See [docs/TESTING.md](docs/TESTING.md) for more options.

4. **Set up Supabase**

   ```bash
   # Install Supabase CLI (if not already installed)
   npm install -g supabase

   # Initialize Supabase locally (optional, for local development)
   supabase start

   # Link to your remote project
   supabase link --project-ref your-project-ref

   # Push database migrations
   supabase db push
   ```

5. **Deploy Supabase Edge Functions**

   ```bash
   # Deploy all functions
   supabase functions deploy

   # Set secrets for Edge Functions
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   supabase secrets set TWILIO_AUTH_TOKEN=...
   # ... (set all other secrets from .env.example)
   ```

6. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ai-caller/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Admin dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities
│   ├── supabase/          # Supabase clients
│   ├── stripe.ts          # Stripe integration
│   └── email.ts           # Email notifications
├── supabase/
│   ├── functions/         # Edge Functions
│   └── migrations/        # Database migrations
└── docs/                  # Documentation
```

## Development

### Local Development with Webhooks

1. **Stripe Webhooks** (for testing Stripe events locally):

   ```bash
   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
   ```

2. **Twilio Webhooks** (for testing Twilio calls locally):
   ```bash
   ngrok http 54321
   # Use the ngrok URL in Twilio webhook configuration
   ```

### Database Migrations

```bash
# Create a new migration
supabase migration new <migration-name>

# Apply migrations locally
supabase db reset

# Push migrations to remote
supabase db push
```

### Edge Functions

```bash
# Serve functions locally
supabase functions serve

# Deploy a specific function
supabase functions deploy <function-name>

# Deploy all functions
supabase functions deploy
```

## Documentation

- [Product Requirements Document](docs/AI_Caller_Bot_PRD.md)
- [Technical Stack](docs/TECH_STACK.md)
- [Project Plan](docs/PROJECT_PLAN.md)
- [Testing Guide](docs/TESTING.md) - How to test without authentication

## Key Features

- ✅ Automated voice confirmation calls
- ✅ Payment Intent authorization → Call → Capture flow
- ✅ AI-powered intent classification
- ✅ Real-time admin dashboard
- ✅ Call retry logic
- ✅ Payment and subscription support

## License

Private - All rights reserved
