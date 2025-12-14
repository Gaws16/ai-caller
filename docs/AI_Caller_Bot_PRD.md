# Product Requirements Document: VoiceVerify

**Version:** 1.0  
**Date:** December 14, 2025  
**Status:** Draft  
**Project Type:** MVP Assignment  
**Project Name:** VoiceVerify

---

## Executive Summary

An automated voice calling system that contacts customers after online purchase to confirm order details through natural conversation. The system uses AI to understand spoken responses, validates payment status via Stripe integration, and provides real-time order status updates through a minimal admin interface.

### Key Innovation
Uses **Payment Intent Authorization → Voice Confirmation → Payment Capture** flow, ensuring customers are only charged for confirmed orders while maintaining funds security during the call process.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Goals & Success Metrics](#goals--success-metrics)
3. [User Personas](#user-personas)
4. [System Architecture](#system-architecture)
5. [Core Workflows](#core-workflows)
6. [Technical Specifications](#technical-specifications)
7. [Database Schema](#database-schema)
8. [API Integrations](#api-integrations)
9. [Security & Compliance](#security--compliance)
10. [Admin Interface](#admin-interface)
11. [Error Handling & Edge Cases](#error-handling--edge-cases)
12. [Testing Strategy](#testing-strategy)
13. [Deployment & Operations](#deployment--operations)
14. [Future Enhancements](#future-enhancements)
15. [Appendices](#appendices)

---

## Problem Statement

Online stores need to verify order details with customers to reduce:
- **Delivery failures** due to incorrect addresses
- **Payment disputes** from unauthorized purchases
- **Customer service overhead** from preventable issues
- **Returns and cancellations** after shipment

Manual calling is expensive and doesn't scale. Existing automated systems lack natural conversation capabilities and fail to handle complex customer responses.

---

## Goals & Success Metrics

### Primary Goals
1. **Automate order confirmation** via voice calls within 5 minutes of purchase
2. **Reduce order cancellations** by catching issues before fulfillment
3. **Improve payment accuracy** by confirming payment methods with customers
4. **Provide audit trail** of all customer interactions

### Success Metrics (MVP)
- ✅ **Call success rate**: >80% of calls reach customers
- ✅ **Confirmation rate**: >70% of reached customers confirm orders
- ✅ **System uptime**: 99% availability
- ✅ **Average call duration**: <2 minutes
- ✅ **Payment capture success**: >95% for confirmed orders

### Non-Goals (Out of Scope for MVP)
- ❌ Inbound customer calls
- ❌ Multi-language support (English only for MVP)
- ❌ Complex scheduling (e.g., customer preferences for call times)
- ❌ Integration with shipping providers
- ❌ Advanced analytics dashboard

---

## User Personas

### 1. Online Customer (Call Recipient)
- **Age**: 25-65
- **Tech savvy**: Moderate to high (comfortable with online shopping)
- **Needs**:
  - Quick, non-intrusive confirmation
  - Ability to make changes easily
  - Clear understanding of what's being confirmed
- **Pain points**:
  - Doesn't want robocalls
  - May be busy when called
  - Concerned about payment security

### 2. Store Administrator
- **Role**: Operations manager, customer service lead
- **Needs**:
  - Real-time visibility into order confirmations
  - Ability to handle failed calls manually
  - Audit trail for payment disputes
- **Pain points**:
  - Too many systems to monitor
  - Lacks technical expertise for troubleshooting
  - Needs quick access to call recordings

### 3. Store Owner (Stakeholder)
- **Needs**:
  - Reduced operational costs
  - Fewer payment disputes
  - Better customer satisfaction
- **Pain points**:
  - High return rates
  - Payment processing fees on cancelled orders
  - Customer service overhead

---

## System Architecture

### High-Level Architecture

```
┌─────────────────┐
│  E-commerce     │
│  Website        │
└────────┬────────┘
         │ Order Created
         ↓
┌─────────────────────────────────────────────────────────┐
│  Supabase Backend                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Orders DB  │  │  Payments DB │  │   Calls DB   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         ↕                  ↕                  ↕         │
│  ┌─────────────────────────────────────────────────┐  │
│  │         Supabase Edge Functions                 │  │
│  │  • Order Handler                                │  │
│  │  • Stripe Webhook Handler                       │  │
│  │  • Twilio Call Handler (State Machine)          │  │
│  │  • Call Scheduler                               │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ↕                  ↕                  ↕
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Stripe API    │  │  Twilio Voice  │  │  Claude API    │
│                │  │                │  │                │
│ • Payment      │  │ • Outbound     │  │ • Intent       │
│   Intents      │  │   Calls        │  │   Classification│
│ • Webhooks     │  │ • Speech       │  │                │
│ • Capture      │  │   Recognition  │  │                │
│ • Refunds      │  │ • TTS          │  │                │
└────────────────┘  └────────────────┘  └────────────────┘
         ↕
┌────────────────┐
│  ElevenLabs    │
│  (TTS)         │
└────────────────┘
         ↕
┌────────────────────────────────────────┐
│  Admin UI (Next.js on Vercel)          │
│  • Order Dashboard                     │
│  • Call History                        │
│  • Payment Status                      │
│  • Transcripts                         │
└────────────────────────────────────────┘
```

### Component Breakdown

#### 1. **Supabase Backend**
- **Database**: PostgreSQL with real-time subscriptions
- **Authentication**: Supabase Auth for admin access
- **Edge Functions**: Serverless handlers for webhooks and orchestration
- **Storage**: Call recordings and transcripts

#### 2. **Payment Processing (Stripe)**
- Payment Intent creation with manual capture
- Webhook handling for payment events
- Subscription management
- Refund processing

#### 3. **Voice Infrastructure (Twilio)**
- Outbound call initiation
- Speech-to-text (built-in or Deepgram)
- Text-to-speech (Twilio Say + ElevenLabs for critical prompts)
- Call recording

#### 4. **AI Processing**
- **Claude API**: Intent classification and conversation logic
- **Whisper API** (optional): Post-call transcript generation

#### 5. **Admin Interface**
- Next.js application
- Real-time updates via Supabase subscriptions
- Deployed on Vercel

---

## Core Workflows

### Workflow 1: New Order → Authorized Payment → Call Trigger

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Customer completes checkout on website                   │
│    • Selects products, quantity                             │
│    • Enters delivery address                                │
│    • Chooses payment type (one-time or subscription)        │
│    • Enters payment details                                 │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Website backend creates order in Supabase                │
│    POST /api/orders                                          │
│    {                                                         │
│      customer_name, phone, address, items,                  │
│      payment_type: "one_time" | "subscription",             │
│      amount, currency                                       │
│    }                                                         │
│    → Order created with status: 'pending'                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Edge Function: Create Stripe Payment Intent              │
│    stripe.paymentIntents.create({                           │
│      amount, currency,                                       │
│      payment_method,                                         │
│      capture_method: 'manual',  ← KEY: Don't charge yet!   │
│      confirm: true                                           │
│    })                                                        │
│    → Payment Intent ID stored in database                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Stripe Webhook: payment_intent.amount_capturable_updated │
│    → Funds AUTHORIZED (held on customer's card)             │
│    → Update order: payment_status = 'authorized'            │
│    → Store payment method details (brand, last4)            │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Trigger Confirmation Call                                │
│    • Check calling hours (9 AM - 9 PM local time)           │
│    • If outside hours: schedule for next morning            │
│    • If within hours: initiate call immediately             │
│    → Create call record with status: 'initiated'            │
└─────────────────────────────────────────────────────────────┘
```

### Workflow 2: Voice Conversation State Machine

```
┌─────────────────────────────────────────────────────────────┐
│ CALL INITIATED                                              │
│ • Twilio dials customer's phone                             │
│ • Call record: current_step = null                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ TURN 1: Order Confirmation                                  │
│                                                              │
│ AI: "Hello! This is [Store Name] calling to confirm your    │
│      order of [items]. Is this correct?"                    │
│                                                              │
│ Customer speaks → Twilio captures speech → Webhook          │
│                                                              │
│ Edge Function:                                              │
│ 1. Receive SpeechResult: "yes, that's correct"              │
│ 2. Call Claude API for intent classification:              │
│    → Intent: CONFIRM                                        │
│ 3. Update call: current_step = 'ADDRESS_CONFIRMATION'       │
│ 4. Return TwiML with next question                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ TURN 2: Address Confirmation                                │
│                                                              │
│ AI: "Your delivery address is [address]. Is this correct?"  │
│                                                              │
│ Customer speaks → Webhook                                   │
│                                                              │
│ Edge Function:                                              │
│ 1. Receive SpeechResult: "no, change to 123 Main Street"    │
│ 2. Call Claude for intent: CHANGE                           │
│ 3. Extract new address using Claude                         │
│ 4. Store in call.responses: { new_address: "123 Main St" }  │
│ 5. Update current_step = 'PAYMENT_CONFIRMATION'             │
│ 6. Return TwiML with next question                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ TURN 3: Payment Method Confirmation                         │
│                                                              │
│ IF one_time:                                                │
│   AI: "Your payment of $X will be charged to your           │
│        [Visa ending in 4242]. Is this correct?"             │
│                                                              │
│ IF subscription:                                            │
│   AI: "Your monthly subscription of $X will be charged to   │
│        your [Mastercard ending in 1234]. Is this correct?"  │
│                                                              │
│ Customer speaks → Webhook                                   │
│                                                              │
│ Edge Function:                                              │
│ 1. Receive SpeechResult: "yes"                              │
│ 2. Claude intent: CONFIRM                                   │
│ 3. Update current_step = 'DELIVERY_TIME'                    │
│ 4. Return TwiML with next question                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ TURN 4: Delivery Timing                                     │
│                                                              │
│ AI: "When would you prefer delivery? Morning, afternoon,    │
│      or evening?"                                           │
│                                                              │
│ Customer speaks → Webhook                                   │
│                                                              │
│ Edge Function:                                              │
│ 1. Receive SpeechResult: "morning please"                   │
│ 2. Claude extracts: delivery_time = "morning"               │
│ 3. Update current_step = 'CALL_COMPLETE'                    │
│ 4. Return TwiML: "Thank you! Your order is confirmed.       │
│                   We'll deliver in the morning." + Hangup   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ POST-CALL PROCESSING                                        │
│                                                              │
│ 1. Twilio status callback: call completed                   │
│ 2. Determine outcome based on responses:                    │
│    • All confirmed → 'confirmed'                            │
│    • Address changed → 'changed'                            │
│    • Customer cancelled → 'cancelled'                       │
│                                                              │
│ 3. IF confirmed or changed:                                 │
│    • Capture Payment Intent via Stripe API                  │
│    • Update order with any changes                          │
│    • Set order status accordingly                           │
│                                                              │
│ 4. IF cancelled:                                            │
│    • Cancel Payment Intent via Stripe API                   │
│    • Release funds to customer                              │
│    • Set order status = 'cancelled'                         │
│                                                              │
│ 5. Download recording from Twilio                           │
│ 6. (Optional) Generate transcript via Whisper              │
│ 7. Store transcript in database                             │
└─────────────────────────────────────────────────────────────┘
```

### Workflow 3: No Answer / Retry Logic

```
┌─────────────────────────────────────────────────────────────┐
│ CALL ATTEMPT 1: No Answer                                   │
│ • Twilio status: 'no-answer' or 'busy'                      │
│ • Update call: outcome = 'no-answer', retry_count = 0       │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ SCHEDULE RETRY                                              │
│ • Calculate next_retry_at = now + 2 hours                   │
│ • Store in database                                         │
│ • Keep Payment Intent on hold (funds still authorized)      │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (2 hours later)
┌─────────────────────────────────────────────────────────────┐
│ CRON JOB: Check for pending retries                         │
│ • Query calls where:                                        │
│   - outcome = 'no-answer'                                   │
│   - retry_count < 1                                         │
│   - next_retry_at <= now                                    │
│ • Initiate new call                                         │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ CALL ATTEMPT 2: Still No Answer                             │
│ • Update call: retry_count = 1                              │
│ • Set order status = 'callback-required'                    │
│ • Notify admin via email/Slack                              │
│ • Payment Intent remains authorized (manual resolution)     │
└─────────────────────────────────────────────────────────────┘
```

### Workflow 4: Stripe Subscription Events

```
┌─────────────────────────────────────────────────────────────┐
│ SUBSCRIPTION CREATED                                        │
│ Webhook: customer.subscription.created                      │
│ • Store subscription_id in payments table                   │
│ • Link to order                                             │
│ • Initial invoice is handled by payment_intent flow above   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ RECURRING BILLING (Monthly)                                 │
│ Webhook: invoice.paid                                       │
│ • Create new payment record                                 │
│ • Link to original order OR create recurring order          │
│ • No call needed (subscription already confirmed)           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PAYMENT FAILURE                                             │
│ Webhook: invoice.payment_failed                             │
│ • Update subscription status: 'past_due'                    │
│ • Send notification to customer                             │
│ • (Optional) Suspend service after X failures               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SUBSCRIPTION CANCELLED                                      │
│ Webhook: customer.subscription.deleted                      │
│ • Update subscription status: 'cancelled'                   │
│ • Stop future billing                                       │
│ • Keep historical records                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Specifications

### Tech Stack

#### Core Framework
- **Full Stack**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Components**: shadcn/ui (built on Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **Hosting**: Vercel

#### Backend & Database
- **Backend**: Supabase (Database, Auth, Edge Functions, Storage)
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Supabase Realtime subscriptions
- **Development**: Cursor / Claude Code

#### Payments & Voice
- **Payments**: Stripe (Payment Intents, Subscriptions, Webhooks)
- **Telephony**: Twilio Voice API
- **Speech-to-Text**: Twilio built-in (fallback: Deepgram)
- **Text-to-Speech**: ElevenLabs (primary), Twilio Say (fallback)
- **LLM**: Anthropic Claude (intent classification, response extraction)
- **Transcription**: OpenAI Whisper (post-call, optional)

#### Email & Notifications
- **Email**: Resend (admin notifications)

### API Rate Limits & Costs

| Service | Rate Limit | Cost (Approx) |
|---------|------------|---------------|
| Twilio Voice | 500 concurrent calls | $0.013/min |
| ElevenLabs TTS | 10,000 chars/month (free tier) | $0.18/1000 chars after |
| Claude API | 50 requests/min (Tier 1) | $3/MTok (input), $15/MTok (output) |
| Whisper API | 50 requests/min | $0.006/min of audio |
| Stripe | No limit | 2.9% + $0.30 per transaction |
| Supabase Edge | 500 req/sec | Included in plan |

### Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Twilio
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_BASE_URL=https://xxx.supabase.co/functions/v1

# ElevenLabs
ELEVENLABS_API_KEY=xxxxxx
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel voice

# Claude
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (optional, for Whisper)
OPENAI_API_KEY=sk-...

# Resend (Email Notifications)
RESEND_API_KEY=re_...
ADMIN_EMAIL=admin@voiceverify.com

# App Config
CALL_HOURS_START=9  # 9 AM
CALL_HOURS_END=21   # 9 PM
RETRY_DELAY_MINUTES=120  # 2 hours (configurable for testing - can set to 5 for quick tests)
MAX_RETRY_ATTEMPTS=1
NODE_ENV=development|production
```

---

## Database Schema

### Tables

#### 1. `orders`

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Customer Info
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  
  -- Order Details
  items JSONB NOT NULL,  -- [{ name, quantity, price }, ...]
  total_amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  delivery_address TEXT NOT NULL,
  delivery_instructions TEXT,
  delivery_time_preference TEXT,  -- 'morning', 'afternoon', 'evening'
  
  -- Payment
  payment_type TEXT NOT NULL CHECK (payment_type IN ('one_time', 'subscription')),
  payment_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'authorized', 'paid', 'failed', 'cancelled', 'refunded')),
  payment_method_brand TEXT,  -- 'visa', 'mastercard', etc.
  payment_method_last4 TEXT,
  
  -- Order Status
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'changed', 'cancelled', 'no-answer', 'callback-required')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  CONSTRAINT valid_phone CHECK (customer_phone ~ '^\+?[1-9]\d{1,14}$')
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_phone ON orders(customer_phone);
```

#### 2. `payments`

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Stripe IDs (for idempotency)
  stripe_event_id TEXT UNIQUE NOT NULL,  -- e.g., 'evt_1234567890'
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  
  -- Payment Details
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  
  -- Payment Method
  payment_method_id TEXT,
  payment_method_details JSONB,  -- { brand, last4, exp_month, exp_year }
  
  -- Subscription Info (if applicable)
  subscription_interval TEXT,  -- 'month', 'year'
  subscription_status TEXT,  -- 'active', 'past_due', 'cancelled'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  CONSTRAINT unique_stripe_event UNIQUE(stripe_event_id)
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_stripe_subscription ON payments(stripe_subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
```

#### 3. `calls`

```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Twilio Info
  twilio_call_sid TEXT UNIQUE,
  twilio_recording_sid TEXT,
  twilio_recording_url TEXT,
  
  -- Call Timing
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Call State
  current_step TEXT,  -- 'ORDER_CONFIRMATION', 'ADDRESS_CONFIRMATION', etc.
  outcome TEXT CHECK (outcome IN ('confirmed', 'changed', 'cancelled', 'no-answer', 'callback-required', 'failed')),
  
  -- Conversation Data
  responses JSONB DEFAULT '{}',  -- { order_confirmation: 'yes', new_address: '...', ... }
  transcript TEXT,
  
  -- Retry Logic
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_calls_order_id ON calls(order_id);
CREATE INDEX idx_calls_twilio_sid ON calls(twilio_call_sid);
CREATE INDEX idx_calls_outcome ON calls(outcome);
CREATE INDEX idx_calls_retry ON calls(next_retry_at) WHERE outcome = 'no-answer' AND retry_count < 1;
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);
```

#### 4. `call_logs` (Optional, for debugging)

```sql
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  
  -- Log Entry
  step TEXT NOT NULL,
  speech_input TEXT,
  classified_intent TEXT,
  ai_response TEXT,
  
  -- Timing
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processing_time_ms INTEGER
);

CREATE INDEX idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX idx_call_logs_timestamp ON call_logs(timestamp DESC);
```

### Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Admin access (authenticated users with admin role)
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view all calls"
  ON calls FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Service role (Edge Functions) can do anything
-- (No policies needed as service role bypasses RLS)
```

### Database Functions

#### Function: Update order status based on call outcome

```sql
CREATE OR REPLACE FUNCTION update_order_from_call()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.outcome IS NOT NULL AND OLD.outcome IS NULL THEN
    UPDATE orders
    SET 
      status = NEW.outcome,
      updated_at = now(),
      confirmed_at = CASE 
        WHEN NEW.outcome IN ('confirmed', 'changed') THEN now()
        ELSE NULL
      END
    WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_from_call
  AFTER UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_order_from_call();
```

#### Function: Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_calls_updated_at
  BEFORE UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

### 5. Email Notifications (Resend)

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function notifyAdmin(orderId: string, reason: string) {
  const order = await supabase
    .from('orders')
    .select('*, calls(*)')
    .eq('id', orderId)
    .single();

  await resend.emails.send({
    from: 'VoiceVerify <notifications@voiceverify.com>',
    to: process.env.ADMIN_EMAIL!,
    subject: `Action Required: Order ${orderId.substring(0, 8)}`,
    html: `
      <h2>Call Failed - Manual Action Required</h2>
      <p><strong>Reason:</strong> ${reason}</p>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Customer:</strong> ${order.data.customer_name}</p>
      <p><strong>Phone:</strong> ${order.data.customer_phone}</p>
      <p><strong>Amount:</strong> $${order.data.total_amount}</p>
      <p><strong>Retry Count:</strong> ${order.data.calls[0].retry_count}</p>
      <hr>
      <p>Please review this order in the admin dashboard and contact the customer manually.</p>
      <a href="https://admin.voiceverify.com/orders/${orderId}">View Order</a>
    `
  });
}
```

---

## API Integrations

### 1. Stripe Integration

#### Payment Intent Creation (Manual Capture)

```typescript
// supabase/functions/create-order/index.ts

import Stripe from 'stripe';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

async function createOrderWithPayment(orderData: OrderInput) {
  // 1. Create order in database
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      customer_name: orderData.customer_name,
      customer_phone: orderData.customer_phone,
      items: orderData.items,
      total_amount: orderData.total_amount,
      delivery_address: orderData.delivery_address,
      payment_type: orderData.payment_type,
      payment_status: 'pending',
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Create Payment Intent with manual capture
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(orderData.total_amount * 100), // Convert to cents
    currency: orderData.currency || 'usd',
    payment_method: orderData.payment_method_id,
    capture_method: 'manual', // KEY: Don't capture yet!
    confirmation_method: 'manual',
    confirm: true,
    metadata: {
      order_id: order.id
    }
  });

  // 3. Store payment intent ID
  await supabase
    .from('orders')
    .update({ payment_method_last4: paymentIntent.payment_method?.last4 })
    .eq('id', order.id);

  return { order, paymentIntent };
}
```

#### Webhook Handler (Idempotent)

```typescript
// supabase/functions/stripe-webhook/index.ts

import Stripe from 'stripe';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err.message}`, {
      status: 400
    });
  }

  // Check for idempotency (already processed this event?)
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // Handle different event types
  switch (event.type) {
    case 'payment_intent.amount_capturable_updated':
      await handlePaymentAuthorized(event);
      break;
    
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event);
      break;
    
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event);
      break;
    
    case 'payment_intent.canceled':
      await handlePaymentCanceled(event);
      break;
    
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event);
      break;
    
    case 'invoice.paid':
      await handleInvoicePaid(event);
      break;
    
    case 'invoice.payment_failed':
      await handleInvoiceFailed(event);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event);
      break;
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

async function handlePaymentAuthorized(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata.order_id;

  // Create payment record with idempotency key
  await supabase.from('payments').insert({
    stripe_event_id: event.id, // Idempotency key!
    order_id: orderId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'pending',
    payment_method_details: {
      brand: paymentIntent.payment_method?.card?.brand,
      last4: paymentIntent.payment_method?.card?.last4,
      exp_month: paymentIntent.payment_method?.card?.exp_month,
      exp_year: paymentIntent.payment_method?.card?.exp_year
    }
  });

  // Update order
  await supabase
    .from('orders')
    .update({
      payment_status: 'authorized',
      payment_method_brand: paymentIntent.payment_method?.card?.brand,
      payment_method_last4: paymentIntent.payment_method?.card?.last4
    })
    .eq('id', orderId);

  // TRIGGER CALL
  await initiateConfirmationCall(orderId);
}

async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata.order_id;

  // Update payment status (with idempotency)
  await supabase.from('payments').insert({
    stripe_event_id: event.id,
    order_id: orderId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'succeeded',
    processed_at: new Date().toISOString()
  });

  // Update order
  await supabase
    .from('orders')
    .update({ payment_status: 'paid' })
    .eq('id', orderId);
}

// ... similar handlers for other events
```

#### Payment Capture (After Successful Call)

```typescript
async function capturePaymentAfterConfirmation(orderId: string) {
  // Get payment intent ID
  const { data: order } = await supabase
    .from('orders')
    .select('*, payments(*)')
    .eq('id', orderId)
    .single();

  const paymentIntentId = order.payments[0].stripe_payment_intent_id;

  // Capture the payment
  await stripe.paymentIntents.capture(paymentIntentId);
  
  // Stripe will send payment_intent.succeeded webhook
  // which will update the database
}
```

#### Payment Cancellation (Customer Cancelled During Call)

```typescript
async function cancelPaymentAfterCallCancellation(orderId: string) {
  const { data: order } = await supabase
    .from('orders')
    .select('*, payments(*)')
    .eq('id', orderId)
    .single();

  const paymentIntentId = order.payments[0].stripe_payment_intent_id;

  // Cancel the payment intent (release funds)
  await stripe.paymentIntents.cancel(paymentIntentId);
  
  // Update database
  await supabase
    .from('orders')
    .update({
      payment_status: 'cancelled',
      status: 'cancelled'
    })
    .eq('id', orderId);
}
```

### 2. Twilio Voice Integration

#### Initiate Outbound Call

```typescript
// supabase/functions/initiate-call/index.ts

import twilio from 'twilio';
const client = twilio(
  Deno.env.get('TWILIO_ACCOUNT_SID'),
  Deno.env.get('TWILIO_AUTH_TOKEN')
);

async function initiateConfirmationCall(orderId: string) {
  // Get order details
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  // Check calling hours
  const now = new Date();
  const hour = now.getHours();
  const startHour = parseInt(Deno.env.get('CALL_HOURS_START') || '9');
  const endHour = parseInt(Deno.env.get('CALL_HOURS_END') || '21');

  if (hour < startHour || hour >= endHour) {
    console.log('Outside calling hours, scheduling for later');
    // Schedule for next morning
    const nextCall = new Date(now);
    nextCall.setDate(nextCall.getDate() + 1);
    nextCall.setHours(startHour, 0, 0, 0);
    
    await supabase.from('calls').insert({
      order_id: orderId,
      next_retry_at: nextCall.toISOString(),
      current_step: null,
      retry_count: 0
    });
    return;
  }

  // Create call record
  const { data: call } = await supabase
    .from('calls')
    .insert({
      order_id: orderId,
      current_step: null,
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  // Initiate Twilio call
  try {
    const twilioCall = await client.calls.create({
      from: Deno.env.get('TWILIO_PHONE_NUMBER'),
      to: order.customer_phone,
      url: `${Deno.env.get('TWILIO_WEBHOOK_BASE_URL')}/call-handler?call_id=${call.id}`,
      statusCallback: `${Deno.env.get('TWILIO_WEBHOOK_BASE_URL')}/call-status?call_id=${call.id}`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: true,
      recordingStatusCallback: `${Deno.env.get('TWILIO_WEBHOOK_BASE_URL')}/recording-status?call_id=${call.id}`
    });

    // Update call with Twilio SID
    await supabase
      .from('calls')
      .update({ twilio_call_sid: twilioCall.sid })
      .eq('id', call.id);

  } catch (error) {
    console.error('Failed to initiate call:', error);
    await supabase
      .from('calls')
      .update({ outcome: 'failed' })
      .eq('id', call.id);
  }
}
```

#### Call Handler (State Machine)

```typescript
// supabase/functions/call-handler/index.ts

import twilio from 'twilio';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')
});

Deno.serve(async (req) => {
  // Verify Twilio signature
  const signature = req.headers.get('X-Twilio-Signature');
  const url = req.url;
  const params = await req.formData();
  
  const isValid = twilio.validateRequest(
    Deno.env.get('TWILIO_AUTH_TOKEN')!,
    signature!,
    url,
    Object.fromEntries(params)
  );

  if (!isValid) {
    return new Response('Forbidden', { status: 403 });
  }

  // Extract parameters
  const callId = new URL(req.url).searchParams.get('call_id');
  const speechResult = params.get('SpeechResult');
  const callSid = params.get('CallSid');

  // Load call and order data
  const { data: call } = await supabase
    .from('calls')
    .select('*, orders(*)')
    .eq('id', callId)
    .single();

  const currentStep = call.current_step || 'ORDER_CONFIRMATION';

  // Process user's speech (if any)
  let intent = null;
  let extractedData = {};
  
  if (speechResult && currentStep !== 'ORDER_CONFIRMATION') {
    const result = await classifyIntentWithClaude(speechResult, currentStep, call.orders);
    intent = result.intent;
    extractedData = result.data;
    
    // Store response
    const responses = call.responses || {};
    responses[currentStep] = { speech: speechResult, intent, data: extractedData };
    
    await supabase
      .from('calls')
      .update({ responses })
      .eq('id', callId);
  }

  // Determine next step
  const nextStep = getNextStep(currentStep, intent, speechResult);

  // Update call state
  await supabase
    .from('calls')
    .update({ current_step: nextStep })
    .eq('id', callId);

  // Generate TwiML response
  const twiml = await generateTwiML(nextStep, call.orders, extractedData);

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' }
  });
});

async function classifyIntentWithClaude(
  speechResult: string,
  currentStep: string,
  order: any
): Promise<{ intent: string; data: any }> {
  const prompt = buildPromptForStep(currentStep, speechResult, order);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const response = message.content[0].text;
  
  // Parse Claude's response (expecting JSON)
  try {
    return JSON.parse(response);
  } catch {
    return { intent: 'UNCLEAR', data: {} };
  }
}

function buildPromptForStep(step: string, speech: string, order: any): string {
  const prompts = {
    ORDER_CONFIRMATION: `
You are analyzing a customer's response to an order confirmation question.

Order details: ${JSON.stringify(order.items)}
Customer said: "${speech}"

Classify the customer's intent. Respond with JSON only:
{
  "intent": "CONFIRM" | "DENY" | "CANCEL" | "UNCLEAR",
  "data": {}
}

Intent definitions:
- CONFIRM: Customer agrees with the order (e.g., "yes", "correct", "that's right")
- DENY: Customer disagrees but doesn't want to cancel (e.g., "no that's wrong", "I didn't order that")
- CANCEL: Customer wants to cancel the order (e.g., "cancel", "I don't want it anymore")
- UNCLEAR: Can't determine intent or customer asked to repeat
`,
    ADDRESS_CONFIRMATION: `
You are analyzing a customer's response to an address confirmation question.

Current address: ${order.delivery_address}
Customer said: "${speech}"

Classify intent and extract new address if provided. Respond with JSON only:
{
  "intent": "CONFIRM" | "CHANGE" | "UNCLEAR",
  "data": {
    "new_address": "..." // Only if intent is CHANGE
  }
}

Intent definitions:
- CONFIRM: Customer confirms address is correct
- CHANGE: Customer wants to change address (extract new address from speech)
- UNCLEAR: Can't determine or customer asked to repeat
`,
    PAYMENT_CONFIRMATION: `
You are analyzing a customer's response to a payment method confirmation.

Payment method: ${order.payment_method_brand} ending in ${order.payment_method_last4}
Payment type: ${order.payment_type}
Customer said: "${speech}"

Classify intent. Respond with JSON only:
{
  "intent": "CONFIRM" | "CHANGE_METHOD" | "CANCEL" | "UNCLEAR",
  "data": {}
}

Intent definitions:
- CONFIRM: Customer confirms payment method is correct
- CHANGE_METHOD: Customer wants to use different payment method
- CANCEL: Customer wants to cancel
- UNCLEAR: Can't determine intent
`,
    DELIVERY_TIME: `
You are analyzing a customer's delivery time preference.

Customer said: "${speech}"

Extract delivery time preference. Respond with JSON only:
{
  "intent": "SPECIFIED",
  "data": {
    "delivery_time": "morning" | "afternoon" | "evening" | "any"
  }
}

Map the customer's speech to one of the time slots.
If they say "any time" or "doesn't matter", use "any".
`
  };

  return prompts[step] || 'Unable to process this step.';
}

function getNextStep(current: string, intent: string | null, speech: string | null): string {
  // If customer cancelled at any point
  if (intent === 'CANCEL') {
    return 'CALL_COMPLETE_CANCELLED';
  }

  // If unclear, ask again
  if (intent === 'UNCLEAR') {
    return current; // Stay on same step
  }

  // State transitions
  const transitions = {
    'ORDER_CONFIRMATION': 'ADDRESS_CONFIRMATION',
    'ADDRESS_CONFIRMATION': 'PAYMENT_CONFIRMATION',
    'PAYMENT_CONFIRMATION': 'DELIVERY_TIME',
    'DELIVERY_TIME': 'CALL_COMPLETE_CONFIRMED',
  };

  return transitions[current] || 'CALL_COMPLETE_CONFIRMED';
}

async function generateTwiML(step: string, order: any, extractedData: any): Promise<string> {
  const baseUrl = Deno.env.get('TWILIO_WEBHOOK_BASE_URL');
  const voiceId = Deno.env.get('ELEVENLABS_VOICE_ID');

  // For critical prompts, use ElevenLabs TTS
  async function getElevenLabsAudio(text: string): Promise<string> {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY')!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.5 }
        })
      }
    );
    
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    // Save to Supabase Storage and return public URL
    const filename = `tts/${Date.now()}.mp3`;
    await supabase.storage
      .from('call-audio')
      .upload(filename, audioBuffer, { contentType: 'audio/mpeg' });
    
    const { data } = supabase.storage.from('call-audio').getPublicUrl(filename);
    return data.publicUrl;
  }

  switch (step) {
    case 'ORDER_CONFIRMATION':
      const itemsList = order.items.map(i => `${i.quantity} ${i.name}`).join(', ');
      return `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Gather input="speech" timeout="5" action="${baseUrl}/call-handler?call_id=${order.id}">
            <Say voice="Polly.Joanna">
              Hello! This is ${order.store_name || 'our store'} calling to confirm your order.
              You ordered ${itemsList}. Is this correct?
            </Say>
          </Gather>
          <Say>We didn't receive your response. Please try again.</Say>
          <Redirect>${baseUrl}/call-handler?call_id=${order.id}</Redirect>
        </Response>
      `;

    case 'ADDRESS_CONFIRMATION':
      return `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Gather input="speech" timeout="5" action="${baseUrl}/call-handler?call_id=${order.id}">
            <Say voice="Polly.Joanna">
              Great! Your delivery address is ${order.delivery_address}. Is this correct? 
              If you need to change it, please say the new address.
            </Say>
          </Gather>
          <Say>We didn't receive your response. Please try again.</Say>
          <Redirect>${baseUrl}/call-handler?call_id=${order.id}</Redirect>
        </Response>
      `;

    case 'PAYMENT_CONFIRMATION':
      let paymentMessage = '';
      if (order.payment_type === 'subscription') {
        paymentMessage = `Your monthly subscription of $${order.total_amount} will be charged to your ${order.payment_method_brand} ending in ${order.payment_method_last4}`;
      } else {
        paymentMessage = `Your payment of $${order.total_amount} will be charged to your ${order.payment_method_brand} ending in ${order.payment_method_last4}`;
      }

      return `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Gather input="speech" timeout="5" action="${baseUrl}/call-handler?call_id=${order.id}">
            <Say voice="Polly.Joanna">
              ${paymentMessage}. Is this correct?
            </Say>
          </Gather>
          <Say>We didn't receive your response. Please try again.</Say>
          <Redirect>${baseUrl}/call-handler?call_id=${order.id}</Redirect>
        </Response>
      `;

    case 'DELIVERY_TIME':
      return `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Gather input="speech" timeout="5" action="${baseUrl}/call-handler?call_id=${order.id}">
            <Say voice="Polly.Joanna">
              When would you prefer delivery? You can choose morning, afternoon, or evening.
            </Say>
          </Gather>
          <Say>We didn't receive your response. Please try again.</Say>
          <Redirect>${baseUrl}/call-handler?call_id=${order.id}</Redirect>
        </Response>
      `;

    case 'CALL_COMPLETE_CONFIRMED':
      return `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="Polly.Joanna">
            Thank you! Your order has been confirmed. 
            ${extractedData.delivery_time ? `We'll deliver during the ${extractedData.delivery_time}.` : ''}
            Have a great day!
          </Say>
          <Hangup/>
        </Response>
      `;

    case 'CALL_COMPLETE_CANCELLED':
      return `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="Polly.Joanna">
            We understand. Your order has been cancelled and you will not be charged. 
            Thank you for letting us know.
          </Say>
          <Hangup/>
        </Response>
      `;

    default:
      return `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="Polly.Joanna">We're experiencing technical difficulties. Please call us directly.</Say>
          <Hangup/>
        </Response>
      `;
  }
}
```

#### Call Status Handler

```typescript
// supabase/functions/call-status/index.ts

Deno.serve(async (req) => {
  const params = await req.formData();
  const callId = new URL(req.url).searchParams.get('call_id');
  const callStatus = params.get('CallStatus');
  const callDuration = params.get('CallDuration');

  await supabase
    .from('calls')
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: callDuration ? parseInt(callDuration) : null
    })
    .eq('id', callId);

  // Handle no-answer
  if (callStatus === 'no-answer' || callStatus === 'busy') {
    const { data: call } = await supabase
      .from('calls')
      .select('retry_count')
      .eq('id', callId)
      .single();

    if (call.retry_count < 1) {
      // Schedule retry
      const retryDelayMinutes = parseInt(Deno.env.get('RETRY_DELAY_MINUTES') || '120');
      const nextRetry = new Date(Date.now() + retryDelayMinutes * 60 * 1000);

      await supabase
        .from('calls')
        .update({
          outcome: 'no-answer',
          next_retry_at: nextRetry.toISOString()
        })
        .eq('id', callId);
    } else {
      // Max retries reached
      await supabase
        .from('calls')
        .update({ outcome: 'no-answer' })
        .eq('id', callId);

      // Notify admin
      await notifyAdmin(callId, 'Call failed after maximum retries');
    }
  }

  // If call completed, process outcome
  if (callStatus === 'completed') {
    await processCallOutcome(callId);
  }

  return new Response('OK', { status: 200 });
});

async function processCallOutcome(callId: string) {
  const { data: call } = await supabase
    .from('calls')
    .select('*, orders(*)')
    .eq('id', callId)
    .single();

  const responses = call.responses || {};
  
  // Determine final outcome
  let outcome = 'confirmed';
  let needsCapture = true;

  // Check if customer cancelled
  if (Object.values(responses).some((r: any) => r.intent === 'CANCEL')) {
    outcome = 'cancelled';
    needsCapture = false;
    
    // Cancel payment intent
    await cancelPaymentAfterCallCancellation(call.order_id);
  }
  
  // Check if customer changed anything
  else if (Object.values(responses).some((r: any) => r.intent === 'CHANGE')) {
    outcome = 'changed';
    
    // Apply changes to order
    if (responses.ADDRESS_CONFIRMATION?.data?.new_address) {
      await supabase
        .from('orders')
        .update({ delivery_address: responses.ADDRESS_CONFIRMATION.data.new_address })
        .eq('id', call.order_id);
    }
  }

  // Store delivery preference
  if (responses.DELIVERY_TIME?.data?.delivery_time) {
    await supabase
      .from('orders')
      .update({ delivery_time_preference: responses.DELIVERY_TIME.data.delivery_time })
      .eq('id', call.order_id);
  }

  // Update call outcome
  await supabase
    .from('calls')
    .update({ outcome })
    .eq('id', callId);

  // Capture payment if confirmed
  if (needsCapture) {
    await capturePaymentAfterConfirmation(call.order_id);
  }
}
```

#### Recording Status Handler

```typescript
// supabase/functions/recording-status/index.ts

Deno.serve(async (req) => {
  const params = await req.formData();
  const callId = new URL(req.url).searchParams.get('call_id');
  const recordingSid = params.get('RecordingSid');
  const recordingUrl = params.get('RecordingUrl');

  // Store recording info
  await supabase
    .from('calls')
    .update({
      twilio_recording_sid: recordingSid,
      twilio_recording_url: recordingUrl
    })
    .eq('id', callId);

  // Optionally: Download recording and generate transcript
  await generateTranscript(callId, recordingUrl);

  return new Response('OK', { status: 200 });
});

async function generateTranscript(callId: string, recordingUrl: string) {
  // Download recording from Twilio
  const response = await fetch(recordingUrl + '.mp3', {
    headers: {
      'Authorization': 'Basic ' + btoa(
        `${Deno.env.get('TWILIO_ACCOUNT_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`
      )
    }
  });

  const audioBuffer = await response.arrayBuffer();

  // Send to Whisper API
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer]), 'recording.mp3');
  formData.append('model', 'whisper-1');

  const transcriptResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
    },
    body: formData
  });

  const { text } = await transcriptResponse.json();

  // Store transcript
  await supabase
    .from('calls')
    .update({ transcript: text })
    .eq('id', callId);
}
```

### 3. Call Retry Scheduler

```typescript
// supabase/functions/call-retry-scheduler/index.ts
// Run this as a cron job every 15 minutes

Deno.serve(async (req) => {
  // Find calls pending retry
  const { data: pendingCalls } = await supabase
    .from('calls')
    .select('*, orders(*)')
    .eq('outcome', 'no-answer')
    .lt('retry_count', 1)
    .lte('next_retry_at', new Date().toISOString());

  for (const call of pendingCalls || []) {
    console.log(`Retrying call ${call.id} for order ${call.order_id}`);
    
    // Increment retry count
    await supabase
      .from('calls')
      .update({ retry_count: call.retry_count + 1 })
      .eq('id', call.id);

    // Initiate new call
    await initiateConfirmationCall(call.order_id);
  }

  return new Response(`Processed ${pendingCalls?.length || 0} retries`, { status: 200 });
});
```

---

## Security & Compliance

### 1. Webhook Signature Verification

**Stripe:**
```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const event = stripe.webhooks.constructEvent(
  requestBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
// Throws error if signature invalid
```

**Twilio:**
```typescript
import twilio from 'twilio';

const isValid = twilio.validateRequest(
  process.env.TWILIO_AUTH_TOKEN,
  twilioSignature,
  url,
  params
);

if (!isValid) {
  return new Response('Forbidden', { status: 403 });
}
```

### 2. Environment Variables

**Never commit:**
- API keys
- Webhook secrets
- Auth tokens
- Database credentials

**Use:**
- `.env.local` for local development
- Vercel environment variables for production
- Supabase secrets for Edge Functions

### 3. Data Privacy

**PII Handling:**
- Encrypt customer phone numbers at rest (optional for MVP)
- Auto-delete recordings after 30 days (configurable)
- No credit card numbers stored (only last 4 digits)

**GDPR Compliance (Future):**
- Customer data export API
- Right to erasure (delete customer data)
- Consent tracking

### 4. Rate Limiting

**Implement rate limits to prevent abuse:**

```typescript
// In Edge Functions
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: /* Upstash Redis */,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

const { success } = await ratelimit.limit(customerId);
if (!success) {
  return new Response('Too many requests', { status: 429 });
}
```

### 5. Error Logging

**Use structured logging:**

```typescript
console.log(JSON.stringify({
  level: 'error',
  timestamp: new Date().toISOString(),
  function: 'stripe-webhook',
  error: error.message,
  order_id: orderId,
  event_type: event.type
}));
```

**Monitor with:**
- Supabase Logs
- Sentry (for error tracking)
- Vercel Analytics

---

## Admin Interface

### Pages

#### 1. Dashboard (Home)

**URL:** `/`

**Metrics:**
- Total orders today
- Calls in progress
- Successful confirmations (%)
- Failed calls requiring attention

**Recent Activity:**
- Last 10 calls with outcomes
- Pending retries
- Recent cancellations

#### 2. Orders List

**URL:** `/orders`

**Table Columns:**
- Order ID (truncated)
- Customer Name
- Phone
- Total Amount
- Payment Status
- Order Status
- Call Outcome
- Created At
- Actions (View Details, Retry Call)

**Filters:**
- Status (all, pending, confirmed, cancelled, no-answer, callback-required)
- Payment Status (all, authorized, paid, failed)
- Date Range

#### 3. Order Details

**URL:** `/orders/[id]`

**Sections:**
- **Order Info:** Items, quantity, amount, address
- **Customer Info:** Name, phone, email
- **Payment Info:** 
  - Payment type (one-time/subscription)
  - Card brand and last 4
  - Payment status
  - Stripe Payment Intent ID (link to Stripe dashboard)
- **Call Info:**
  - Call status
  - Duration
  - Outcome
  - Conversation responses
  - Transcript (expandable)
  - Recording player (audio)
  - Retry history
- **Actions:**
  - Retry Call (if failed)
  - Cancel Order (with refund)
  - Mark as Callback Required

#### 4. Call History

**URL:** `/calls`

**Table Columns:**
- Call ID
- Order ID (link)
- Customer Name
- Phone
- Duration
- Outcome
- Started At
- Actions (View Transcript, Play Recording)

**Filters:**
- Outcome (all, confirmed, changed, cancelled, no-answer, failed)
- Date Range

### Technology Stack

**Frontend:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts (for analytics)

**Real-time Updates:**
```typescript
// app/orders/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Load initial data
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, payments(*), calls(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      setOrders(data);
    };

    fetchOrders();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Order changed:', payload);
          fetchOrders(); // Refresh list
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      <OrdersTable orders={orders} />
    </div>
  );
}
```

### Authentication

**Supabase Auth:**
```typescript
// middleware.ts

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If not authenticated, redirect to login
  if (!session && req.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
};
```

---

## Error Handling & Edge Cases

### 1. Payment Intent Expiration

**Problem:** Payment Intents expire after 7 days if not captured.

**Solution:**
```typescript
// Run daily cron job
async function cleanupExpiredPaymentIntents() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data: oldOrders } = await supabase
    .from('orders')
    .select('*, payments(*)')
    .eq('payment_status', 'authorized')
    .lt('created_at', sevenDaysAgo.toISOString());

  for (const order of oldOrders || []) {
    // Cancel Payment Intent
    await stripe.paymentIntents.cancel(order.payments[0].stripe_payment_intent_id);

    // Update database
    await supabase
      .from('orders')
      .update({
        payment_status: 'cancelled',
        status: 'cancelled'
      })
      .eq('id', order.id);

    // Notify admin
    await notifyAdmin(order.id, 'Payment Intent expired - order cancelled');
  }
}
```

### 2. Claude API Failures

**Problem:** Claude API might be down or rate-limited.

**Solution: Fallback Intent Classification**
```typescript
async function classifyIntentWithFallback(speech: string, step: string): Promise<string> {
  try {
    return await classifyIntentWithClaude(speech, step);
  } catch (error) {
    console.error('Claude API failed, using fallback', error);
    return simpleKeywordClassification(speech, step);
  }
}

