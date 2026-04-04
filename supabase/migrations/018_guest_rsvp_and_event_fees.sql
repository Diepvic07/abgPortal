-- Migration 018: Guest RSVP, Event Fees, and Event Payments
-- Adds guest registration for public events and payment tracking

-- ==================== Add columns to community_events ====================

ALTER TABLE community_events ADD COLUMN IF NOT EXISTS fee_premium INTEGER;
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS fee_basic INTEGER;
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS fee_guest INTEGER;
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS capacity_guest INTEGER;
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS payment_qr_url TEXT;
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS guest_rsvp_count INTEGER NOT NULL DEFAULT 0;

-- ==================== Create event_guest_rsvps table ====================

CREATE TABLE IF NOT EXISTS event_guest_rsvps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  status TEXT NOT NULL DEFAULT 'registered',
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  UNIQUE(event_id, guest_email)
);

CREATE INDEX IF NOT EXISTS idx_guest_rsvps_event_id ON event_guest_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_rsvps_email ON event_guest_rsvps(guest_email);

-- ==================== Create event_payments table ====================

CREATE TABLE IF NOT EXISTS event_payments (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  payer_type TEXT NOT NULL CHECK (payer_type IN ('premium', 'basic', 'guest')),
  member_id TEXT REFERENCES members(id),
  guest_rsvp_id TEXT REFERENCES event_guest_rsvps(id) ON DELETE CASCADE,
  amount_vnd INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_by_admin_id TEXT,
  payer_name TEXT NOT NULL,
  payer_email TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  CHECK (member_id IS NOT NULL OR guest_rsvp_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_event_payments_event_id ON event_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_member_id ON event_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_status ON event_payments(status);

-- ==================== Trigger: update guest_rsvp_count ====================

CREATE OR REPLACE FUNCTION update_guest_rsvp_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE community_events SET guest_rsvp_count = (
      SELECT COUNT(*) FROM event_guest_rsvps WHERE event_id = NEW.event_id AND status = 'registered'
    ) WHERE id = NEW.event_id;
  END IF;
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE community_events SET guest_rsvp_count = (
      SELECT COUNT(*) FROM event_guest_rsvps WHERE event_id = OLD.event_id AND status = 'registered'
    ) WHERE id = OLD.event_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_guest_rsvp_count ON event_guest_rsvps;
CREATE TRIGGER trg_update_guest_rsvp_count
  AFTER INSERT OR UPDATE OR DELETE ON event_guest_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_guest_rsvp_count();

-- ==================== RLS Policies ====================

ALTER TABLE event_guest_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_payments ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API routes)
CREATE POLICY "Service role full access on event_guest_rsvps"
  ON event_guest_rsvps FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on event_payments"
  ON event_payments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
