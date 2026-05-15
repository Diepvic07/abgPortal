-- Add secondary_emails column to members table
-- Allows members to have multiple contact emails alongside their primary login email
ALTER TABLE members ADD COLUMN IF NOT EXISTS secondary_emails TEXT[] DEFAULT '{}';

-- GIN index for efficient array lookups (needed for login with secondary email)
CREATE INDEX IF NOT EXISTS idx_members_secondary_emails ON members USING GIN (secondary_emails);
