-- Community Events System
-- 3 tables: events, event_rsvps, event_comments
-- Triggers for denormalized counts
-- Reuses commitment_weight() function from 013_community_proposals.sql

CREATE TABLE IF NOT EXISTS community_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'event',
  event_date TEXT NOT NULL,
  event_end_date TEXT,
  location TEXT,
  location_url TEXT,
  capacity INTEGER,
  image_url TEXT,
  created_by_member_id TEXT NOT NULL REFERENCES members(id),
  proposal_id TEXT REFERENCES community_proposals(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  rsvp_count INTEGER NOT NULL DEFAULT 0,
  rsvp_score INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  published_at TEXT,
  completed_at TEXT,
  outcome_summary TEXT
);

CREATE TABLE IF NOT EXISTS community_event_rsvps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id),
  commitment_level TEXT NOT NULL DEFAULT 'interested',
  actual_attendance BOOLEAN,
  actual_participation_score INTEGER,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  UNIQUE(event_id, member_id)
);

CREATE TABLE IF NOT EXISTS community_event_comments (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- Add commitment_score to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS commitment_score INTEGER NOT NULL DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON community_events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON community_events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_proposal_id ON community_events(proposal_id) WHERE proposal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_category ON community_events(category);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON community_events(created_by_member_id);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON community_event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_member_id ON community_event_rsvps(member_id);

CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON community_event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_status ON community_event_comments(status);

-- Trigger function to update event RSVP counts
-- Reuses commitment_weight() from 013_community_proposals.sql
CREATE OR REPLACE FUNCTION update_event_rsvp_counts() RETURNS TRIGGER AS $$
DECLARE
  target_event_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_event_id := OLD.event_id;
  ELSE
    target_event_id := NEW.event_id;
  END IF;

  UPDATE community_events SET
    rsvp_count = (SELECT COUNT(*) FROM community_event_rsvps WHERE event_id = target_event_id),
    rsvp_score = (SELECT COALESCE(SUM(commitment_weight(commitment_level)), 0) FROM community_event_rsvps WHERE event_id = target_event_id),
    updated_at = to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  WHERE id = target_event_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_rsvp_counts
  AFTER INSERT OR UPDATE OR DELETE ON community_event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_event_rsvp_counts();

-- Trigger function to update event comment counts
CREATE OR REPLACE FUNCTION update_event_comment_counts() RETURNS TRIGGER AS $$
DECLARE
  target_event_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_event_id := OLD.event_id;
  ELSE
    target_event_id := NEW.event_id;
  END IF;

  UPDATE community_events SET
    comment_count = (SELECT COUNT(*) FROM community_event_comments WHERE event_id = target_event_id AND status = 'visible'),
    updated_at = to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  WHERE id = target_event_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_comment_counts
  AFTER INSERT OR UPDATE OR DELETE ON community_event_comments
  FOR EACH ROW EXECUTE FUNCTION update_event_comment_counts();
