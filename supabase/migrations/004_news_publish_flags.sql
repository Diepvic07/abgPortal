-- Add per-language publish flags to news table
ALTER TABLE news ADD COLUMN is_published_vi BOOLEAN DEFAULT false;
ALTER TABLE news ADD COLUMN is_published_en BOOLEAN DEFAULT false;

-- Migrate existing data: copy is_published to both language flags
UPDATE news SET is_published_vi = is_published, is_published_en = is_published;

-- Drop old column
ALTER TABLE news DROP COLUMN is_published;
