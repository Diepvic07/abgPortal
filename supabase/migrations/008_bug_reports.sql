-- Bug reports table for in-app bug reporting
CREATE TABLE IF NOT EXISTS bug_reports (
  id TEXT PRIMARY KEY,
  reporter_email TEXT NOT NULL,
  page_url TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fixed', 'wontfix')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bug_reports_status_created ON bug_reports (status, created_at DESC);

-- Storage bucket for bug report screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bug-screenshots',
  'bug-screenshots',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
