-- Push subscriptions (one per device per member)
-- Supports multiple devices per member via UNIQUE(member_id, endpoint)
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  last_used_at TEXT,
  UNIQUE(member_id, endpoint)
);
CREATE INDEX idx_push_subscriptions_member_id ON push_subscriptions(member_id);

-- Notification preferences (missing row = all enabled)
CREATE TABLE notification_preferences (
  member_id TEXT PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  connection_request BOOLEAN NOT NULL DEFAULT true,
  new_event BOOLEAN NOT NULL DEFAULT true,
  new_proposal BOOLEAN NOT NULL DEFAULT true,
  updated_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- RLS (defense in depth — server uses service role key which bypasses RLS,
-- but this protects against accidental client-side Supabase access)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own subscriptions" ON push_subscriptions
  FOR ALL USING (member_id = auth.uid()::text);

CREATE POLICY "Members can manage own preferences" ON notification_preferences
  FOR ALL USING (member_id = auth.uid()::text);
