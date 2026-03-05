-- ============================================
-- Migration: 006_premium_plan_tables.sql
-- Premium plan: contact_requests + payment_records + search counters
-- ============================================

-- ==================== CONTACT REQUESTS ====================
CREATE TABLE IF NOT EXISTS contact_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  feedback TEXT,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contact_req_requester ON contact_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_contact_req_target ON contact_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_contact_req_token ON contact_requests(token);
CREATE INDEX IF NOT EXISTS idx_contact_req_status ON contact_requests(status);

-- ==================== PAYMENT RECORDS ====================
CREATE TABLE IF NOT EXISTS payment_records (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount_vnd INTEGER NOT NULL DEFAULT 0,
  admin_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_member ON payment_records(member_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_created ON payment_records(created_at);

-- ==================== MEMBER SEARCH COUNTERS ====================
ALTER TABLE members ADD COLUMN IF NOT EXISTS searches_this_month INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS search_month_reset_date TEXT;

-- ==================== RLS ====================
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to contact_requests" ON contact_requests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to payment_records" ON payment_records
  FOR ALL USING (auth.role() = 'service_role');
