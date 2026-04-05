-- Add slug column to community_events
ALTER TABLE community_events ADD COLUMN slug TEXT UNIQUE;

-- Generate slugs for existing events from title
-- Transliterates Vietnamese characters to ASCII, then slugifies
UPDATE community_events
SET slug = LOWER(
  TRIM(BOTH '-' FROM
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRANSLATE(
          LOWER(title),
          'àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ',
          'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
        ),
        '[^a-z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  )
);

-- Make slug NOT NULL after backfill
ALTER TABLE community_events ALTER COLUMN slug SET NOT NULL;
