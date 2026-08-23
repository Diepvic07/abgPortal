# Weekly Activity Email

## Summary

Send a weekly Vietnamese email to approved active ABG members every Monday at 15:00 Vietnam time. The email helps members see events happening this week, review new proposals submitted last week, and submit or recommend new activities.

## Problem

ABG community activity is spread across events, proposals, and informal channels. Members can miss upcoming events or new proposals unless they actively check the portal. A weekly activity email should create a predictable community rhythm without becoming a noisy broadcast.

## Goal

- Help members quickly answer: "What can I join, review, or propose this week?"
- Increase awareness of current-week events.
- Increase proposal views, feedback, and commitments.
- Encourage more members, including Basic members, to submit or recommend new activities.
- Keep the first version simple, automatic, and Vietnamese-only.

## Target Users

- All approved active ABG members, including Basic and Premium members.
- Members who do not habitually open the app or enable browser push notifications.
- Admins who want a preview/test path before the first automated sends.

## Decisions

- Send to all approved active members by default, including Basic members.
- Do not send to suspended, banned, rejected, or pending members.
- Allow members to opt out.
- Send every Monday at 15:00 in `Asia/Ho_Chi_Minh`.
- Vietnam does not use daylight saving time. The equivalent Vercel cron time is Monday 08:00 UTC.
- Use Vietnamese copy only for v1.
- Send fully automatically. Do not require weekly admin approval.
- Provide an internal admin preview/test endpoint before production sending.
- Send only if at least one eligible event or proposal exists.

## Time Windows

All date calculations must use the `Asia/Ho_Chi_Minh` timezone, not the server's local timezone.

Use half-open intervals to avoid off-by-one boundary bugs:

- Current week events: Monday 00:00 inclusive through next Monday 00:00 exclusive.
- Previous week proposals: previous Monday 00:00 inclusive through current Monday 00:00 exclusive.

For the Monday 15:00 send, the "current Monday" is the Monday of that send date in Vietnam time.

## Recipient Rules

Recipients are members where:

- `approval_status = 'approved'`
- `account_status` is neither `suspended` nor `banned`
- primary email exists and is valid enough for Resend delivery
- weekly activity email preference is enabled or missing

The implementation should deduplicate recipients by normalized email address.

## Email Preference

Add a dedicated opt-out preference for this email.

Recommended implementation:

- Add `weekly_activity_email BOOLEAN NOT NULL DEFAULT true` to `notification_preferences`.
- Keep the setting independent from browser push subscription state.
- Show it in the member notification/settings UI under an email section.
- Include an unsubscribe link in every weekly email.
- The unsubscribe link should allow one-click opt-out without requiring login.

The unsubscribe route should only disable this weekly activity email. It must not disable transactional emails such as login, approval, payment, contact request, or event/payment notifications.

## Event Eligibility

Include events that:

- have `status = 'published'`
- have `event_date` in the current-week event window
- are visible/actionable to members

Exclude events that are:

- `draft`
- `cancelled`
- `completed`
- missing a usable event date

Display order:

- Sort ascending by event date.
- Show all events if there are 5 or fewer.
- If there are more than 5, show the next 5 by event date.
- Include a `Xem tất cả sự kiện` or equivalent link to the full events page.

## Proposal Eligibility

Include proposals that:

- were created in the previous-week proposal window
- are visible to members
- can still be viewed or acted on by members

Default included statuses:

- `published`
- `upcoming`
- `project_active` if the existing product treats active projects as joinable/actionable from the proposal page

Exclude proposals that are:

- `removed`
- `archived`
- `completed`
- `project_completed`
- `project_discontinued`
- `project_closed`
- internal/admin-only drafts, if a draft status exists or is later added

Display order:

- Sort newest first by `created_at`.
- Show the newest 5 proposals.
- Include a `Xem tất cả đề xuất` link to the proposals page.

## Empty-State Rules

- If both eligible sections are empty, skip the email entirely.
- If one section has content and the other is empty, still send the email.
- The empty section should show a short useful line, not filler content.
- The CTA to submit or recommend an activity should remain visible even when one section is empty.

## Email Content Requirements

The email should be short and action-oriented.

Recommended structure:

1. Header
   - Title: `Hoạt động ABG tuần này`
   - One-sentence summary of how many events and proposals are included.
2. Primary CTA
   - `Xem hoạt động tuần này`
   - Link to the events/activity page.
3. Events section
   - Show eligible events happening this week.
   - Each item should include title, date/time, location or online/hybrid mode, and a direct link.
4. Proposals section
   - Show eligible proposals submitted last week.
   - Each item should include title, proposer name if available, short description excerpt, and a direct link.
5. Activity invitation section
   - Invite members to submit or recommend an activity.
   - Secondary CTA: `Gửi đề xuất hoạt động`.
