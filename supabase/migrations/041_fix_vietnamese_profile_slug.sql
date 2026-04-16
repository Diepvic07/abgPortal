-- Replace the public-profile slug generator. The previous translate()-based
-- version mis-mapped multi-diacritic Vietnamese letters (e.g. "Nguyễn" became
-- "nguyin"). Use PostgreSQL's unaccent extension instead — it reliably strips
-- diacritics across the whole Latin diacritic range.

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION generate_public_profile_slug(member_name TEXT, member_id TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized_name TEXT;
  base_slug TEXT;
BEGIN
  -- unaccent is strict-parameter so we call through public.unaccent explicitly.
  normalized_name := lower(coalesce(public.unaccent(member_name), ''));
  -- unaccent doesn't map Vietnamese đ/Đ — handle them manually.
  normalized_name := translate(normalized_name, 'đĐ', 'dd');

  base_slug := trim(BOTH '-' FROM regexp_replace(
    regexp_replace(normalized_name, '[^a-z0-9]+', '-', 'g'),
    '-+',
    '-',
    'g'
  ));

  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'member';
  END IF;

  RETURN base_slug || '-' || substring(replace(member_id, '-', '') FROM 1 FOR 5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Regenerate slugs for any member whose stored slug doesn't match the new output.
-- Old bookmarked URLs with mangled slugs will stop resolving; /profile/[id] with
-- the UUID still works, and tagged-member links in news articles use UUIDs.
UPDATE members
SET public_profile_slug = generate_public_profile_slug(name, id)
WHERE public_profile_slug IS DISTINCT FROM generate_public_profile_slug(name, id);
