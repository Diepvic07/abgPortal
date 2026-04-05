-- Comment reactions (unified for both event and proposal comments)
CREATE TABLE IF NOT EXISTS comment_reactions (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  comment_type TEXT NOT NULL CHECK (comment_type IN ('event', 'proposal')),
  member_id TEXT NOT NULL REFERENCES members(id),
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'heart', 'haha', 'wow', 'sad', 'cold', 'fire', 'hug', 'highfive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, comment_type, member_id)
);

CREATE INDEX idx_comment_reactions_comment ON comment_reactions(comment_id, comment_type);

-- Threaded replies via parent_comment_id
ALTER TABLE community_event_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id TEXT REFERENCES community_event_comments(id) ON DELETE CASCADE;

ALTER TABLE community_proposal_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id TEXT REFERENCES community_proposal_comments(id) ON DELETE CASCADE;

CREATE INDEX idx_event_comments_parent ON community_event_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_proposal_comments_parent ON community_proposal_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
