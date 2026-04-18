# PRD: Member Scoring and Leaderboard v1

## Document Status
- Status: Proposed
- Version: v1
- Audience: Engineering
- Scope: Backend scoring system + member-facing leaderboard only

## 1. Summary
ABG Alumni Connect needs a member scoring system that recognizes two kinds of contribution:
- real participation in community activity, especially completed events
- meaningful engagement on the platform through high-quality discussion

This PRD defines a v1 implementation that is aligned to the current application architecture:
- member-facing hubs centered on `/events`, `/profile`, `/members`, and `/history`
- Supabase-backed domain models and service layers in `lib/supabase-events.ts`, `lib/supabase-community.ts`, `lib/supabase-db.ts`, and `lib/member-references.ts`
- existing event attendance fields on `community_event_rsvps`

The deliverable has two parts:
1. a backend system that records scoring facts and aggregates member scores for calendar month, quarter, and year
2. a frontend leaderboard page for authenticated approved members

This PRD does not include badges, rewards, QR check-in, or any public leaderboard.

## 2. Problem Statement
The product currently tracks activity across events, proposals, references, connections, and comments, but it does not have a unified scoring model to recognize member contribution.

Without a scoring system:
- members who organize or attend real events are not visibly recognized
- proposal traction is visible only within the proposal itself
- engagement is fragmented across proposals and event threads
- the existing lightweight proposal leaderboard in `lib/supabase-community.ts#getLeaderboard` only reflects commitment activity and cannot represent the broader community contribution model

The system must reward fulfilled contribution rather than low-signal activity. In particular:
- real participation should outweigh intent
- a member who actually shows up should rank above a member who only comments or promises to participate
- spam-prone actions such as RSVP, sending connection requests, reactions, and raw proposal creation should not earn score

## 3. Goals
- Recognize real participation first and meaningful engagement second.
- Support a single member leaderboard for calendar month, quarter, and year.
- Reuse the current Supabase domain tables as source-of-truth activity records.
- Keep scoring explainable, traceable, and idempotent.
- Keep the implementation compatible with the current Next.js App Router and server-side Supabase service pattern.

## 4. Non-Goals
- Public leaderboard pages
- Badges, prizes, reward redemption, or money-based incentives
- QR attendance check-in
- Real-time ranking updates over websockets
- Replacing the existing events, proposals, references, or contact-request domain workflows

## 5. Product Principles
- Participation is more important than intent.
- Real-world contribution has the highest weight.
- Engagement matters, but it must remain secondary to verified participation.
- Proposal creation alone is not scoreable.
- Proposal creators are rewarded only when their proposal gains real traction or is converted into a real event.
- Outbound spam is never rewarded.
- Leaderboard results must be explainable from stored score facts.

## 6. Current Architecture Mapping

### 6.1 BRV-aligned product surfaces
The recorded BRV architecture describes the app as:
- public and authenticated member layers
- authenticated member hubs around `/events`, `/profile`, `/members`, `/history`, and notifications
- admin management surfaces for proposals, members, and events

This scoring system maps to the authenticated member layer and admin workflows only.

### 6.2 Existing source systems
The scoring system must reuse the current source-of-truth activity models:

#### Events
- `community_events`
- `community_event_rsvps`
- `community_event_comments`
- services in `lib/supabase-events.ts`
- admin event update route in `app/api/admin/community/events/[id]/route.ts`

Relevant existing behavior:
- event completion is already represented by `community_events.status = 'completed'`
- RSVP attendance is already represented by `community_event_rsvps.actual_attendance`
- RSVP attendance quality is already represented by `community_event_rsvps.actual_participation_score`
- proposal-to-event conversion already exists in `createEventFromProposal(...)`

#### Proposals
- `community_proposals`
- `community_commitments`
- `community_proposal_comments`
- services in `lib/supabase-community.ts`
- proposal-to-event admin route in `app/api/admin/community/events/from-proposal/[id]/route.ts`

#### Connections
- `contact_requests`
- services in `lib/supabase-db.ts`
- acceptance flow in `app/api/contact/respond/route.ts`

Important implementation detail:
- accepted direct contact requests are recorded in `contact_requests`
- `connections` rows are only created for some AI-match flows
- therefore the scoring source of truth for connection acceptance in v1 is `contact_requests`, not `connections`

#### References
- `member_references`
- services in `lib/member-references.ts`

### 6.3 Reuse of attendance fields
Attendance verification in v1 must reuse the existing RSVP attendance model:
- `community_event_rsvps.actual_attendance`
- `community_event_rsvps.actual_participation_score`

