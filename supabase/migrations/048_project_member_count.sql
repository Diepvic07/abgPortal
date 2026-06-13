-- Denormalize project member count on the proposal row so listings
-- (e.g. the Dự án tab) can show "N members" without N+1 queries.

alter table community_proposals
  add column if not exists project_member_count integer not null default 0;

-- Backfill from existing membership rows.
update community_proposals p set
  project_member_count = coalesce(
    (select count(*) from proposal_project_members m where m.proposal_id = p.id),
    0
  );

-- Trigger keeps project_member_count in sync as members join/leave.
create or replace function update_proposal_project_member_count() returns trigger as $$
declare
  target_proposal_id text;
begin
  if tg_op = 'DELETE' then
    target_proposal_id := old.proposal_id;
  else
    target_proposal_id := new.proposal_id;
  end if;

  update community_proposals set
    project_member_count = (
      select count(*) from proposal_project_members where proposal_id = target_proposal_id
    ),
    updated_at = to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  where id = target_proposal_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_project_member_count on proposal_project_members;
create trigger trg_project_member_count
  after insert or update or delete on proposal_project_members
  for each row execute function update_proposal_project_member_count();
