-- Add image_url column to community_proposals
ALTER TABLE community_proposals ADD COLUMN IF NOT EXISTS image_url TEXT;
