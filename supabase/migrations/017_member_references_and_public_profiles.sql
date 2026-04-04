-- Premium references and public profiles

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS public_profile_slug TEXT,
  ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION generate_public_profile_slug(member_name TEXT, member_id TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
BEGIN
  base_slug := trim(BOTH '-' FROM regexp_replace(regexp_replace(lower(member_name), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'));

  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'member';
  END IF;

  RETURN base_slug || '-' || substring(replace(member_id, '-', '') FROM 1 FOR 8);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_member_public_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_profile_slug IS NULL OR NEW.public_profile_slug = '' THEN
    NEW.public_profile_slug := generate_public_profile_slug(NEW.name, NEW.id);
  END IF;

  NEW.public_profile_enabled := (
    NEW.status = 'active'
    AND NEW.approval_status = 'approved'
    AND (NEW.paid = TRUE OR NEW.payment_status = 'paid')
    AND (
      NEW.membership_expiry IS NULL
      OR (NEW.membership_expiry::timestamptz + interval '7 days') > now()
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_member_public_profile_fields ON members;
CREATE TRIGGER trg_sync_member_public_profile_fields
  BEFORE INSERT OR UPDATE OF name, status, approval_status, paid, payment_status, membership_expiry, public_profile_slug
  ON members
  FOR EACH ROW
  EXECUTE FUNCTION sync_member_public_profile_fields();

UPDATE members
SET
  public_profile_slug = generate_public_profile_slug(name, id),
  public_profile_enabled = (
    status = 'active'
    AND approval_status = 'approved'
    AND (paid = TRUE OR payment_status = 'paid')
    AND (
      membership_expiry IS NULL
      OR (membership_expiry::timestamptz + interval '7 days') > now()
    )
  )
WHERE public_profile_slug IS NULL
   OR public_profile_slug = ''
   OR public_profile_enabled IS DISTINCT FROM (
     status = 'active'
     AND approval_status = 'approved'
     AND (paid = TRUE OR payment_status = 'paid')
     AND (
       membership_expiry IS NULL
       OR (membership_expiry::timestamptz + interval '7 days') > now()
     )
   );

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_public_profile_slug
  ON members(public_profile_slug);

CREATE TABLE IF NOT EXISTS member_references (
  id TEXT PRIMARY KEY,
  writer_member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recipient_member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  relationship_context TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  is_publicly_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  moderated_at TEXT,
  moderated_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  moderation_note TEXT,
  CONSTRAINT member_references_writer_recipient_unique UNIQUE (writer_member_id, recipient_member_id)
);

CREATE INDEX IF NOT EXISTS idx_member_references_recipient
  ON member_references(recipient_member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_references_public
  ON member_references(recipient_member_id, is_publicly_visible, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_references_status
  ON member_references(status, created_at DESC);
