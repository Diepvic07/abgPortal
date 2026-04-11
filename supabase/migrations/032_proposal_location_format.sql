-- Add location and participation_format to community_proposals
ALTER TABLE community_proposals
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS participation_format TEXT DEFAULT 'offline';

-- Update category to support new activity types
-- Existing values (charity, event, other) remain valid for backward compat
-- New values: talk, fieldtrip, meeting, sports
