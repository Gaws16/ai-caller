-- Migration: 003_add_stripe_customer_id.sql
-- Description: Add stripe_customer_id column to orders table
-- Required for off-session payments - PaymentMethod must be attached to a Customer

-- Add stripe_customer_id column to store the Stripe customer ID
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add index for customer lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_customer_id ON orders(stripe_customer_id);

-- Comment explaining the purpose
COMMENT ON COLUMN orders.stripe_customer_id IS 'Stripe Customer ID for off-session payment processing';