No new check-in product flow is required in v1.

### 6.4 Required small schema extension
The current RSVP record can represent attendance, but it does not cleanly represent the verified role required for the score rule:
- confirmed speaker / lead / core volunteer = `+80`

V1 therefore requires a small schema extension on `community_event_rsvps`:
- add `verified_event_role` nullable text enum
- allowed values: `attendee`, `lead`

Notes:
- `attendee` means verified participant without lead credit
- `lead` covers speaker, lead, and core volunteer for scoring purposes
- organizer is the admin-selected real organizer from `community_events.organizer_member_id`
- this keeps v1 aligned to the existing RSVP-based attendance model without introducing a separate participants table

## 7. Scoring Model

### 7.1 Score categories
- `participation`: events, proposal traction, proposal conversion, references, accepted connections
- `engagement`: high-quality comments and replies

### 7.2 Scoring rules
| Rule key | Category | Score | Trigger |
|---|---|---:|---|
| `event.organizer.completed` | participation | `+100` | Admin-selected organizer when an event becomes completed |
| `event.lead.completed` | participation | `+80` | Member with verified role `lead` on a completed event |
| `event.attendee.offline.completed` | participation | `+30` | Member with verified offline attendance on a completed event |
| `event.attendee.online.completed` | participation | `+20` | Member with verified online attendance on a completed event |
| `proposal.traction.reached` | participation | `+20` | Proposal crosses traction threshold for the first time |
| `proposal.converted_to_event` | participation | `+30` | Admin converts proposal into an event |
| `reference.written` | participation | `+20` | Member writes a unique reference |
| `connection.accepted` | participation | `+10` | Recipient accepts a contact request |
| `comment.qualified` | engagement | `+5` | Qualified top-level comment on event or proposal |
| `comment.reply.qualified` | engagement | `+5` | Qualified reply on event or proposal |
| `comment.reply.received` | engagement | `+5` | Another member posts a qualified reply to your qualified comment |

### 7.3 Explicitly non-scored actions
The following actions must always score `0`:
- event RSVP by itself
- proposal commitment by itself (`will_participate`, `will_lead`)
- poll votes
- discussion responses
- reactions
- sending a connection request
- declining a connection request
- creating a proposal that never reaches traction

### 7.4 Event precedence rule
A member must receive only the highest qualifying event score per event.

Precedence order:
1. organizer `+100`
2. verified lead `+80`
3. verified attendee offline `+30`
4. verified attendee online `+20`
5. RSVP only `0`

If a member qualifies for more than one role on the same event:
- only the highest role is kept
- lower-role score facts for the same member and event must not coexist as active positive score events

### 7.5 Proposal traction rule
A proposal becomes scoreable only when it first reaches all of the following:
- at least `3` unique members other than the proposal creator
- each qualifying member has `commitment_level` in `will_participate` or `will_lead`
- `interested` does not count
- the proposer’s own commitment does not count

Traction is a milestone:
- it is awarded once
- it is not revoked if the proposal later drops below the threshold
- it is revoked only if the proposal is later removed as spam or invalidated by admin moderation

### 7.6 Qualified comment rule
A comment is scoreable only if all of the following are true:
- it is attached to an event or proposal thread
- `status = 'visible'`
- visible body length is at least `40` characters after trimming
- it is not a self-reply
- it is not deleted or hidden
- it is not duplicate/template spam under the v1 duplicate rule

V1 duplicate/template rule:
- normalize body by trimming, lowercasing, and collapsing whitespace
- a comment is not scoreable if its normalized body exactly matches another visible comment by the same member within the last `30` days across event and proposal comment tables
- admins can still hide/remove low-quality comments that pass this exact-match rule; hidden or removed comments lose score

Qualified comment scoring:
- top-level comment: `comment.qualified`
- reply: `comment.reply.qualified`
- if another member adds a qualified reply to your qualified comment, you also receive `comment.reply.received`

Comment edits:
- comment score qualification must be re-evaluated on edit
- if a previously scored comment becomes non-qualifying, a reversal must be written
- if a previously non-scored comment becomes qualifying after edit, the score may be written at edit time using the original comment as the source object

## 8. Ranking Windows
Leaderboard periods in v1:
- calendar month
- calendar quarter
- calendar year

Period boundaries:
- use `Asia/Ho_Chi_Minh` timezone
- month starts on the first day of the calendar month at `00:00`
- quarter starts on Jan 1, Apr 1, Jul 1, or Oct 1 at `00:00`
- year starts on Jan 1 at `00:00`