function simpleKeywordClassification(speech: string, step: string): string {
  const lower = speech.toLowerCase();

  // Positive confirmations
  if (/(yes|correct|right|confirm|yep|yeah|sure|ok)/i.test(lower)) {
    return 'CONFIRM';
  }

  // Negative/Change
  if (/(no|wrong|change|different|update)/i.test(lower)) {
    return 'CHANGE';
  }

  // Cancel
  if (/(cancel|don't want|nevermind|stop)/i.test(lower)) {
    return 'CANCEL';
  }

  return 'UNCLEAR';
}
```

### 3. Twilio Call Failures

**Problem:** Customer phone might be invalid, network issues, etc.

**Solution: Retry with Exponential Backoff**
```typescript
async function initiateCallWithRetry(orderId: string, attempt: number = 1) {
  try {
    await initiateConfirmationCall(orderId);
  } catch (error) {
    if (attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      setTimeout(() => initiateCallWithRetry(orderId, attempt + 1), delay);
    } else {
      // Mark as failed, notify admin
      await supabase
        .from('calls')
        .update({ outcome: 'failed' })
        .eq('order_id', orderId);
      
      await notifyAdmin(orderId, 'Failed to initiate call after 3 attempts');
    }
  }
}
```

### 4. Race Condition: Payment Webhook Before Order Creation

**Problem:** Stripe webhook might arrive before order is fully created.

**Solution: Retry with Grace Period**
```typescript
async function handlePaymentAuthorized(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata.order_id;

  // Try to find order
  let { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .single();

  // If order doesn't exist yet, retry after 1 second
  if (!order) {
    console.log('Order not found, retrying in 1 second');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    ({ data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single());
  }

  if (!order) {
    throw new Error(`Order ${orderId} not found after retry`);
  }

  // Proceed with payment processing...
}
```

### 5. Customer Speaks During AI Prompt

**Problem:** Twilio `<Gather>` might not capture if customer speaks too early.

**Solution: Use `bargein` Attribute**
```xml
<Gather input="speech" bargein="true" timeout="5">
  <Say>Your question here</Say>
</Gather>
```

**Note:** This allows interruption, but might cut off the prompt. Balance based on testing.

### 6. Unclear or Ambiguous Responses

**Problem:** Customer says something ambiguous like "um, I think so..."

**Solution: Ask for Clarification**
```typescript
if (intent === 'UNCLEAR') {
  return `
    <Response>
      <Gather input="speech" timeout="5">
        <Say>I didn't quite catch that. Could you please say yes or no?</Say>
      </Gather>
      <Redirect>${webhookUrl}</Redirect>
    </Response>
  `;
}
```

---

## Testing Strategy

### Unit Tests

**Edge Functions:**
```typescript
// tests/stripe-webhook.test.ts

import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';

Deno.test('Stripe webhook - idempotency check', async () => {
  const event = {
    id: 'evt_test_123',
    type: 'payment_intent.succeeded',
    data: { /* ... */ }
  };

  // First call - should process
  const result1 = await handleStripeWebhook(event);
  assertEquals(result1.processed, true);

  // Second call with same event ID - should skip
  const result2 = await handleStripeWebhook(event);
  assertEquals(result2.processed, false);
  assertEquals(result2.reason, 'already_processed');
});
```

### Integration Tests

**Twilio Call Flow:**
```typescript
// tests/call-flow.test.ts

Deno.test('Full call flow - customer confirms order', async () => {
  // 1. Create test order
  const order = await createTestOrder();

  // 2. Initiate call
  const call = await initiateConfirmationCall(order.id);

  // 3. Simulate Twilio webhooks with speech results
  await simulateTwilioWebhook(call.id, {
    step: 'ORDER_CONFIRMATION',
    speech: 'yes, that\'s correct'
  });

  await simulateTwilioWebhook(call.id, {
    step: 'ADDRESS_CONFIRMATION',
    speech: 'yes'
  });

  await simulateTwilioWebhook(call.id, {
    step: 'PAYMENT_CONFIRMATION',
    speech: 'correct'
  });

  await simulateTwilioWebhook(call.id, {
    step: 'DELIVERY_TIME',
    speech: 'morning please'
  });

  // 4. Verify final state
  const { data: finalCall } = await supabase
    .from('calls')
    .select('outcome')
    .eq('id', call.id)
    .single();

  assertEquals(finalCall.outcome, 'confirmed');

  // 5. Verify payment was captured
  const { data: finalOrder } = await supabase
    .from('orders')
    .select('payment_status, status')
    .eq('id', order.id)
    .single();

  assertEquals(finalOrder.payment_status, 'paid');
  assertEquals(finalOrder.status, 'confirmed');
});
```

### Manual Testing Checklist

**Before Deployment:**
- [ ] Create test order on website
- [ ] Verify Stripe Payment Intent is created
- [ ] Confirm webhook triggers call
- [ ] Test voice conversation with real phone
- [ ] Verify call recording is saved
- [ ] Check transcript generation
- [ ] Test admin UI displays correct data
- [ ] Verify payment is captured after confirmation
- [ ] Test cancellation flow (payment released)
- [ ] Test no-answer retry mechanism
- [ ] Verify Stripe webhook idempotency
- [ ] Test subscription creation flow

---

## Deployment & Operations

### Infrastructure

**Hosting:**
- **Backend:** Supabase (Database + Edge Functions)
- **Frontend:** Vercel (Admin UI)
- **DNS:** Cloudflare (optional, for custom domain)

### Deployment Steps

#### 1. Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Link to remote project
supabase link --project-ref your-project-ref

# Push database migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy stripe-webhook
supabase functions deploy call-handler
supabase functions deploy call-status
supabase functions deploy initiate-call
supabase functions deploy call-retry-scheduler

# Set secrets for Edge Functions
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set TWILIO_AUTH_TOKEN=...
# ... (set all environment variables)
```

#### 2. Stripe Configuration

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local (for development)
stripe listen --forward-to https://your-project.supabase.co/functions/v1/stripe-webhook

# Create webhook endpoint (for production)
stripe webhook_endpoints create \
  --url https://your-project.supabase.co/functions/v1/stripe-webhook \
  --enabled-events payment_intent.amount_capturable_updated,payment_intent.succeeded,payment_intent.payment_failed,customer.subscription.created,invoice.paid,invoice.payment_failed,customer.subscription.deleted
```

#### 3. Twilio Configuration

1. **Purchase Phone Number** in Twilio Console
2. **Configure Voice URL:**
   - URL: `https://your-project.supabase.co/functions/v1/call-handler`
   - Method: POST
3. **Configure Status Callback URL:**
   - URL: `https://your-project.supabase.co/functions/v1/call-status`
   - Method: POST
4. **Enable Call Recording:**
   - Recording Mode: Record from answer
   - Recording Callback: `https://your-project.supabase.co/functions/v1/recording-status`

#### 4. Next.js Admin UI Deployment

```bash
# In your Next.js project directory

# Build
npm run build

# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### 5. Set Up Cron Jobs

**In Supabase Dashboard:**
```sql
-- Schedule call retry checker every 15 minutes
SELECT cron.schedule(
  'call-retry-checker',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/call-retry-scheduler',
    headers := '{"Authorization": "Bearer ' || current_setting('app.jwt_secret') || '"}'::jsonb
  );
  $$
);

-- Cleanup expired payment intents daily at 2 AM
SELECT cron.schedule(
  'cleanup-expired-payments',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/cleanup-expired-payments',
    headers := '{"Authorization": "Bearer ' || current_setting('app.jwt_secret') || '"}'::jsonb
  );
  $$
);
```

### Monitoring

**Supabase Logs:**
- View real-time logs in Supabase Dashboard
- Filter by function name
- Set up log alerts for errors

**Stripe Dashboard:**
- Monitor payment success/failure rates
- Check webhook delivery status
- Review dispute trends

**Twilio Console:**
- Monitor call success rates
- Check for failed calls
- Review recordings and transcripts

**Vercel Analytics:**
- Track admin UI performance
- Monitor error rates
- View deployment history

### Backup & Recovery

**Database Backups:**
- Supabase automatically backs up database daily
- Manual backup: `supabase db dump > backup.sql`

**Restore:**
```bash
psql -h db.your-project.supabase.co -U postgres -f backup.sql
```

---

## Future Enhancements

### Phase 2 (Post-MVP)

1. **Multi-language Support**
   - Detect customer language from order metadata
   - Use multilingual TTS (ElevenLabs supports 29 languages)
   - Claude can understand and respond in multiple languages

2. **Advanced Scheduling**
   - Customer preference for call times
   - Time zone detection
   - "Do Not Disturb" hours

3. **SMS Fallback**
   - If call fails, send SMS with confirmation link
   - Customer can confirm via text message
   - Link opens web form pre-filled with order details

4. **Voice Biometrics**
   - Verify customer identity via voice
   - Prevent fraud on high-value orders

5. **Analytics Dashboard**
   - Call success rates over time
   - Most common cancellation reasons
   - Payment capture rates
   - Cost per call
   - Customer satisfaction scores

6. **A/B Testing**
   - Test different prompts/voices
   - Measure which approaches yield higher confirmation rates

7. **Integration with Shipping Providers**
   - Real-time delivery tracking
   - Update customer on delivery status
   - Rescheduling capability

8. **Inbound Call Handling**
   - Customer can call back to make changes
   - AI handles basic inquiries
   - Routing to human agents for complex issues

### Phase 3 (Scale)

1. **Multi-tenant Support**
   - Support multiple stores/brands
   - White-label admin interface
   - Per-tenant configuration

2. **Advanced AI Features**
   - Sentiment analysis (detect frustrated customers)
   - Upsell/cross-sell recommendations during call
   - Churn prediction

3. **Regional Compliance**
   - GDPR compliance tools
   - CCPA compliance
   - Opt-out management
   - Call recording consent flows

---

## Appendices

### A. Conversation Flow Diagram

```
[Order Created] 
       ↓
[Payment Intent Authorized]
       ↓
[Call Initiated]
       ↓
┌────────────────────┐
│ ORDER CONFIRMATION │ → "yes" → [Next Step]
│                    │ → "no"  → [Deny/Cancel Handler]
└────────────────────┘
       ↓
┌────────────────────┐
│ADDRESS CONFIRMATION│ → "yes"    → [Next Step]
│                    │ → "change" → [Store New Address] → [Next Step]
└────────────────────┘
       ↓
┌────────────────────┐
│PAYMENT CONFIRMATION│ → "yes"    → [Next Step]
│                    │ → "change" → [Mark for Payment Update]
│                    │ → "cancel" → [Cancel Flow]
└────────────────────┘
       ↓
┌────────────────────┐
│  DELIVERY TIMING   │ → "morning/afternoon/evening" → [Store Preference]
└────────────────────┘
       ↓
┌────────────────────┐
│   CALL COMPLETE    │
└────────────────────┘
       ↓
  [Capture Payment] (if confirmed)
       ↓
  [Generate Transcript]
```

### B. Database ER Diagram

```
┌─────────────┐         ┌─────────────┐
│   orders    │────<─<──│  payments   │
│             │         │             │
│ • id (PK)   │         │ • id (PK)   │
│ • customer  │         │ • order_id  │
│ • items     │         │ • stripe_*  │
│ • address   │         │ • amount    │
│ • status    │         └─────────────┘
│ • payment_* │
└─────────────┘
       ↑
       │
       │ 1:N
       │
┌─────────────┐         ┌─────────────┐
│    calls    │────>─>──│  call_logs  │
│             │         │             │
│ • id (PK)   │         │ • id (PK)   │
│ • order_id  │         │ • call_id   │
│ • twilio_*  │         │ • step      │
│ • outcome   │         │ • speech    │
│ • transcript│         │ • intent    │
│ • responses │         └─────────────┘
└─────────────┘
```

### C. Cost Estimation (Per 1000 Orders)

| Service | Usage | Cost |
|---------|-------|------|
| Twilio Voice | 2 min/call avg × 1000 | $26.00 |
| ElevenLabs TTS | 500 chars/call × 1000 | $9.00 |
| Claude API | 5 requests/call × 1000 | $3.00 |
| Whisper Transcription | 2 min/call × 1000 | $12.00 |
| Stripe Fees | $50 avg × 1000 × 2.9% | $1,450.00 |
| Supabase Pro | Fixed monthly | $25.00 |
| Vercel Pro | Fixed monthly | $20.00 |
| **Total** | | **$1,545.00** |

**Revenue Impact:**
- If system prevents 5% order cancellations → Saves $2,500 per 1000 orders
- ROI: ~62% profit per 1000 orders

### D. API Response Examples

**Stripe Payment Intent (Authorized):**
```json
{
  "id": "pi_3AbC123",
  "object": "payment_intent",
  "amount": 5000,
  "currency": "usd",
  "status": "requires_capture",
  "capture_method": "manual",
  "payment_method": {
    "id": "pm_1ABC",
    "card": {
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2025
    }
  },
  "metadata": {
    "order_id": "ord_xyz789"
  }
}
```

**Claude Intent Classification Response:**
```json
{
  "intent": "CHANGE",
  "data": {
    "new_address": "123 Main Street, Apartment 4B, New York, NY 10001"
  },
  "confidence": 0.95
}
```

**Twilio Call Status Callback:**
```json
{
  "CallSid": "CA1234567890abcdef",
  "CallStatus": "completed",
  "CallDuration": "142",
  "From": "+15555551234",
  "To": "+15555559876",
  "RecordingUrl": "https://api.twilio.com/2010-04-01/Accounts/AC123/Recordings/RE456",
  "RecordingSid": "RE456789abc"
}
```

### E. Environment Setup Guide

**Local Development:**

1. **Clone repository**
```bash
git clone https://github.com/your-org/ai-caller-bot.git
cd ai-caller-bot
```

2. **Install dependencies**
```bash
# Backend (Supabase Functions)
cd supabase/functions
npm install

# Frontend (Admin UI)
cd ../../admin-ui
npm install
```

3. **Set up environment variables**
```bash
# Copy example env file
cp .env.example .env.local

# Fill in your API keys
nano .env.local
```

4. **Start Supabase locally**
```bash
supabase start
```

5. **Run database migrations**
```bash
supabase db reset
```

6. **Start Next.js dev server**
```bash
cd admin-ui
npm run dev
```

7. **Expose local server for Twilio webhooks (use ngrok)**
```bash
ngrok http 54321  # Supabase local port
# Use ngrok URL in Twilio webhook configuration
```

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-14 | Initial draft | AI Assistant |

---

## Approval & Sign-off

**Product Owner:** ___________________ Date: ___________

**Tech Lead:** ___________________ Date: ___________

**Security Review:** ___________________ Date: ___________

---

**END OF DOCUMENT**
