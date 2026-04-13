-- Online Discussion feature for proposals
-- Allows proposal creators to host Q&A discussions with date voting

-- Add discussion flag to proposals
ALTER TABLE community_proposals
  ADD COLUMN IF NOT EXISTS has_discussion BOOLEAN NOT NULL DEFAULT false;

-- Discussion / meeting record (one per proposal)
CREATE TABLE proposal_discussions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proposal_id TEXT NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'scheduled', 'completed', 'cancelled')),
  -- Creator-proposed date options for voting (ISO date strings)
  date_options TEXT[] NOT NULL DEFAULT '{}',
  -- Finalized meeting details (set when status = 'scheduled')
  meeting_date TEXT,
  meeting_link TEXT,
  invited_emails TEXT[] DEFAULT '{}',
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  UNIQUE(proposal_id)
);

-- Responses: date votes + questions from members
CREATE TABLE proposal_discussion_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  discussion_id TEXT NOT NULL REFERENCES proposal_discussions(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id),
  -- Date votes: array of ISO date strings the member is available for
  available_dates TEXT[] DEFAULT '{}',
  -- Optional question for the creator
  question TEXT,
  -- RSVP status for the scheduled meeting
  rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'accepted', 'declined')),
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  UNIQUE(discussion_id, member_id)
);

-- Indexes
CREATE INDEX idx_proposal_discussions_proposal ON proposal_discussions(proposal_id);
CREATE INDEX idx_proposal_discussions_status ON proposal_discussions(status);
CREATE INDEX idx_discussion_responses_discussion ON proposal_discussion_responses(discussion_id);
CREATE INDEX idx_discussion_responses_member ON proposal_discussion_responses(member_id);
-- For cron: find scheduled meetings needing reminders
CREATE INDEX idx_proposal_discussions_reminder ON proposal_discussions(status, meeting_date, reminder_sent)
  WHERE status = 'scheduled' AND reminder_sent = false;

-- RLS
ALTER TABLE proposal_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_discussion_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read discussions" ON proposal_discussions FOR SELECT USING (true);
CREATE POLICY "Anyone can read responses" ON proposal_discussion_responses FOR SELECT USING (true);

-- Service role handles inserts/updates via API (no auth.uid() in server context)
-- RLS SELECT is open; mutations go through API authorization checks

-- Add discussion_meeting to notification preferences
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS discussion_meeting BOOLEAN NOT NULL DEFAULT true;

-- Update in_app_notifications type check to include discussion_meeting
ALTER TABLE in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_type_check;
ALTER TABLE in_app_notifications ADD CONSTRAINT in_app_notifications_type_check
  CHECK (type IN ('new_proposal', 'new_event', 'connection_request', 'proposal_comment', 'discussion_meeting'));
