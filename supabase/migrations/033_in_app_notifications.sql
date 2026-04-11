-- In-app notifications (bell icon + unread count)
CREATE TABLE in_app_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_proposal', 'new_event', 'connection_request')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE INDEX idx_in_app_notifications_member_unread ON in_app_notifications(member_id, is_read)
  WHERE is_read = false;
CREATE INDEX idx_in_app_notifications_member_created ON in_app_notifications(member_id, created_at DESC);

ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read own notifications" ON in_app_notifications
  FOR SELECT USING (member_id = auth.uid()::text);

CREATE POLICY "Members can update own notifications" ON in_app_notifications
  FOR UPDATE USING (member_id = auth.uid()::text);
