-- Add tags array column to community_proposals
ALTER TABLE community_proposals
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Index for tag-based filtering (GIN index for array containment queries)
CREATE INDEX IF NOT EXISTS idx_community_proposals_tags ON community_proposals USING GIN (tags);
