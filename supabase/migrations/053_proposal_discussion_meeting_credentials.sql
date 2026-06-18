-- Optional meeting ID / passcode shown in invite emails and calendar
-- entries. Useful for Zoom (and similar platforms) where attendees may
-- want to join via meeting ID instead of clicking the link.

alter table proposal_discussions
  add column if not exists meeting_id text,
  add column if not exists meeting_passcode text;
