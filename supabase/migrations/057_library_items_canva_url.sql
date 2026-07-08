-- Canva video embed URL for library items (played inline alongside Drive video).

alter table library_items
  add column if not exists canva_embed_url text;
