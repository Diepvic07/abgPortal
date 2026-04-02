-- Event detail clarity and RSVP semantics refresh
-- Adds explicit event_mode and optional RSVP note.
-- Event registration counts now exclude legacy "interested" rows.

ALTER TABLE community_events
  ADD COLUMN IF NOT EXISTS event_mode TEXT;

UPDATE community_events
SET event_mode = CASE
  WHEN event_mode IS NOT NULL THEN event_mode
  WHEN location IS NOT NULL AND location_url IS NOT NULL THEN 'hybrid'
  WHEN location_url IS NOT NULL THEN 'online'
  ELSE 'offline'
END
WHERE event_mode IS NULL;

ALTER TABLE community_events
  ALTER COLUMN event_mode SET DEFAULT 'offline';

ALTER TABLE community_event_rsvps
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE community_event_rsvps
  ALTER COLUMN commitment_level SET DEFAULT 'will_participate';

CREATE OR REPLACE FUNCTION update_event_rsvp_counts() RETURNS TRIGGER AS $$
DECLARE
  target_event_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_event_id := OLD.event_id;
  ELSE
    target_event_id := NEW.event_id;
  END IF;

  UPDATE community_events SET
    rsvp_count = (
      SELECT COUNT(*)
      FROM community_event_rsvps
      WHERE event_id = target_event_id
        AND commitment_level IN ('will_participate', 'will_lead')
    ),
    rsvp_score = (
      SELECT COALESCE(SUM(commitment_weight(commitment_level)), 0)
      FROM community_event_rsvps
      WHERE event_id = target_event_id
        AND commitment_level IN ('will_participate', 'will_lead')
    ),
    updated_at = to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  WHERE id = target_event_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE community_events e
SET
  rsvp_count = (
    SELECT COUNT(*)
    FROM community_event_rsvps r
    WHERE r.event_id = e.id
      AND r.commitment_level IN ('will_participate', 'will_lead')
  ),
  rsvp_score = (
    SELECT COALESCE(SUM(commitment_weight(r.commitment_level)), 0)
    FROM community_event_rsvps r
    WHERE r.event_id = e.id
      AND r.commitment_level IN ('will_participate', 'will_lead')
  ),
  updated_at = to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
