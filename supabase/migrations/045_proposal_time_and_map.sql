-- Add target_time and map_url to community_proposals
ALTER TABLE community_proposals
  ADD COLUMN IF NOT EXISTS target_time TEXT,
  ADD COLUMN IF NOT EXISTS map_url TEXT;
