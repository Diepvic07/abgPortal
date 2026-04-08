-- Add genre (topic) field to community_proposals for grouping by subject matter
-- Genre is separate from category (which describes activity type like event/charity)
ALTER TABLE community_proposals ADD COLUMN IF NOT EXISTS genre TEXT DEFAULT 'other';
