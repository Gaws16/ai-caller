-- Migration: 004_add_vapi_fields.sql
-- Description: Add Vapi.ai call tracking fields to calls table
-- This migration adds support for the Vapi.ai integration

-- Add vapi_call_id column to track Vapi calls
ALTER TABLE calls ADD COLUMN IF NOT EXISTS vapi_call_id TEXT UNIQUE;

-- Add index for fast lookups by vapi_call_id
CREATE INDEX IF NOT EXISTS idx_calls_vapi_call_id ON calls(vapi_call_id);

-- Add comment explaining the column
COMMENT ON COLUMN calls.vapi_call_id IS 'Vapi.ai call ID for tracking outbound voice AI calls';

-- Note: twilio_call_sid is kept for backwards compatibility during migration
-- It can be removed in a future migration after full Vapi adoption
