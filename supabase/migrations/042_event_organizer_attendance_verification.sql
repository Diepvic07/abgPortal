-- Migration 042: Event Organizer Selection for Attendance Scoring
-- Separates the real event organizer from the admin/member who created the event.

ALTER TABLE community_events
  ADD COLUMN IF NOT EXISTS organizer_member_id TEXT REFERENCES members(id);

UPDATE community_events
SET organizer_member_id = created_by_member_id
WHERE organizer_member_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_organizer_member
  ON community_events(organizer_member_id);
