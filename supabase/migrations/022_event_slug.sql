-- Add slug column to community_events
ALTER TABLE community_events ADD COLUMN slug TEXT UNIQUE;

-- Generate slugs for existing events from title
-- Uses lowercase, replaces non-alphanumeric with hyphens, trims hyphens
UPDATE community_events
SET slug = LOWER(
  TRIM(BOTH '-' FROM
    REGEXP_REPLACE(
      REGEXP_REPLACE(title, '[^\w\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  )
);

-- Make slug NOT NULL after backfill
ALTER TABLE community_events ALTER COLUMN slug SET NOT NULL;