Period attribution:
- each score event is attributed by its `effective_at` timestamp in `Asia/Ho_Chi_Minh`
- event completion-derived scores use the event completion timestamp
- proposal traction uses the timestamp of the qualifying commitment that crosses the threshold
- proposal conversion uses the event creation timestamp from the conversion flow
- accepted connection uses `contact_requests.responded_at`
- reference score uses reference creation time
- comment-based score uses comment creation or qualifying edit time

## 9. Backend Design

### 9.1 Storage model
V1 uses:
1. an append-only ledger of scoring facts
2. a denormalized aggregate table for leaderboard reads

This must not be implemented as a single mutable score field on `members`.

### 9.2 New table: `score_events`
Purpose:
- immutable record of every score fact
- traceable source of truth for why a member has points
- supports idempotent writes and reversal entries

Required columns:
- `id` text primary key
- `member_id` text not null references `members(id)`
- `rule_key` text not null
- `category` text not null check in `participation`, `engagement`
- `score` integer not null
- `source_type` text not null
- `source_id` text not null
- `effective_at` text not null
- `idempotency_key` text not null unique
- `is_reversal` boolean not null default false
- `reverses_score_event_id` text nullable references `score_events(id)`
- `metadata` jsonb not null default `{}`
- `created_at` text not null

Recommended `source_type` values:
- `event`
- `proposal`
- `contact_request`
- `member_reference`
- `proposal_comment`
- `event_comment`

Recommended metadata:
- event title or proposal title snapshot
- participation mode (`offline` or `online`)
- verified event role
- parent comment id for reply-based rules
- related member id for reply-received bonus

### 9.3 New table: `member_score_periods`
Purpose:
- fast leaderboard reads by period
- store denormalized totals and breakdowns per member and period

Required columns:
- `member_id` text not null references `members(id)`
- `period_type` text not null check in `month`, `quarter`, `year`
- `period_start` text not null
- `period_end` text not null
- `timezone` text not null
- `total_score` integer not null default 0
- `participation_score` integer not null default 0
- `engagement_score` integer not null default 0
- `event_score` integer not null default 0
- `proposal_score` integer not null default 0
- `reference_score` integer not null default 0
- `connection_score` integer not null default 0
- `comment_score` integer not null default 0
- `last_scored_at` text nullable
- `updated_at` text not null

Primary key:
- `(member_id, period_type, period_start)`

### 9.4 Idempotency model
Every score write must use a stable `idempotency_key`.

Required key shapes:
- event organizer: `event:{event_id}:member:{member_id}:rule:event.organizer.completed`
- event attendee/lead: `event:{event_id}:member:{member_id}:rule:{rule_key}`
- proposal traction: `proposal:{proposal_id}:rule:proposal.traction.reached`
- proposal converted: `proposal:{proposal_id}:rule:proposal.converted_to_event`
- reference written: `reference:{reference_id}:rule:reference.written`
- accepted connection: `contact_request:{request_id}:rule:connection.accepted`
- qualified comment: `comment:{comment_id}:rule:{rule_key}`

Reprocessing the same domain event must not duplicate score rows.

### 9.5 Reversal model
The ledger is append-only. Reversals must be written as compensating negative score events.

Examples:
- event reopened from `completed` back to another status
- verified attendee flag removed
- verified role downgraded from `lead` to `attendee`
- reference deleted or invalidated
- accepted contact request manually reverted
- comment hidden, removed, deleted, or edited below qualification threshold

Reversal rules:
- write a new `score_events` row with the negative score
- set `is_reversal = true`
- set `reverses_score_event_id` to the original score row
- use a unique reversal idempotency key

### 9.6 Aggregate maintenance
`member_score_periods` must be updated whenever a new score event or reversal is written.

V1 implementation requirement:
- write the ledger event first
- then upsert the affected member’s period rows for month, quarter, and year derived from `effective_at`

Because the codebase currently uses request/response server routes and server-side Supabase helpers, v1 should keep aggregation logic in a shared server module and call it from the existing domain service flows. A background queue is not required for v1.

### 9.7 Trigger points by domain flow

#### Completed events with verified role/attendance
Source systems:
- `app/api/admin/community/events/[id]/route.ts`
- `lib/supabase-events.ts`

