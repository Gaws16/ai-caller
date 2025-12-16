-- Migration: 002_add_payment_method_id.sql
-- Description: Add payment_method_id column for SetupIntent flow
-- This allows us to charge the saved payment method after call confirmation

-- Add payment_method_id column to store the Stripe payment method ID
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method_id TEXT;

-- Make stripe_payment_intent_id nullable (won't exist until after call confirmation)
ALTER TABLE payments ALTER COLUMN stripe_payment_intent_id DROP NOT NULL;

-- Add index for payment_method_id lookups
CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id ON payments(payment_method_id);

-- Comment explaining the new flow
COMMENT ON COLUMN payments.payment_method_id IS 'Stripe PaymentMethod ID saved via SetupIntent. Used to charge after call confirmation.';
