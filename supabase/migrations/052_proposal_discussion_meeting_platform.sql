-- Track which video platform a discussion's meeting link belongs to
-- (meet / zoom / other) so reminders + reschedule emails can label the
-- meeting correctly. Existing rows keep their legacy Google Meet wording.

alter table proposal_discussions
  add column if not exists meeting_platform text;

update proposal_discussions
  set meeting_platform = 'meet'
  where meeting_platform is null
    and meeting_link is not null;
