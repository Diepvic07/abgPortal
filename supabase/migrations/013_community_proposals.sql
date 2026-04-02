-- Community Proposals System
-- 3 tables: proposals, commitments, comments
-- Triggers for denormalized counts

CREATE TABLE IF NOT EXISTS community_proposals (
  id TEXT PRIMARY KEY,
  created_by_member_id TEXT NOT NULL REFERENCES members(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'published',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  commitment_score INTEGER NOT NULL DEFAULT 0,
  commitment_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  target_date TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  published_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  selected_at TEXT,
  selected_by_member_id TEXT REFERENCES members(id),
  completed_at TEXT,
  admin_note TEXT
);

CREATE TABLE IF NOT EXISTS community_commitments (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id),
  commitment_level TEXT NOT NULL DEFAULT 'interested',
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  UNIQUE(proposal_id, member_id)
);

CREATE TABLE IF NOT EXISTS community_proposal_comments (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposals_status ON community_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_category ON community_proposals(category);
CREATE INDEX IF NOT EXISTS idx_proposals_commitment_score ON community_proposals(commitment_score DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_is_pinned ON community_proposals(is_pinned);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON community_proposals(created_by_member_id);
CREATE INDEX IF NOT EXISTS idx_commitments_proposal ON community_commitments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_commitments_member ON community_commitments(member_id);
CREATE INDEX IF NOT EXISTS idx_comments_proposal ON community_proposal_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON community_proposal_comments(status);

-- Commitment level weights for scoring
-- 'interested' = 0, 'will_participate' = 3, 'will_lead' = 5

-- Function to calculate commitment weight
CREATE OR REPLACE FUNCTION commitment_weight(level TEXT) RETURNS INTEGER AS $$
BEGIN
  CASE level
    WHEN 'will_lead' THEN RETURN 5;
    WHEN 'will_participate' THEN RETURN 3;
    WHEN 'interested' THEN RETURN 0;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to update proposal commitment counts
CREATE OR REPLACE FUNCTION update_proposal_commitment_counts() RETURNS TRIGGER AS $$
DECLARE
  target_proposal_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_proposal_id := OLD.proposal_id;
  ELSE
    target_proposal_id := NEW.proposal_id;
  END IF;

  UPDATE community_proposals SET
    commitment_count = (SELECT COUNT(*) FROM community_commitments WHERE proposal_id = target_proposal_id),
    commitment_score = (SELECT COALESCE(SUM(commitment_weight(commitment_level)), 0) FROM community_commitments WHERE proposal_id = target_proposal_id),
    updated_at = to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  WHERE id = target_proposal_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_commitment_counts
  AFTER INSERT OR UPDATE OR DELETE ON community_commitments
  FOR EACH ROW EXECUTE FUNCTION update_proposal_commitment_counts();

-- Trigger function to update proposal comment counts
CREATE OR REPLACE FUNCTION update_proposal_comment_counts() RETURNS TRIGGER AS $$
DECLARE
  target_proposal_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_proposal_id := OLD.proposal_id;
  ELSE
    target_proposal_id := NEW.proposal_id;
  END IF;

  UPDATE community_proposals SET
    comment_count = (SELECT COUNT(*) FROM community_proposal_comments WHERE proposal_id = target_proposal_id AND status = 'visible'),
    updated_at = to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  WHERE id = target_proposal_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_counts
  AFTER INSERT OR UPDATE OR DELETE ON community_proposal_comments
  FOR EACH ROW EXECUTE FUNCTION update_proposal_comment_counts();
