# Validation

## Local Checks

Local full-app validation is not the default path for this project because local API keys are incomplete and Node tooling has previously stalled.

Current implementation check:

- `git diff --check` passed on 2026-06-06.

Run only if useful and approved:

```bash
git diff --check
npm run lint
```

Stop quickly if local Node tooling stalls.

## Online Manual Validation

Use a test Google Drive video configured with:

- Viewable by link.
- Viewer download/copy/print disabled where possible.

Validate:

1. Admin can create a Library item with the Drive link.
2. Admin can publish the Library item.
3. `Hoạt động` displays `Library` in English and `Thư viện` in Vietnamese.
4. Premium member can open the Library item and play the embedded Drive video.
5. Basic/Free member can see all Library metadata and resource links.
6. Basic/Free member sees a locked playback state and cannot see the playable embed.
7. A linked event detail page shows the available recording.
8. Public/unauthenticated visitor cannot access playback.
9. Vercel does not serve the video bytes; playback comes from Google Drive.

## Acceptance Evidence

For PR/final report, include:

- URL of the Library list page.
- URL of one Library detail page.
- Confirmation of Premium playback.
- Confirmation of Basic/Free locked state.
- Confirmation of Basic/Free metadata/resource visibility.
- Confirmation that a linked event page surfaces the recording.
- Confirmation that video source is Google Drive, not Vercel.

## Definition Of Done

- Library MVP is available under `Hoạt động`.
- Bilingual labels use `Library` and `Thư viện`.
- Premium-only playback is enforced by the app.
- Basic/Free members can see published Library metadata and resource links.
- Event detail pages surface linked recordings.
- Google Drive remains the video host.
- Admin workflow is documented enough to publish new recordings safely.
