-- Add optional "require question to speaker" feature for events
ALTER TABLE community_events
  ADD COLUMN IF NOT EXISTS require_question BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS question_prompt TEXT;
