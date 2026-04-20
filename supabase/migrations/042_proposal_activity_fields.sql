-- Add activity-type-specific fields to community_proposals
ALTER TABLE community_proposals
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS agenda text,
  ADD COLUMN IF NOT EXISTS has_fee boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_fee text,
  ADD COLUMN IF NOT EXISTS requirements text,
  ADD COLUMN IF NOT EXISTS registration_info text;
