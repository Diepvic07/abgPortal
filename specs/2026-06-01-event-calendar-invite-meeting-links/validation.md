# Validation

## Automated

- `npm run lint`
- If a utility is extracted, add and run a focused unit test with:

```bash
npm run test -- --run
```

## Manual

- Open an event detail page as event creator or admin.
- Click "Send Email Invite & Calendar".
- Confirm the meeting link field uses provider-neutral copy.
- Enter a Zoom HTTPS link and confirm the UI allows submission.
- Enter a Microsoft Teams HTTPS link and confirm the UI allows submission.
- Enter a Google Meet HTTPS link and confirm the UI still allows submission.
- Enter a malformed or non-HTTPS link and confirm the UI blocks it with a provider-neutral error.
- Submit a malformed link directly to `POST /api/community/events/[id]/invite` and confirm the API rejects it.
- Send a real invite in a safe test environment and confirm the email and `.ics` do not label the meeting as Google Meet unless that is only an optional convenience action.

## Definition of Done

- Event invitations accept HTTPS meeting links from Zoom, Google Meet, Microsoft Teams, and equivalent web meeting providers.
- Event invitations reject unsafe or malformed URLs on both client and server.
- Email and `.ics` output use provider-neutral meeting language.
- Existing recipient selection, authorization, reminders, and calendar attachment behavior continue to work.
