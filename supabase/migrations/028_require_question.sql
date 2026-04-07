-- Add optional "require question to speaker" feature for events
ALTER TABLE community_events
  ADD COLUMN IF NOT EXISTS require_question BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS question_prompt TEXT;

-- Add question column to guest RSVPs so guests can also submit questions
ALTER TABLE event_guest_rsvps
  ADD COLUMN IF NOT EXISTS question TEXT;
