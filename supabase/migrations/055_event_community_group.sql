-- Optional community group link for paid events. After admin confirms the
-- first participant payment, they can attach a Zalo / Facebook / Telegram
-- (etc.) group URL so confirmation emails and the event page can point
-- attendees to it.

alter table community_events
  add column if not exists community_group_url text,
  add column if not exists community_group_label text;
