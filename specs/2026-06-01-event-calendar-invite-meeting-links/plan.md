# Plan

## 1. Event Invite UI
1. Replace Google Meet-specific labels, placeholders, and error messages in `components/events/event-email-invite-section.tsx`.
2. Trim meeting link input before validation and submission.
3. Validate meeting links with URL parsing and require `https:`.
4. Keep the Google Meet creation shortcut only as an optional convenience link, with neutral surrounding copy.

## 2. Event Invite API
1. Replace `meeting_link.startsWith('https://meet.google.com/')` with provider-neutral URL validation in `app/api/community/events/[id]/invite/route.ts`.
2. Normalize whitespace before sending the link to email, in-app, push, and `.ics` helpers.
3. Return provider-neutral API errors.
4. Preserve existing auth and invitee checks.

## 3. Email and Calendar Output
1. Update `generateIcsInvite` in `lib/resend.ts` to use provider-neutral meeting language.
2. Update `sendDiscussionInvitationEmail` wording so event invites do not always say Google Meet.
3. Ensure the submitted link remains the `.ics` `URL` and `LOCATION`.
4. Avoid broad changes to unrelated cancellation or proposal discussion behavior unless required by shared helper compatibility.

## 4. Tests and Verification
1. Add focused unit coverage for meeting-link URL validation if an appropriate utility is extracted.
2. Run lint or targeted type checks for touched files.
3. Manually verify accepted examples:
   1. `https://meet.google.com/abc-defg-hij`
   2. `https://zoom.us/j/123456789?pwd=abc`
   3. `https://teams.microsoft.com/l/meetup-join/...`
4. Manually verify rejected examples:
   1. `meet.google.com/abc-defg-hij`
   2. `javascript:alert(1)`
   3. `not a url`
