-- Add registration_deadline column to community_events
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ;
