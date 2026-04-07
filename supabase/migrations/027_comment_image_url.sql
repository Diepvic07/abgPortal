-- Add image_url column to both comment tables
ALTER TABLE community_event_comments ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE community_proposal_comments ADD COLUMN IF NOT EXISTS image_url TEXT;
