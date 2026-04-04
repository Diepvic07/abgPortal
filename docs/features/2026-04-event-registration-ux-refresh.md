# Event Registration UX Refresh

## Summary

Refresh the Community Events detail and registration flow so members can understand an event before committing, and so the registration state reflects real attendance intent instead of vague interest. This change adds clearer event metadata, replaces the three-state RSVP model with a registration-first flow, and introduces a lightweight confirmation step before a member commits.

## Problem

- The event detail page did not explicitly communicate whether an event was offline, online, or hybrid.
- `event_end_date` existed in the data model but was not visible to members, so event duration was unclear.
- `location` and `location_url` were overloaded, which made online and hybrid events ambiguous.
- The old RSVP model treated `Interested`, `Will Participate`, and `Will Lead` as the same kind of registration state.
- Because `Interested` was part of the RSVP system, member-facing participant counts and attendee lists were less trustworthy.
- The old RSVP buttons committed immediately without giving the user a final review of what they were about to confirm.

## Goal

- Make the event detail page clear enough that a member can decide whether to join without guessing.
- Make registration counts represent actual attendance intent.
- Preserve a stronger organizer role with `Will Lead`, but only after a member has already committed to join.
- Keep friction low while still adding a confirmation step for real registration.

## Scope

- Event detail page redesign for information clarity
- New explicit event mode field: `offline`, `online`, `hybrid`
- Registration flow change from `Interested / Will Participate / Will Lead` to `Will Join` plus gated `Will Lead`
- Confirmation modal before RSVP submission
- Optional organizer note/question attached to RSVP
- RSVP counting logic update so legacy `interested` rows do not count as registered attendees
- Admin event APIs updated to accept the new mode field

## Non-Goals

- No waitlist system in this change
- No organizer reply workflow for RSVP notes in this change
- No redesign of the events list page beyond the existing detail-page entry point
- No admin event creation UI in this change; only API support is added

## Target Users

- Approved members deciding whether to attend an event
- Members volunteering to help run an event
- Admins and organizers who need more trustworthy registration counts

## Why We Are Changing It

### 1. Registration should mean commitment, not curiosity

For events, `Interested` is not the same as a registration. It creates a muddy state where the UI says someone is part of the event, but the organizer still does not know whether that person is actually coming.

Design decision:

- remove `Interested` from the event registration action set
- count only `Will Join` and `Will Lead` as registered attendees

### 2. Event details must answer the basic decision questions

Before a member registers, they should know:

- what kind of event it is
- when it starts and ends
- where it takes place
- how to join if it is online or hybrid
- whether registration is limited

Design decision:

- add explicit `event_mode`
- show start and end time in the detail header
- label venue/join instructions according to the event mode

### 3. `Will Lead` is a stronger commitment and should be earned

`Will Lead` is materially different from joining. It implies ownership, coordination, or support responsibility. Putting it beside a basic RSVP as an equal first-step action encourages premature over-commitment.

Design decision:

- keep `Will Lead`
- require the member to register with `Will Join` first
- allow `Will Lead` as a second-step upgrade after joining

### 4. Confirmation is appropriate for real registration, not for passive interest

The old one-click RSVP flow was fast, but it did not give members a chance to review timing, mode, or logistics before confirming attendance.

Design decision:

- add a lightweight confirmation modal before registering
- include event title, event time, event mode, and selected response
- allow an optional note or question for the organizer inside the confirmation step

## UX / User Flow

1. A member opens an event detail page.
2. The page clearly shows event mode, start/end time, organizer, and attendance instructions.
3. The member chooses `Will Join`.
4. A confirmation modal appears with the key event facts and an optional note field.
5. The member confirms and becomes a registered attendee.
6. After joining, the member can optionally upgrade to `Will Lead`.
7. The attendee list and registration count reflect only members who joined or are leading.

## Functional Requirements

- Every event should expose an explicit event mode.
- Event detail should display:
  - start time
  - end time if present
  - mode
  - organizer
  - venue and/or join link depending on mode
- Event registration should allow only:
  - `Will Join`
  - `Will Lead`
- `Will Lead` should be blocked unless the member is already registered with `Will Join` or already marked as `Will Lead`.
- Registration counts should exclude legacy `interested` records.
- The RSVP confirmation modal should allow an optional note up to 500 characters.
- Members should still be able to cancel their RSVP.

## Acceptance Criteria

- [ ] A member can clearly see whether the event is offline, online, or hybrid.
- [ ] A member can see both the start time and end time when the end time exists.
- [ ] Online events clearly communicate the join link behavior.
- [ ] Hybrid events clearly communicate both venue and online access.
- [ ] `Interested` is no longer available as an event registration action.
- [ ] `Will Lead` is not available as an initial RSVP for a member who has not joined.
- [ ] Only `Will Join` and `Will Lead` contribute to attendee counts.
- [ ] RSVP confirmation includes the core event facts before commit.
- [ ] A member can add an optional note or question during RSVP confirmation.

## Edge Cases

- Legacy event RSVPs with `interested`:
  They remain in the database for history but do not count toward `rsvp_count` after the migration.

- Event missing `event_mode` from older rows:
  Backfill mode from available location fields during migration.

- Online event with no join link yet:
  The UI should state that the link will be shared after registration rather than showing a broken or misleading link.

- Member attempts to become `Will Lead` directly:
  API rejects the request and instructs the member to join first.

- Event reaches seat limit:
  Members who are not already registered cannot newly register.

## Data / Backend Impact

### New / Updated Event Fields

`community_events`

- `event_mode`

`community_event_rsvps`

- `note`

### Backend Rule Changes

- Event RSVP creation accepts only `will_participate` and `will_lead`
- `will_lead` requires an existing RSVP
- Event registration counts exclude `interested`

### Migration

- Add `event_mode`
- Backfill mode using existing `location` and `location_url`
- Add RSVP `note`
- Recompute event registration counts and scores using only attendance-intent RSVP levels

## Analytics

Recommended tracking:

- `event_rsvp_confirm_opened`
- `event_rsvp_confirmed`
- `event_rsvp_cancelled`
- `event_rsvp_upgraded_to_lead`
- `event_rsvp_note_added`

Suggested properties:

- `event_id`
- `event_mode`
- `membership_status`
- `response_level`
- `has_note`

## Rollout Notes

- Apply the DB migration before deploying the UI changes so the new fields and count semantics exist first.
- Existing event detail pages will render more safely after mode backfill is complete.
- Organizers should understand that attendance totals may drop after migration because `interested` users are no longer counted as attendees.

## Dependencies

- Supabase migration deployment
- Event detail frontend deployment
- Admin API consumers updated to send `event_mode`

## Open Questions

- Should RSVP notes be visible to admins only, or also to event leads in a future iteration?
- Should the product eventually support a waitlist when seats are full?

## Links

- Related design: [Community Events Hub](./2026-04-community-events-hub.md)
- Related design: [Community Proposals and Voting](./2026-03-community-proposals-and-voting.md)
