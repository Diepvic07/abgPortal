# Plan

## 1. Data And Idempotency

1. Add a Supabase migration for `weekly_activity_email` opt-out preference.
2. Add delivery/run persistence for weekly activity emails.
3. Add uniqueness constraints so the same member cannot receive the same run twice.
4. Add TypeScript types for weekly run, delivery, email preview data, and email items.
5. Add helper functions for Vietnam-time week-window calculation.

## 2. Query Layer

1. Add a query helper for current-week eligible events.
2. Add a query helper for previous-week eligible proposals.
3. Add a recipient query for approved active members with opt-out enabled.
4. Deduplicate recipients by normalized email.
5. Return both full result counts and the clipped email display lists.

## 3. Email Rendering And Delivery

1. Add `sendWeeklyActivityEmail` to the Resend email module or a focused weekly email module.
2. Render Vietnamese-only HTML with escaped event/proposal content.
3. Include primary and secondary CTAs.
4. Include one-click unsubscribe and, if supported, `List-Unsubscribe` headers.
5. Send per recipient with bounded concurrency.
6. Record delivery success/failure per recipient.

## 4. Cron Route

1. Add `GET /api/cron/weekly-activity-email`.
2. Validate `Authorization: Bearer ${CRON_SECRET}`.
3. Compute the Vietnam Monday send date and windows.
4. Skip and record a skipped run when both sections are empty.
5. Create or reuse the weekly run idempotently.
6. Send the weekly email to eligible recipients.
7. Return run summary: status, recipient count, sent count, failed count, skipped reason if any.
8. Add the Monday 08:00 UTC cron entry to `vercel.json`.

## 5. Admin Preview And Test Send

1. Add `GET /api/admin/weekly-activity-email/preview`.
2. Restrict preview to admins.
3. Return send date, windows, matching content, display content, and recipient count.
4. Add `POST /api/admin/weekly-activity-email/test`.
5. Restrict test send to admins.
6. Send to the requesting admin by default, or an explicitly supplied admin/test email.
7. Ensure test sends do not create or complete a weekly run.

## 6. Member Opt-Out

1. Add a dedicated weekly activity email toggle in member settings.
2. Keep this email preference usable even when browser push is not enabled.
3. Add a one-click unsubscribe route from the email footer.
4. Confirm the unsubscribe route only disables this weekly email.
5. Show a simple confirmation page after unsubscribe.

## 7. Validation And Launch

1. Validate week-window calculations around Sunday/Monday boundaries in Vietnam time.
2. Validate event/proposal eligibility filters.
3. Validate opt-out and unsubscribe behavior.
4. Validate idempotency by triggering the cron twice for the same computed send date.
5. Send a test email through the admin test endpoint.
6. Review the first production run through delivery logs.

## Likely Files

- `supabase/migrations/...`
- `lib/resend.ts` or `lib/weekly-activity-email.ts`
- `lib/weekly-activity-email-query.ts`
- `lib/date-utils.ts` or a focused timezone helper
- `app/api/cron/weekly-activity-email/route.ts`
- `app/api/admin/weekly-activity-email/preview/route.ts`
- `app/api/admin/weekly-activity-email/test/route.ts`
- `app/api/email-preferences/unsubscribe/route.ts`
- `components/notifications/notification-settings.tsx`
- `app/profile/notifications/page.tsx`
- `vercel.json`
- `lib/i18n/translations/vi.ts` if the UI copy goes through existing translations

## Sequencing

Implement in small slices:

1. Time-window helper and tests.
2. Data migration for preference and delivery logs.
3. Query helpers for content and recipients.
4. Email rendering and test-send endpoint.
5. Cron route with idempotent run creation.
6. Member settings toggle and one-click unsubscribe.
7. Production preview, test send, and first-run monitoring.
