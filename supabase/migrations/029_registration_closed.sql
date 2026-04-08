-- Add registration_closed flag to community_events
-- Allows admins to manually close registration independent of event status
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS registration_closed BOOLEAN NOT NULL DEFAULT false;