Implementation:
- event scoring is finalized when an event is marked `completed`
- on completion, scoring logic inspects the selected organizer and all RSVP records for that event
- only members with verified attendance or verified role are scoreable
- organizer scoring uses `community_events.organizer_member_id`, falling back to `community_events.created_by_member_id` for older rows
- attendee and lead scoring use `community_event_rsvps.actual_attendance`, `community_events.event_mode`, and `community_event_rsvps.verified_event_role`

#### Proposal traction threshold crossing
Source systems:
- `community_commitments`
- `lib/supabase-community.ts`

Implementation:
- after commitment insert/update/delete, recompute whether the proposal has already crossed the traction threshold
- when the threshold is crossed for the first time, write one score event for the proposal creator
- do not write any score for raw commitments themselves

#### Proposal converted to event
Source systems:
- `app/api/admin/community/events/from-proposal/[id]/route.ts`
- `createEventFromProposal(...)`

Implementation:
- after successful event creation from proposal, write one `proposal.converted_to_event` score event for the proposal creator
- do not wait for event completion for this rule

#### Reference creation
Source systems:
- `member_references`
- `lib/member-references.ts`

Implementation:
- on successful reference creation, write one `reference.written` score event for `writer_member_id`
- because references are already unique per writer and recipient, one reference maps to one score event

#### Accepted contact request
Source systems:
- `contact_requests`
- `app/api/contact/respond/route.ts`
- `lib/supabase-db.ts`

Implementation:
- when a request changes to `accepted`, write one `connection.accepted` score event for `target_id`
- `requester_id` gets zero score
- use the `contact_requests` row as the score source of truth

#### Qualified comments, replies, and reply-received bonus
Source systems:
- `community_event_comments`
- `community_proposal_comments`
- existing comment create/update/delete/moderation flows in `lib/supabase-events.ts` and `lib/supabase-community.ts`

Implementation:
- on comment create and update, evaluate qualification
- on delete or moderation away from `visible`, reverse any active score facts for that comment
- if a qualified reply is created by another member, write:
  - `comment.reply.qualified` for the replier
  - `comment.reply.received` for the parent comment author
- self-replies never qualify for either rule

### 9.8 Backfill requirement
V1 requires a backfill utility so historical activity can populate the leaderboard.

Required implementation artifact:
- one admin-safe backfill script or command that can rebuild scores from existing data without duplication

Backfill requirements:
- scan existing qualifying events, proposals, references, accepted contact requests, and comments
- use the same rule logic and idempotency keys as live scoring
- support reruns without duplicate score facts
- rebuild `member_score_periods` from `score_events` if needed

## 10. Frontend Design

### 10.1 Route
Add a new authenticated member page at:
- `/members/leaderboard`

Rationale:
- leaderboard ranks members
- it belongs with the member directory rather than public pages
- this keeps navigation aligned to the existing authenticated member information architecture

### 10.2 Access control
The page and its API must be available only to authenticated approved members.

Expected behavior:
- unauthenticated users are redirected through the existing auth flow
- authenticated but unapproved users are blocked with the existing approved-member gating pattern
- the leaderboard is not exposed publicly

### 10.3 Page requirements
The page must include:
- page title and short explainer
- period switcher for `Month`, `Quarter`, and `Year`
- ranked list of top members
- current-user highlight even if the user is outside the default top list
- empty state for periods with no score data

Each ranking row must show:
- rank
- member avatar
- member name
- member `abg_class`
- total score
- compact breakdown: `Participation` and `Engagement`
- link to the member profile if profile access already exists for the viewer

### 10.4 Default ranking slice
Default response should return top `50` members for the requested period.

If the current member is not in the top 50:
- include a separate `current_member` payload
- render it in a pinned “Your ranking” card below the main list

### 10.5 Tie-break rules
Ordering rules:
1. `total_score DESC`
2. `participation_score DESC`
3. `last_scored_at DESC`
4. `member_id ASC`

## 11. API Contract

### 11.1 Leaderboard API
Add:
- `GET /api/leaderboard`

Query params:
- `period`: required, one of `month`, `quarter`, `year`
- `anchor`: optional, `YYYY-MM-DD`; defaults to current date in `Asia/Ho_Chi_Minh`
- `limit`: optional, default `50`, max `100`

