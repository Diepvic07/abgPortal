-- Allow library items to link to a completed proposal (in addition to events).

alter table library_items
  add column if not exists proposal_id text references community_proposals(id) on delete set null;

create index if not exists idx_library_items_proposal_id on library_items(proposal_id);
