-- Migration: 004_add_language_support.sql
-- Description: Adds language support to orders table for i18n functionality

-- Add language column to orders table
ALTER TABLE orders 
ADD COLUMN language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'bg'));

-- Create index for language queries
CREATE INDEX idx_orders_language ON orders(language);

-- Add comment
COMMENT ON COLUMN orders.language IS 'Language preference for the order (en=English, bg=Bulgarian)';

