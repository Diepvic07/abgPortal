# Validation

## Local Checks

This PR only adds the specification. For implementation PRs, use the project operations guidance: local full-app validation is not always reliable because secrets may be missing.

For this spec PR:

```bash
git diff --check
```

For the eventual implementation PR, run source-level checks that do not require production secrets where practical:

```bash
npm run lint
npm run test
```

Stop quickly and report clearly if local Node tooling stalls or required secrets are unavailable.

## Automated Validation For Implementation

Add or update tests for:

- Vietnam-time week-window calculation:
  - Monday 15:00 Asia/Ho_Chi_Minh send time.
  - current-week event window: Monday 00:00 inclusive to next Monday 00:00 exclusive.
  - previous-week proposal window: previous Monday 00:00 inclusive to current Monday 00:00 exclusive.
- Event eligibility:
  - includes published events in the current week.
  - excludes draft, cancelled, completed, and out-of-window events.
- Proposal eligibility:
  - includes member-visible actionable proposals from the previous week.
  - excludes removed, archived, completed, closed, and out-of-window proposals.
- Empty-state behavior:
  - skip when both sections are empty.
  - send when only events exist.
  - send when only proposals exist.
- Recipient filtering:
  - includes approved active members.
  - excludes suspended, banned, pending, rejected, and opted-out members.
- Idempotency:
  - two cron invocations for the same run do not send duplicate emails.
- Unsubscribe:
  - one-click unsubscribe disables only `weekly_activity_email`.

## Admin Preview Validation

Manually verify:

1. Admin can request the preview endpoint.
2. Non-admin cannot request the preview endpoint.
3. Preview returns the computed Vietnam-time windows.
4. Preview content matches the events/proposals that should appear in the email.
5. Preview recipient count excludes opted-out and inactive members.
6. Admin can send a test email.
7. Test email does not mark the weekly run as sent.

## Cron Validation

Manually verify in a safe environment:

1. Cron route rejects missing or invalid `CRON_SECRET`.
2. Cron route accepts `Authorization: Bearer ${CRON_SECRET}`.
3. Vercel schedule uses `0 8 * * 1`.
4. A run with both sections empty is recorded as skipped and sends no email.
5. A run with content sends to eligible recipients only.
6. Re-running the same weekly route does not duplicate delivery rows or emails.
7. Failed recipient deliveries are recorded and do not block successful recipients.

## Email Content Validation

Review a real test email in Gmail and at least one mobile viewport.

Check:

- Subject is clear and Vietnamese.
- Header names the weekly activity purpose.
- Primary CTA is `Xem hoạt động tuần này`.
- Secondary CTAs are present for proposals and submitting a proposal.
- Event dates and times are readable in Vietnam time.
- Proposal excerpts do not overflow or expose raw markdown in a broken way.
- Empty section copy is short.
- Footer explains why the member received the email.
- Unsubscribe link works.

## Delivery Evidence For PR

Implementation PR should include:

- Screenshot or copied summary of preview endpoint output.
- Confirmation of one test email sent successfully through Resend.
- Confirmation that an opted-out member was excluded.
- Confirmation that duplicate cron invocation did not duplicate delivery.
- Confirmation of skipped-run behavior when both sections are empty.

## Definition Of Done

- Weekly activity email has a clear spec-backed implementation.
- Members receive the email automatically every Monday at 15:00 Vietnam time when there is content.
- Members can opt out.
- Admins can preview and test-send.
- Delivery is idempotent and observable.
- No transactional email behavior is changed.
