# Event Registration Emails

## Summary

Add event registration email workflows so registrants receive immediate confirmation after a successful event registration and a reminder shortly before the event starts. This feature formalizes the expected content, trigger points, backend support, and idempotency requirements for both member RSVPs and public guest RSVPs.

## Problem

- Event registration currently updates RSVP records but does not send a confirmation email to the registrant.
- Registrants do not receive a proactive reminder shortly before the event begins.
- Event logistics such as date, time, venue, and join information are visible in the UI but are not carried into an email flow.
- The product needs clear email-trigger rules so implementation does not accidentally send duplicate confirmations or reminders.

## Goal

- Send a confirmation email immediately after a successful event registration.
- Send a reminder email about two hours before the event starts.
- Support both authenticated member RSVPs and public guest RSVPs.
- Make the implementation decision-complete so engineering can build it without reopening product policy questions.

## Scope

- Immediate registration confirmation email for:
  - member RSVPs
  - public guest RSVPs
- Two-hour pre-event reminder email for all active registrants
- Email content for:
  - event title
  - event date/time
  - event end time if present
  - event mode
  - venue or join information
  - location URL when available
- Reminder scheduling through a cron-backed server route secured by `CRON_SECRET`
- Backend support for idempotent sending through sent-at tracking fields on RSVP tables
- Helper queries to collect member and guest recipients for reminders

## Non-Goals

- No waitlist system
- No guest locale capture or guest language preference storage
- No redesign of event payment confirmation emails
- No new event metadata fields beyond what already exists on the event model
- No change to the existing member RSVP request payload shape

## Target Users

- ABG members who register for events and need confirmation details in email
- Public guests who register for public events and need event details in email
- Admins and organizers who want a predictable reminder system without duplicate sends
- Engineers implementing event email behavior

## UX / User Flow

1. A member or guest completes a successful registration for an event.
2. The system sends a registration confirmation email after the RSVP record is successfully created.
3. The confirmation email summarizes the event title, time, mode, and venue/join details.
4. If the guest registration requires payment, the confirmation email clarifies that payment verification is still pending and does not imply final payment confirmation.
5. Before the event starts, a cron-backed reminder job finds active registrants for events beginning in about two hours.
6. The system sends one reminder email per active registrant and marks the reminder as sent.
7. Registrants who cancel before the event do not receive reminder emails.

## Functional Requirements

- The system must send a registration confirmation email immediately after a successful member RSVP.
- The system must send a registration confirmation email immediately after a successful guest RSVP.
- Member confirmation emails must send only on the first successful registration, not when an existing RSVP is later upgraded to `will_lead`.
- Guest-facing event emails must always be sent in Vietnamese.
- Member event emails must respect the member locale with Vietnamese fallback.
- Reminder emails must be sent to all active registrants about two hours before the event starts.
- Reminder emails must include:
  - event title
  - start time
  - end time if present
  - event mode
  - venue and/or join information
  - location URL when available
- Email content rules by event mode:
  - offline: include venue details and map/details link if present
  - online: include join information and join link if present; otherwise explain that the link will be shared later
  - hybrid: include both venue details and online join details when available
- The registration API must not roll back a successful RSVP if email delivery fails.
- The reminder job must continue processing remaining recipients if one email send fails.

## Acceptance Criteria

- [ ] A new member RSVP sends one confirmation email after the RSVP is first created.
- [ ] Updating an existing member RSVP from `will_participate` to `will_lead` does not send a second confirmation email.
- [ ] A successful guest RSVP sends one confirmation email.
- [ ] Guest confirmation emails use Vietnamese copy.
- [ ] Paid guest confirmation emails clearly state that payment verification is still pending.
- [ ] A reminder cron job sends reminder emails to active member and guest registrants for events starting in about two hours.
- [ ] Cancelled or inactive registrations are excluded from reminder emails.
- [ ] Each registration receives at most one reminder email for the same event.
- [ ] Reminder emails for cancelled or completed events are never sent.
- [ ] The implementation requires no additional product decision-making about recipient scope, trigger timing, or language policy.

## Edge Cases

- Member RSVP upgrades:
  Existing RSVP updates do not count as new registrations and must not trigger a second confirmation.

- Paid guest registrations:
  Confirmation emails must avoid implying that payment has already been fully approved.

- Online events without a join link:
  Emails should explain that the join link will be shared later instead of showing broken or empty link content.

- Hybrid events:
  Emails should present both venue details and remote join information when both exist.

- Cancelled or completed events:
  Reminder jobs must skip these events entirely.

- Reminder retries:
  Reminder tracking must prevent duplicate sends across repeated cron runs.

- Existing unrelated email failures:
  A failed email send should be logged, but it must not invalidate a successful registration write.

## Data / Backend Impact

- New tracking fields on `community_event_rsvps`:
  - `registration_confirmation_sent_at`
  - `event_reminder_sent_at`
- New tracking fields on `event_guest_rsvps`:
  - `registration_confirmation_sent_at`
  - `event_reminder_sent_at`
- New mailer functions in the centralized Resend notification layer for:
  - event registration confirmation
  - event reminder
- New helper queries for reminder recipient selection:
  - member recipient helper joins RSVP rows to member email, name, and locale
  - guest recipient helper uses guest RSVP email and name directly
- New cron-backed API route secured with `CRON_SECRET`
- New Vercel cron entry for the reminder route
- Reminder tracking timestamps should be written only after a successful send

## Analytics

Recommended tracking:

- `event_registration_confirmation_sent`
- `event_registration_confirmation_failed`
- `event_registration_reminder_sent`
- `event_registration_reminder_failed`

Suggested properties:

- `event_id`
- `event_mode`
- `recipient_type`
- `recipient_locale`
- `has_end_time`
- `has_location_url`
- `requires_payment`

## Rollout Notes

- Ship this as a docs-defined implementation handoff before runtime work begins.
- Apply RSVP table migration changes before deploying reminder logic so sent-at fields exist.
- Add the reminder cron entry before enabling reminder delivery in production.
- Validate the new event email templates with both visual smoke testing and mocked email assertions.

## Dependencies

- Existing centralized email architecture in `lib/resend.ts`
- Existing event registration routes for member and guest flows
- Existing Vercel cron pattern already used for other scheduled notification jobs
- Resend delivery configuration and `CRON_SECRET`
- Event registration data model already containing event date, end date, location, location URL, and event mode

## Open Questions

- None for this feature request. Product decisions are intentionally locked in this document.

## Links

- Related docs: [Event Registration UX Refresh](./2026-04-event-registration-ux-refresh.md)
- Related docs: [Community Events Hub](./2026-04-community-events-hub.md)
