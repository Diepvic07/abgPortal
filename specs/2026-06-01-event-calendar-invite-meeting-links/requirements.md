# Event Calendar Invite Meeting Links

## Summary

Allow event organizers and admins to send event calendar invitations with any valid web meeting link, including Zoom, Google Meet, Microsoft Teams, or another HTTPS meeting provider, instead of forcing Google Meet links only.

## Problem

- On an event page such as `/events/tao-mot-website-hoan-chinh-trong-30-phut-cung-ai`, the "Send Email Invite & Calendar" panel currently labels the URL field as "Google Meet Link".
- The client blocks submission unless the URL starts with `https://meet.google.com/`.
- The event invite API repeats the same Google Meet-only validation.
- Email and `.ics` calendar output labels every meeting as Google Meet even when the product need is provider-neutral.
- This prevents organizers from using Zoom, Microsoft Teams, or other meeting software.

## Goal

- Event calendar invitations should accept diverse online meeting links while preserving basic URL safety and calendar compatibility.
- User-facing event invite copy should be provider-neutral.
- Calendar invite descriptions, locations, URLs, and email CTAs should point to the submitted meeting link without mislabeling the provider.

## Scope

- Update the event invite panel in `components/events/event-email-invite-section.tsx`.
- Update the event invite API validation in `app/api/community/events/[id]/invite/route.ts`.
- Update shared email/calendar invite generation in `lib/resend.ts` so event invitations do not say "Google Meet" unless the link is actually a Google Meet link.
- Accept valid `https://` URLs for meeting links.
- Keep participant selection, reminder behavior, `.ics` attachment creation, and invite authorization unchanged.

## Non-Goals

- Do not integrate with Zoom, Google Meet, or Microsoft Teams APIs.
- Do not create meeting rooms automatically.
- Do not add new database fields.
- Do not change event RSVP behavior.
- Do not change proposal discussion invites unless separately approved, even though similar Google Meet-only logic exists there.

## Target Users

- Event creators and admins who send event calendar invitations.
- Registered event participants who receive email, in-app, push, and `.ics` calendar invitations.

## UX / User Flow

1. Organizer opens an event detail page.
2. Organizer clicks "Send Email Invite & Calendar".
3. Organizer enters the event date, time, and a meeting link from Zoom, Google Meet, Microsoft Teams, or another HTTPS provider.
4. Organizer selects one or more registered participants.
5. Organizer sends invitations.
6. Participants receive an email and `.ics` invite with the submitted meeting link.
7. Invalid or non-HTTPS URLs show a clear provider-neutral error.

## Functional Requirements

- The event invite UI must label the field as "Meeting link" / Vietnamese equivalent, not "Google Meet Link".
- The placeholder must show provider-neutral examples or copy.
- Client validation must require a non-empty valid HTTPS URL.
- Server validation must require a non-empty valid HTTPS URL.
- Server validation must reject malformed URLs and non-HTTP(S) schemes such as `javascript:`, `data:`, and `mailto:`.
- The "Create Meet" convenience link can remain as "Create Google Meet" if kept, but it must not imply Google Meet is required.
- Email body copy must use provider-neutral wording such as "Meeting link" / "Join meeting".
- `.ics` `DESCRIPTION`, `URL`, and `LOCATION` must use the submitted meeting link.
- Existing invite permissions must remain unchanged: only event creator or admin can view/send invites.

## Acceptance Criteria

- [ ] A Zoom meeting URL can be entered and sent from the event invite panel.
- [ ] A Microsoft Teams meeting URL can be entered and sent from the event invite panel.
- [ ] A Google Meet URL can still be entered and sent.
- [ ] A malformed string is rejected client-side with a provider-neutral error.
- [ ] A malformed string is rejected server-side with a provider-neutral error if submitted directly to the API.
- [ ] A non-HTTPS URL is rejected.
- [ ] The event invite email no longer labels every invite as Google Meet.
- [ ] The `.ics` calendar attachment points to the submitted meeting link.
- [ ] Existing participant loading and selected-recipient behavior remains unchanged.

## Edge Cases

- Meeting URLs with query strings, fragments, encoded characters, or long Teams links should be accepted if they are valid HTTPS URLs.
- Leading and trailing whitespace should not cause a valid URL to fail.
- Empty meeting link should keep the existing required-field behavior, but with provider-neutral wording.
- Existing Google Meet links should continue to work.
- Direct API callers should not bypass URL safety checks.

## Data / Backend Impact

- No database migration.
- No schema change.
- API validation changes only for `POST /api/community/events/[id]/invite`.
- Email/calendar helper wording changes in `lib/resend.ts`.

## Analytics

- No new analytics required for this fix.

## Rollout Notes

- This is a bug fix for the event invite flow.
- Deploy after validation because current production behavior blocks legitimate event operations.

## Dependencies

- Existing event invitation API.
- Existing Resend email helper.
- Existing `.ics` calendar attachment helper.

## Open Questions

- Should the same provider-neutral meeting-link behavior also be applied to proposal discussion scheduling and proposal direct invites in a follow-up fix?

## Links

- Reported live event: `https://www.abgalumni.vn/events/tao-mot-website-hoan-chinh-trong-30-phut-cung-ai`
- Related component: `components/events/event-email-invite-section.tsx`
- Related API: `app/api/community/events/[id]/invite/route.ts`
- Related email helper: `lib/resend.ts`
