-- Add fail_count to track consecutive push delivery failures.
-- Subscriptions are only deleted after 3 consecutive failures (410/404),
-- preventing premature cleanup of iOS PWA subscriptions that may recover.
ALTER TABLE push_subscriptions ADD COLUMN fail_count INTEGER NOT NULL DEFAULT 0;
