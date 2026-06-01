# Validation

## Automated

Local automated checks are optional for this project because the local machine lacks full API keys and Node tooling has previously stalled.

If approved before running:

```bash
npm run lint
```

Stop quickly if the command stalls.

## Manual Preview / Production Validation

1. Open `/admin` as an admin.
2. Start creating a new event.
3. Select category `Webinar`.
4. Confirm `Hinh thuc` changes to `Truc tuyen` / `Online`.
5. Save the event.
6. Open the event detail page.
7. Confirm the top pill and `Hinh thuc` block show `Truc tuyen`.
8. Edit an existing event.
9. Confirm the existing saved mode is visible.
10. Change the mode and save.
11. Reopen the event detail page and confirm the displayed mode matches the saved value.
12. Convert a proposal with `participation_format = online` to an event.
13. Confirm the conversion modal defaults mode to `Online`.
14. Save and confirm the created event displays online mode.

## Reported Event Verification

Update event `9d8abe9c-d17b-4e02-bdc7-23b5ce2abf0e` directly with an authenticated production update:

- Set `event_mode` to `online`.
- Read the row back from the public event API.
- Reopen `https://www.abgalumni.vn/events/tao-mot-website-hoan-chinh-trong-30-phut-cung-ai`.
- Confirm it no longer displays `Truc tiep`.

## Definition Of Done

- Admins can set event mode during create/edit.
- Webinar category defaults mode to online.
- Proposal conversion defaults mode from proposal participation format.
- The saved `event_mode` is sent through the existing API.
- The reported production event row is updated to online mode.
- Public/member event detail pages display the intended mode without display-layer hacks.
