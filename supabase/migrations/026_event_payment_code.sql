-- Add optional payment_code column for custom event codes in transfer content
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS payment_code TEXT;
