-- Denormalize the "next event date" on the proposal row so listings can
-- sort by "Sắp diễn ra" and show a date pill without joining the
-- discussion table.

alter table community_proposals
  add column if not exists next_event_date text;

-- Backfill: prefer the scheduled discussion's meeting_date, fall back to
-- the creator-set target_date.
update community_proposals p set
  next_event_date = coalesce(
    (select meeting_date from proposal_discussions d
       where d.proposal_id = p.id
         and d.status = 'scheduled'
       limit 1),
    p.target_date
  )
where p.next_event_date is null;

create index if not exists idx_proposals_next_event_date
  on community_proposals(next_event_date);
