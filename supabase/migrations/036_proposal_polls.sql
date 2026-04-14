-- Freestyle polls for proposals (separate from discussion time polls)
-- Each proposal can have max 1 freestyle poll + 1 discussion time poll

-- Add title/description to existing discussion table
ALTER TABLE proposal_discussions
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Freestyle poll table (one per proposal)
CREATE TABLE proposal_polls (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proposal_id TEXT NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  -- Array of option labels (text options for voting)
  options TEXT[] NOT NULL DEFAULT '{}',
  -- Whether members can pick multiple options
  allow_multiple BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  UNIQUE(proposal_id)
);

-- Poll votes (one response per member per poll)
CREATE TABLE proposal_poll_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  poll_id TEXT NOT NULL REFERENCES proposal_polls(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id),
  selected_options TEXT[] DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  UNIQUE(poll_id, member_id)
);

-- Indexes
CREATE INDEX idx_proposal_polls_proposal ON proposal_polls(proposal_id);
CREATE INDEX idx_poll_responses_poll ON proposal_poll_responses(poll_id);
CREATE INDEX idx_poll_responses_member ON proposal_poll_responses(member_id);

-- RLS
ALTER TABLE proposal_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_poll_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read polls" ON proposal_polls FOR SELECT USING (true);
CREATE POLICY "Anyone can read poll responses" ON proposal_poll_responses FOR SELECT USING (true);

-- Add has_poll flag to proposals
ALTER TABLE community_proposals
  ADD COLUMN IF NOT EXISTS has_poll BOOLEAN NOT NULL DEFAULT false;
