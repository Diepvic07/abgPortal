-- Add allow_cancellation column to community_events (defaults to true)
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS allow_cancellation BOOLEAN DEFAULT true;
