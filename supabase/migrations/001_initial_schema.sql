-- VoiceVerify Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Creates core tables for orders, payments, calls, and call_logs

-- ============================================
-- TABLES
-- ============================================

-- 1. Orders Table
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

  -- Constraints
  CONSTRAINT valid_phone CHECK (customer_phone ~ '^\+?[1-9]\d{1,14}$')
);

-- 2. Payments Table
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
  processed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Calls Table
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

-- 4. Call Logs Table (for debugging)
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

-- ============================================
-- INDEXES
-- ============================================

-- Orders indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_phone ON orders(customer_phone);

-- Payments indexes
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_stripe_subscription ON payments(stripe_subscription_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Calls indexes
CREATE INDEX idx_calls_order_id ON calls(order_id);
CREATE INDEX idx_calls_twilio_sid ON calls(twilio_call_sid);
CREATE INDEX idx_calls_outcome ON calls(outcome);
CREATE INDEX idx_calls_retry ON calls(next_retry_at) WHERE outcome = 'no-answer' AND retry_count < 1;
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);

-- Call logs indexes
CREATE INDEX idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX idx_call_logs_timestamp ON call_logs(timestamp DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update order status based on call outcome
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

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Auto-update updated_at on orders
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger: Auto-update updated_at on calls
CREATE TRIGGER trigger_calls_updated_at
  BEFORE UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger: Update order from call outcome
CREATE TRIGGER trigger_update_order_from_call
  AFTER UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_order_from_call();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Admin access policies (authenticated users can read all data)
-- Note: For MVP, we allow all authenticated users to access data
-- In production, you may want to check for admin role: auth.jwt() ->> 'role' = 'admin'

CREATE POLICY "Authenticated users can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all calls"
  ON calls FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert calls"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update calls"
  ON calls FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all call_logs"
  ON call_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert call_logs"
  ON call_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role policies (for Edge Functions)
-- Note: Service role bypasses RLS by default, so these are for documentation

CREATE POLICY "Service role can do anything on orders"
  ON orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do anything on payments"
  ON payments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do anything on calls"
  ON calls FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do anything on call_logs"
  ON call_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime for orders and calls tables (for admin UI updates)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE calls;

-- ============================================
-- STORAGE BUCKET (for call recordings)
-- ============================================

-- Create storage bucket for call audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-audio', 'call-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for call-audio bucket
CREATE POLICY "Authenticated users can read call audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'call-audio');

CREATE POLICY "Service role can upload call audio"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'call-audio');
