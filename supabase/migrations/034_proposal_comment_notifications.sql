-- Add proposal_comment to notification preferences
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS proposal_comment BOOLEAN NOT NULL DEFAULT true;

-- Update in_app_notifications type check to include proposal_comment
ALTER TABLE in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_type_check;
ALTER TABLE in_app_notifications ADD CONSTRAINT in_app_notifications_type_check
  CHECK (type IN ('new_proposal', 'new_event', 'connection_request', 'proposal_comment'));
