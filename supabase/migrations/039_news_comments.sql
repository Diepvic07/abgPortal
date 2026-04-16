-- News article comments
-- Mirror community_proposal_comments: threaded replies, image uploads, reactions.

CREATE TABLE IF NOT EXISTS news_article_comments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  parent_comment_id TEXT REFERENCES news_article_comments(id) ON DELETE CASCADE,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

CREATE INDEX IF NOT EXISTS idx_news_comments_article ON news_article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_status ON news_article_comments(status);
CREATE INDEX IF NOT EXISTS idx_news_comments_parent ON news_article_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- Denormalized comment count on news articles
ALTER TABLE news ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION update_news_comment_counts() RETURNS TRIGGER AS $$
DECLARE
  target_article_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_article_id := OLD.article_id;
  ELSE
    target_article_id := NEW.article_id;
  END IF;

  UPDATE news SET
    comment_count = (SELECT COUNT(*) FROM news_article_comments WHERE article_id = target_article_id AND status = 'visible')
  WHERE id = target_article_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_news_comment_counts ON news_article_comments;
CREATE TRIGGER trg_news_comment_counts
  AFTER INSERT OR UPDATE OR DELETE ON news_article_comments
  FOR EACH ROW EXECUTE FUNCTION update_news_comment_counts();

-- Extend comment_reactions to support news comments
ALTER TABLE comment_reactions DROP CONSTRAINT IF EXISTS comment_reactions_comment_type_check;
ALTER TABLE comment_reactions
  ADD CONSTRAINT comment_reactions_comment_type_check
  CHECK (comment_type IN ('event', 'proposal', 'news'));

-- Extend in_app_notifications type to allow news_comment
ALTER TABLE in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_type_check;
ALTER TABLE in_app_notifications
  ADD CONSTRAINT in_app_notifications_type_check
  CHECK (type IN ('new_proposal', 'new_event', 'connection_request', 'proposal_comment', 'discussion_meeting', 'news_comment'));

-- Add news_comment preference to notification_preferences
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS news_comment BOOLEAN NOT NULL DEFAULT true;
