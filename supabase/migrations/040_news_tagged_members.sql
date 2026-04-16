-- Admin can tag members in news articles. Stored as array of member IDs.
ALTER TABLE news ADD COLUMN IF NOT EXISTS tagged_member_ids TEXT[] NOT NULL DEFAULT '{}';

-- New in-app notification type: news_tagged (admin tagged you in a news article).
ALTER TABLE in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_type_check;
ALTER TABLE in_app_notifications
  ADD CONSTRAINT in_app_notifications_type_check
  CHECK (type IN (
    'new_proposal', 'new_event', 'connection_request',
    'proposal_comment', 'discussion_meeting',
    'news_comment', 'news_tagged'
  ));

-- Notification preference toggle for "tagged in news"
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS news_tagged BOOLEAN NOT NULL DEFAULT true;
