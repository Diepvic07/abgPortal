-- Library recordings stored in Google Drive and gated by app membership.

create table if not exists library_items (
  id text primary key,
  slug text not null unique,
  title text not null,
  description text not null,
  event_id text references community_events(id) on delete set null,
  drive_file_id text,
  drive_preview_url text,
  thumbnail_url text,
  resource_links jsonb not null default '[]'::jsonb,
  duration_text text,
  speaker_name text,
  recorded_at text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  visibility text not null default 'premium' check (visibility in ('premium')),
  created_by_member_id text not null references members(id),
  created_at text not null,
  updated_at text not null,
  published_at text
);

create index if not exists idx_library_items_status on library_items(status);
create index if not exists idx_library_items_event_id on library_items(event_id);
create index if not exists idx_library_items_published_at on library_items(published_at);
