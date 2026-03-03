-- ============================================
-- Migration: 002_rls_policies.sql
-- Row Level Security for ABG Alumni Connect
-- ============================================

-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE love_match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Service role (server-side API routes) gets full access via service_role key

-- Members: public read for approved active members
CREATE POLICY "Anyone can read approved members" ON members
  FOR SELECT USING (approval_status = 'approved' AND account_status = 'active');

CREATE POLICY "Service role full access to members" ON members
  FOR ALL USING (auth.role() = 'service_role');

-- Requests: service role only
CREATE POLICY "Service role full access to requests" ON requests
  FOR ALL USING (auth.role() = 'service_role');

-- Connections: service role only
CREATE POLICY "Service role full access to connections" ON connections
  FOR ALL USING (auth.role() = 'service_role');

-- Audits: service role only
CREATE POLICY "Service role full access to audits" ON request_audits
  FOR ALL USING (auth.role() = 'service_role');

-- Love match: service role only
CREATE POLICY "Service role full access to love_match" ON love_match_requests
  FOR ALL USING (auth.role() = 'service_role');

-- News: public read for published articles
CREATE POLICY "Anyone can read published news" ON news
  FOR SELECT USING (is_published = true);

CREATE POLICY "Service role full access to news" ON news
  FOR ALL USING (auth.role() = 'service_role');
