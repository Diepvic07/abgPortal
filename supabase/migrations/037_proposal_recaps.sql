-- Add recap fields to community_proposals
ALTER TABLE community_proposals
  ADD COLUMN IF NOT EXISTS recap_text TEXT,
  ADD COLUMN IF NOT EXISTS recap_images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recap_created_at TEXT;

-- Add recap fields to community_events
ALTER TABLE community_events
  ADD COLUMN IF NOT EXISTS recap_text TEXT,
  ADD COLUMN IF NOT EXISTS recap_images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recap_created_at TEXT;
