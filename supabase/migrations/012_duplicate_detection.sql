-- Add duplicate detection columns to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS potential_duplicate_of TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS duplicate_note TEXT;