Response shape:
```json
{
  "period": {
    "type": "month",
    "label": "April 2026",
    "start": "2026-04-01T00:00:00+07:00",
    "end": "2026-05-01T00:00:00+07:00",
    "timezone": "Asia/Ho_Chi_Minh"
  },
  "rankings": [
    {
      "rank": 1,
      "member": {
        "id": "mem_123",
        "name": "Member Name",
        "avatar_url": "https://...",
        "abg_class": "ABG 2018",
        "public_profile_slug": "member-name"
      },
      "total_score": 180,
      "participation_score": 160,
      "engagement_score": 20,
      "breakdown": {
        "events": 130,
        "proposals": 30,
        "references": 20,
        "connections": 0,
        "comments": 20
      },
      "last_scored_at": "2026-04-14T20:10:00+07:00"
    }
  ],
  "current_member": null
}
```

Implementation note:
- the endpoint should query `member_score_periods` and join minimal member identity fields
- it should not recompute scores directly from source activity tables during request handling

## 12. Admin Workflow Expectations

### 12.1 Event completion workflow
Before a completed event can score correctly, admins must be able to:
- mark the event as `completed`
- mark RSVP attendance in `community_event_rsvps.actual_attendance`
- set `verified_event_role` where applicable

Expected admin behavior:
- organizer score is automatic from the event creator
- lead score is awarded only when the admin verifies the role
- attendance score is awarded only when the admin verifies attendance

### 12.2 Proposal conversion workflow
When admin converts a proposal to an event through the existing route:
- proposal creator receives `+30`
- this must happen exactly once per proposal

### 12.3 Comment moderation workflow
Admins already moderate comments via visibility status.

Scoring expectation:
- visible qualifying comments score
- hidden or removed comments lose score through reversal entries

## 13. Acceptance Criteria

### 13.1 Backend
- A new `score_events` ledger exists and is append-only.
- A new `member_score_periods` aggregate table exists for month, quarter, and year periods.
- Event scoring uses only completed events plus verified attendance and verified role.
- Proposal traction scoring fires exactly once when the third qualifying non-author commitment arrives.
- Proposal conversion scoring fires exactly once when a proposal becomes an event.
- Reference scoring awards only the writer.
- Connection scoring awards only the accepter.
- Comment scoring supports qualified top-level comments, qualified replies, and reply-received bonus.
- Reversals are written as negative score events rather than in-place mutation.
- Aggregates are updated from ledger writes and support deterministic leaderboard reads.
- Historical backfill can be rerun without duplicating scores.

### 13.2 Frontend
- Authenticated approved members can open `/members/leaderboard`.
- The page supports `Month`, `Quarter`, and `Year`.
- The page displays top ranked members for the requested period.
- The current member is highlighted even when outside the default top list.
- Empty periods render a proper empty state.
- Public and unauthenticated users cannot access the leaderboard.

### 13.3 Data integrity
- For a single event, a member only receives the highest qualifying event role score.
- Non-scored actions never create score events.
- `contact_requests` is the source of truth for accepted connection scoring.
- Comment qualification is re-evaluated on edit and moderation.

## 14. Test Plan

### 14.1 Scoring correctness
- organizer on completed event receives `+100`
- verified lead on completed event receives `+80`
- verified offline attendee on completed event receives `+30`
- verified online attendee on completed event receives `+20`
- member matching multiple roles on the same event receives only the highest event score
- RSVP without verified attendance receives `0`
- proposal traction fires only once at the first qualifying threshold crossing
- proposer’s own commitment does not count toward traction
- `interested` does not count toward traction
- proposal conversion fires only once
- accepted connection awards `+10` only to `target_id`
- reference awards `+20` only to the writer
- top-level comment, reply, and reply-received bonus score correctly
- self-replies receive `0`

### 14.2 Reversal correctness
- event reopened from `completed` reverses event-derived scores
- removing attendance reverses attendee score
- downgrading verified role from `lead` to `attendee` reverses `+80` and applies the correct attendee score
- deleting or hiding a scored comment reverses the comment score
- removing a qualifying reply also reverses the parent’s reply-received bonus

### 14.3 Period aggregation
- month, quarter, and year buckets are computed in `Asia/Ho_Chi_Minh`
- scores around month-end and quarter-end land in the correct bucket
- rerunning the same handler does not create duplicate score facts
- full backfill rebuilds the same period totals as live scoring

### 14.4 Frontend behavior
- period switcher loads the correct leaderboard period
- current member row renders when outside the top list
- empty state renders for periods without data
- ordering respects tie-break rules

## 15. Out of Scope for v1
- public leaderboard pages
- monetary rewards or prizes
- badges or profile achievements
- QR code attendance flows
- advanced anti-abuse heuristics beyond the explicit v1 duplicate-comment rule and moderation reversals
