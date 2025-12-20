-- Migration: 006_add_billing_cycle.sql
-- Description: Add billing_cycle field to orders table for subscription orders

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly'));

-- Add comment
COMMENT ON COLUMN orders.billing_cycle IS 'Billing cycle for subscription orders: monthly or yearly';

