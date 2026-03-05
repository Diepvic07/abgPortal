-- ============================================
-- Migration: 001_create_tables.sql
-- Supabase schema for ABG Alumni Connect
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== MEMBERS ====================
CREATE TABLE members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT '',
  company TEXT DEFAULT '',
  expertise TEXT DEFAULT '',
  can_help_with TEXT DEFAULT '',
  looking_for TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  voice_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  paid BOOLEAN DEFAULT false,
  free_requests_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Contact & Social
  phone TEXT,
  facebook_url TEXT,
  linkedin_url TEXT,
  company_website TEXT,
  country TEXT,
  -- Job
  open_to_work BOOLEAN DEFAULT false,
  job_preferences TEXT DEFAULT '',
  hiring BOOLEAN DEFAULT false,
  hiring_preferences TEXT DEFAULT '',
  -- Demographics
  gender TEXT CHECK (gender IN ('Female', 'Male', 'Undisclosed') OR gender IS NULL),
  relationship_status TEXT,
  -- Auth & Security
  auth_provider TEXT,
  auth_provider_id TEXT,
  last_login TIMESTAMPTZ,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned')),
  total_requests_count INTEGER DEFAULT 0,
  requests_today INTEGER DEFAULT 0,
  -- Profile
  abg_class TEXT,
  nickname TEXT,
  display_nickname_in_search BOOLEAN DEFAULT false,
  display_nickname_in_match BOOLEAN DEFAULT false,
  display_nickname_in_email BOOLEAN DEFAULT false,
  discord_username TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'expired')),
  membership_expiry TIMESTAMPTZ,
  -- Approval
  approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  is_csv_imported BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  -- Dating Profile
  self_description TEXT,
  truth_lie TEXT,
  ideal_day TEXT,
  qualities_looking_for TEXT,
  core_values TEXT,
  deal_breakers TEXT,
  interests TEXT,
  dating_message TEXT,
  other_share TEXT,
  dating_profile_complete BOOLEAN DEFAULT false,
  -- Monthly Tracking
  requests_this_month INTEGER DEFAULT 0,
  month_reset_date DATE,
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_approval_status ON members(approval_status);
CREATE INDEX idx_members_paid ON members(paid);
CREATE INDEX idx_members_account_status ON members(account_status);

-- ==================== REQUESTS ====================
CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  request_text TEXT DEFAULT '',
  matched_ids TEXT DEFAULT '',
  selected_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'connected', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now(),
  category TEXT CHECK (category IN ('love', 'job', 'hiring', 'partner') OR category IS NULL),
  custom_intro_text TEXT
);

CREATE INDEX idx_requests_requester ON requests(requester_id);
CREATE INDEX idx_requests_status ON requests(status);

-- ==================== CONNECTIONS ====================
CREATE TABLE connections (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  from_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  intro_sent BOOLEAN DEFAULT false,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_connections_to_id ON connections(to_id);
CREATE INDEX idx_connections_from_id ON connections(from_id);

-- ==================== REQUEST AUDIT ====================
CREATE TABLE request_audits (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  request_id TEXT,
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  timestamp TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  request_type TEXT DEFAULT ''
);

CREATE INDEX idx_audits_member ON request_audits(member_id);

-- ==================== LOVE MATCH REQUESTS ====================
CREATE TABLE love_match_requests (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  from_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'refused', 'ignored')),
  from_profile_shared JSONB DEFAULT '{}',
  to_profile_shared JSONB,
  viewed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_love_match_from ON love_match_requests(from_id);
CREATE INDEX idx_love_match_to ON love_match_requests(to_id);

-- ==================== NEWS ====================
CREATE TABLE news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'Announcement' CHECK (category IN ('Edu', 'Business', 'Event', 'Course', 'Announcement')),
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  image_url TEXT,
  author_name TEXT DEFAULT 'ABG Admin',
  published_date TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  title_vi TEXT,
  excerpt_vi TEXT,
  content_vi TEXT
);

CREATE INDEX idx_news_slug ON news(slug);
CREATE INDEX idx_news_published ON news(is_published);
CREATE INDEX idx_news_category ON news(category);

-- ==================== UPDATED_AT TRIGGER ====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
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
