-- Migration: 005_add_vapi_recording_url.sql
-- Description: Add Vapi recording URL field to calls table

-- Add recording_url column (generic name, works for both Twilio and Vapi)
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN calls.recording_url IS 'URL to the call recording (Vapi or Twilio)';
