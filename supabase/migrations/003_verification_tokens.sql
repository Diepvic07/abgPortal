-- Verification tokens for NextAuth email magic links
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_verification_token ON verification_tokens(token);

-- Allow service role full access
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to verification_tokens" ON verification_tokens
  FOR ALL USING (auth.role() = 'service_role');
