-- Proposal status redesign + project lifecycle scaffolding.
-- See PR 1 for the broader rollout plan.

-- 1) Migrate legacy statuses to the new vocabulary.
update community_proposals set status = 'completed' where status = 'selected';
update community_proposals set status = 'upcoming'  where status = 'in_progress';

-- 2) Project-lifecycle columns on the proposal row.
alter table community_proposals
  add column if not exists project_chat_url     text,
  add column if not exists project_status_note  text,
  add column if not exists project_started_at   text;

-- 3) Who has joined a project. No approval; one row per (proposal, member).
create table if not exists proposal_project_members (
  proposal_id text not null references community_proposals(id) on delete cascade,
  member_id   text not null references members(id) on delete cascade,
  joined_at   text not null,
  primary key (proposal_id, member_id)
);

create index if not exists idx_project_members_member on proposal_project_members(member_id);

-- 4) Append-only log of project-status transitions so every member can read
--    the full history of public notes.
create table if not exists proposal_project_status_log (
  id                    text primary key default gen_random_uuid()::text,
  proposal_id           text not null references community_proposals(id) on delete cascade,
  from_status           text,
  to_status             text not null,
  note                  text,
  changed_by_member_id  text references members(id) on delete set null,
  changed_at            text not null
);

create index if not exists idx_project_log_proposal on proposal_project_status_log(proposal_id, changed_at desc);
