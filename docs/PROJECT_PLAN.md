# VoiceVerify - Development Plan

**Status:** Ready to Start  
**Assignment Deadline:** TBD  
**Tech Stack:** Next.js 14 + TypeScript + Supabase + Stripe + Twilio

---

## Phase 1: Foundation (Start Here)

### 1.1 Environment Setup
- [ ] Install dependencies
- [ ] Configure environment variables (.env.local)
- [ ] Set up Supabase project
- [ ] Initialize shadcn/ui

### 1.2 Database Schema
- [ ] Create Supabase project
- [ ] Write migration for `orders` table
- [ ] Write migration for `payments` table  
- [ ] Write migration for `calls` table
- [ ] Apply migrations: `supabase db push`

### 1.3 Authentication
- [ ] Set up Supabase Auth
- [ ] Create login page
- [ ] Add middleware for protected routes
- [ ] Create admin user

---

## Phase 2: Core Functionality

### 2.1 Stripe Integration
- [ ] Install Stripe SDK
- [ ] Create lib/stripe.ts client
- [ ] Implement Payment Intent creation (manual capture)
- [ ] Create Supabase Edge Function: `stripe-webhook`
- [ ] Handle webhook events (idempotency with stripe_event_id)
- [ ] Test with Stripe CLI: `stripe listen --forward-to`

**Key Events:**
- `payment_intent.amount_capturable_updated` → authorize
- `payment_intent.succeeded` → paid
- `payment_intent.canceled` → cancelled
- `customer.subscription.created` → subscription
- `invoice.paid` → recurring payment

### 2.2 Twilio Integration  
- [ ] Install Twilio SDK
- [ ] Purchase Twilio phone number
- [ ] Create Supabase Edge Function: `initiate-call`
- [ ] Create Supabase Edge Function: `call-handler` (state machine)
- [ ] Create Supabase Edge Function: `call-status`
- [ ] Create Supabase Edge Function: `recording-status`
- [ ] Test with ngrok: `ngrok http 54321`

**State Machine Flow:**
1. ORDER_CONFIRMATION → "Your order of [items]?"
2. ADDRESS_CONFIRMATION → "Delivery to [address]?"
3. PAYMENT_CONFIRMATION → "[Payment type] to [card]?"
4. DELIVERY_TIME → "When would you like delivery?"
5. CALL_COMPLETE → Capture or cancel payment

### 2.3 Claude API Integration
- [ ] Install @anthropic-ai/sdk
- [ ] Create intent classification function
- [ ] Implement response extraction
- [ ] Add fallback keyword classification

**Intents:** CONFIRM, CHANGE, CANCEL, UNCLEAR

### 2.4 Order Creation Flow
- [ ] Create Next.js API route: `/api/orders`
- [ ] Implement order creation logic
- [ ] Create Stripe Payment Intent (manual capture)
- [ ] Store order + payment intent ID in database
- [ ] Trigger call when payment authorized

---

## Phase 3: Admin Interface

### 3.1 Layout & Navigation
- [ ] Create dashboard layout
- [ ] Add navigation sidebar
- [ ] Implement real-time connection status

### 3.2 Dashboard Page
- [ ] Show key metrics (orders today, active calls, success rate)
- [ ] Recent activity feed
- [ ] Quick actions

### 3.3 Orders List
- [ ] Table with orders (shadcn/ui Table component)
- [ ] Filters (status, payment status, date range)
- [ ] Real-time updates (Supabase Realtime)
- [ ] Actions (view details, retry call)

### 3.4 Order Detail Page
- [ ] Order information card
- [ ] Customer information
- [ ] Payment details (link to Stripe dashboard)
- [ ] Call history
- [ ] Conversation transcript
- [ ] Audio player for recording
- [ ] Actions (retry, cancel, manual callback)

### 3.5 Calls History
- [ ] Table with all calls
- [ ] Filters by outcome
- [ ] View transcript modal
- [ ] Play recording inline

---

## Phase 4: Supporting Features

### 4.1 Email Notifications (Resend)
- [ ] Install Resend SDK
- [ ] Create lib/email.ts
- [ ] Implement `notifyAdmin()` function
- [ ] Send email on max retries reached
- [ ] Send email on system errors

### 4.2 Call Retry Logic
- [ ] Create Supabase Edge Function: `call-retry-scheduler`
- [ ] Set up cron job (Supabase pg_cron)
- [ ] Query for pending retries
- [ ] Respect RETRY_DELAY_MINUTES env variable
- [ ] Max 1 retry per order

### 4.3 Post-Call Processing
- [ ] Download recording from Twilio
- [ ] Optional: Generate transcript with Whisper
- [ ] Store transcript in database
- [ ] Update order status based on call outcome

### 4.4 Payment Capture/Cancel
- [ ] Capture payment if confirmed
- [ ] Cancel payment if customer cancelled
- [ ] Handle payment failures gracefully

---

## Phase 5: Testing & Polish

### 5.1 Testing Checklist
- [ ] Test order creation → payment authorization
- [ ] Test full voice conversation flow
- [ ] Test all intents (CONFIRM, CHANGE, CANCEL)
- [ ] Test payment capture after confirmation
- [ ] Test payment cancellation
- [ ] Test no-answer retry (set RETRY_DELAY_MINUTES=5)
- [ ] Test admin UI real-time updates
- [ ] Test Stripe webhook idempotency
- [ ] Test subscription flow

