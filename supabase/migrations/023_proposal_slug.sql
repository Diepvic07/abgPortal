-- Add slug column to community_proposals
ALTER TABLE community_proposals ADD COLUMN slug TEXT UNIQUE;

-- Generate slugs for existing proposals
UPDATE community_proposals
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
ALTER TABLE community_proposals ALTER COLUMN slug SET NOT NULL;