6. Footer
   - Explain why the member received the email.
   - Include unsubscribe link.

CTA hierarchy:

- Primary: `Xem hoạt động tuần này`
- Secondary: `Xem đề xuất mới`
- Secondary: `Gửi đề xuất hoạt động`

## Admin Preview And Test Send

Provide an admin-only preview/test endpoint before automated sending.

Minimum acceptable API shape:

- `GET /api/admin/weekly-activity-email/preview`
  - returns the computed send date, event window, proposal window, matching events, matching proposals, and recipient count
- `POST /api/admin/weekly-activity-email/test`
  - sends the current preview email to the requesting admin or an explicitly provided admin/test email
  - must not mark the weekly run as sent

The preview and test-send paths must use the same query/window logic as the production cron route.

## Cron And Delivery

Add a Vercel cron route for Monday 15:00 Vietnam time.

Recommended cron:

```json
{
  "path": "/api/cron/weekly-activity-email",
  "schedule": "0 8 * * 1"
}
```

The cron route must validate `Authorization: Bearer ${CRON_SECRET}` like existing cron routes.

Delivery should be idempotent for a given Vietnam Monday date. If the route is retried, it must not send duplicate emails to the same member for the same weekly run.

Recommended persistence:

- `weekly_activity_email_runs`
  - `id`
  - `week_start_date`
  - `event_window_start`
  - `event_window_end`
  - `proposal_window_start`
  - `proposal_window_end`
  - `status`: `skipped | sending | sent | partial_failed | failed`
  - `recipient_count`
  - `sent_count`
  - `failed_count`
  - `created_at`
  - `sent_at`
- `weekly_activity_email_deliveries`
  - `run_id`
  - `member_id`
  - `email`
  - `status`: `pending | sent | failed | skipped_opt_out`
  - `resend_email_id` nullable
  - `error_message` nullable
  - `created_at`
  - `sent_at`

If the developer chooses a lighter implementation, it must still guarantee no duplicate sends for the same member and send date.

## Resend Requirements

Use the existing Resend setup in `lib/resend.ts`.

Add a dedicated helper, for example `sendWeeklyActivityEmail`, that:

- sends one email per recipient so each email can contain a member-specific unsubscribe link
- uses `EMAIL_FROM`
- escapes user-generated event/proposal content
- includes `List-Unsubscribe` headers if supported by the Resend SDK
- returns enough delivery data to record success or failure

Email sending should be resilient:

- One failed recipient must not fail the entire run.
- Use bounded concurrency or batching rather than an unbounded `Promise.all`.
- Log failures without printing secrets.

## UX Requirements

- The email should feel like an ABG community update, not a marketing campaign.
- Vietnamese copy should be concise, direct, and action-oriented.
- Avoid too many equal-weight buttons.
- Make the date/week context obvious near the top.
- If a section is empty, keep the message short.

## Non-Goals

- No implementation in this spec PR.
- No AI-personalized recommendations.
- No English version in v1.
- No daily email.
- No admin approval workflow before each send.
- No third-party marketing platform.
- No new email provider.
- No changes to transactional emails.
- No changes to push notification behavior except where the settings UI needs a separate email preference.

## Acceptance Criteria

- [ ] A weekly email is sent every Monday at 15:00 Vietnam time.
- [ ] The cron schedule is configured as Monday 08:00 UTC.
- [ ] The email goes to all approved active members with opt-out enabled.
- [ ] Suspended, banned, pending, rejected, and opted-out members do not receive the email.
- [ ] Event selection uses the current Vietnam-time Monday-Sunday week.
- [ ] Proposal selection uses the previous Vietnam-time Monday-Sunday week.
- [ ] Draft, cancelled, completed, removed, archived, and non-actionable items are excluded.
- [ ] The email sends only when at least one eligible event or proposal exists.
- [ ] Events display all if 5 or fewer, otherwise the next 5 by event date.
- [ ] Proposals display the newest 5 from last week.
- [ ] The email includes primary and secondary CTAs as defined above.
- [ ] Members can opt out from the email.
- [ ] Admins can preview the generated content and send a test email.
- [ ] Delivery is idempotent for each weekly run.
- [ ] Failed individual deliveries are recorded without blocking successful recipients.

## Open Questions For Developer Review

- Confirm whether `project_active` proposals should appear in the proposal section.
- Confirm whether event date selection should include events earlier on Monday if they are still `published`.
- Confirm the final URL paths for `Xem hoạt động tuần này`, `Xem đề xuất mới`, and `Gửi đề xuất hoạt động`.
- Confirm whether the existing `notification_preferences` table is acceptable for email preferences or whether a separate `email_preferences` table is preferred.
