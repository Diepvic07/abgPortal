-- Migration 038: Member Scoring System
-- Adds append-only score ledger, denormalized period aggregates,
-- and RSVP schema extensions for verified roles and attendance mode.

-- ==================== New Tables ====================

-- Append-only score ledger: every scoring fact is an immutable row
CREATE TABLE IF NOT EXISTS score_events (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  rule_key TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('participation', 'engagement')),
  score INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  effective_at TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  is_reversal BOOLEAN NOT NULL DEFAULT false,
  reverses_score_event_id TEXT REFERENCES score_events(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

-- Denormalized aggregates for fast leaderboard reads
CREATE TABLE IF NOT EXISTS member_score_periods (
  member_id TEXT NOT NULL REFERENCES members(id),
  period_type TEXT NOT NULL CHECK (period_type IN ('month', 'quarter', 'year')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  total_score INTEGER NOT NULL DEFAULT 0,
  participation_score INTEGER NOT NULL DEFAULT 0,
  engagement_score INTEGER NOT NULL DEFAULT 0,
  event_score INTEGER NOT NULL DEFAULT 0,
  proposal_score INTEGER NOT NULL DEFAULT 0,
  reference_score INTEGER NOT NULL DEFAULT 0,
  connection_score INTEGER NOT NULL DEFAULT 0,
  comment_score INTEGER NOT NULL DEFAULT 0,
  last_scored_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (member_id, period_type, period_start)
);

-- ==================== Schema Extensions ====================

-- Verified event role for scoring (attendee = verified participant, lead = speaker/lead/core volunteer)
ALTER TABLE community_event_rsvps
  ADD COLUMN IF NOT EXISTS verified_event_role TEXT CHECK (verified_event_role IN ('attendee', 'lead'));

-- Attendance mode for hybrid events (offline/online per attendee)
ALTER TABLE community_event_rsvps
  ADD COLUMN IF NOT EXISTS attendance_mode TEXT CHECK (attendance_mode IN ('offline', 'online'));

-- ==================== Indexes ====================

CREATE INDEX IF NOT EXISTS idx_score_events_member ON score_events(member_id);
CREATE INDEX IF NOT EXISTS idx_score_events_source ON score_events(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_score_events_effective ON score_events(effective_at);

-- Indexes for comment duplicate detection (cross-table 30-day check)
CREATE INDEX IF NOT EXISTS idx_event_comments_member_date ON community_event_comments(member_id, created_at);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_member_date ON community_proposal_comments(member_id, created_at);
