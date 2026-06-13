-- Backfill: existing project_* proposals were formed before the auto-join
-- rule landed, so they only contain the creator. Add every member whose
-- commitment_level is will_participate or will_lead. The trigger on
-- proposal_project_members will refresh project_member_count for us.

insert into proposal_project_members (proposal_id, member_id, joined_at)
select
  c.proposal_id,
  c.member_id,
  to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
from community_commitments c
join community_proposals p on p.id = c.proposal_id
where p.status in (
  'project_active',
  'project_completed',
  'project_discontinued',
  'project_closed'
)
  and c.commitment_level in ('will_participate', 'will_lead')
on conflict (proposal_id, member_id) do nothing;