### 5.2 Error Handling
- [ ] Claude API fallback (keyword classification)
- [ ] Twilio call failures
- [ ] Payment Intent expiration (7 days)
- [ ] Race condition: webhook before order
- [ ] Unclear customer responses

### 5.3 Security
- [ ] Stripe webhook signature verification
- [ ] Twilio request signature verification
- [ ] Supabase RLS policies
- [ ] Environment variables not committed
- [ ] .env.example file created

---

## Phase 6: Deployment

### 6.1 Supabase Production
- [ ] Create production Supabase project
- [ ] Run migrations on production
- [ ] Deploy Edge Functions
- [ ] Set production secrets
- [ ] Set up cron jobs

### 6.2 Vercel Deployment
- [ ] Link Vercel project
- [ ] Set environment variables in Vercel
- [ ] Deploy: `vercel --prod`
- [ ] Test production deployment

### 6.3 External Services
- [ ] Configure Stripe webhooks (production)
- [ ] Configure Twilio voice URLs (production)
- [ ] Verify Resend email sending
- [ ] Test end-to-end flow in production

---

## Implementation Order (Suggested)

**Week 1: Backend Foundation**
1. Database schema (Phase 1.2)
2. Stripe integration (Phase 2.1)
3. Basic order creation (Phase 2.4)

**Week 2: Voice System**
4. Twilio integration (Phase 2.2)
5. Claude integration (Phase 2.3)
6. Call state machine (Phase 2.2)

**Week 3: Admin UI**
7. Layout & navigation (Phase 3.1)
8. Dashboard (Phase 3.2)
9. Orders list (Phase 3.3)
10. Order detail (Phase 3.4)

**Week 4: Polish & Deploy**
11. Email notifications (Phase 4.1)
12. Call retry logic (Phase 4.2)
13. Testing (Phase 5)
14. Deployment (Phase 6)

---

## Environment Variables Needed

### Next.js (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
RESEND_API_KEY=
ADMIN_EMAIL=
```

### Supabase Edge Functions (supabase secrets set)
```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=  # Optional
CALL_HOURS_START=9
CALL_HOURS_END=21
RETRY_DELAY_MINUTES=120
MAX_RETRY_ATTEMPTS=1
```

---

## Quick Commands Reference

```bash
# Development
npm run dev                    # Start Next.js dev server
supabase start                 # Start local Supabase
supabase db reset              # Reset database with migrations
supabase functions serve       # Serve Edge Functions locally

# Testing
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
ngrok http 54321              # Expose local Supabase for Twilio

# Deployment
supabase db push              # Push migrations to remote
supabase functions deploy     # Deploy all Edge Functions
vercel --prod                 # Deploy Next.js to production

# Database
supabase migration new <name> # Create new migration
supabase db diff              # Show schema changes
```

---

## Critical Implementation Notes

1. **Payment Intent Flow:**
   - Always use `capture_method: 'manual'`
   - Never capture before call confirmation
   - Handle 7-day expiration

2. **Webhook Security:**
   - Always verify Stripe signatures
   - Always verify Twilio signatures
   - Use `stripe_event_id` for idempotency

3. **Supabase Edge Functions:**
   - Use for ALL external webhooks (Stripe, Twilio)
   - NOT for internal API calls
   - Set CORS headers if needed

4. **Next.js API Routes:**
   - Use for application logic only
   - NOT for external webhooks
   - Can call Supabase directly

5. **Real-time Updates:**
   - Use Supabase Realtime subscriptions
   - Subscribe to `orders` and `calls` tables
   - Handle reconnection gracefully

---

## Troubleshooting Common Issues

**Issue:** Stripe webhook not receiving events
- Check webhook URL in Stripe dashboard
- Verify signature verification is correct
- Check Supabase Edge Function logs

**Issue:** Twilio call not initiating
- Verify phone number format (+1234567890)
- Check calling hours (9 AM - 9 PM)
- Verify Twilio credentials

**Issue:** Claude API rate limits
- Implement keyword fallback classification
- Add retry logic with exponential backoff
- Consider caching common responses

**Issue:** Payment Intent expired
- Implement daily cleanup cron job
- Cancel expired Payment Intents
- Notify admin of cancelled orders

---

## Success Criteria (Assignment Rubric)

**Must-Have (35+ points to pass):**
- ✅ Outbound call works end-to-end
- ✅ STT → LLM → TTS pipeline functional
- ✅ Stripe webhooks with signature verification
- ✅ Payment Intent manual capture working
- ✅ Idempotent webhook handling
- ✅ One-time + subscription payments

**Nice-to-Have (45+ for strong candidate):**
- ✅ Retry logic for calls
- ✅ Clean code structure
- ✅ Good database schema
- ✅ Admin UI functional

**Target:** 45-55 points (Strong Candidate)

---

## Next Steps

1. Copy docs to your project
2. Set up `.clinerules` file
3. Start with Phase 1.1 (Environment Setup)
4. Ask Claude Code to help with each phase
5. Reference PRD.md and TECH_STACK.md frequently

**Ready to start coding!** 🚀
