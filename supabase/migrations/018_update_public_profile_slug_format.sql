-- Public profile slugs should be ASCII, immutable, and use a 5-char ID suffix.

CREATE OR REPLACE FUNCTION generate_public_profile_slug(member_name TEXT, member_id TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized_name TEXT;
  base_slug TEXT;
BEGIN
  normalized_name := translate(
    lower(coalesce(member_name, '')),
    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
  );

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
$$ LANGUAGE plpgsql;

UPDATE members
SET public_profile_slug = generate_public_profile_slug(name, id)
WHERE public_profile_slug IS DISTINCT FROM generate_public_profile_slug(name, id);
