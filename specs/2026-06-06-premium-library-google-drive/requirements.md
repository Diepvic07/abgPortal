# Premium Library With Google Drive Videos

## Summary

Add a Premium-only `Library` / `Thư viện` section under `Hoạt động` where members can watch selected workshop recordings stored in Google Drive.

## Problem

Some ABG workshops are recorded and saved as videos in Google Drive. Premium members should be able to find and watch those recordings from ABG Alumni Connect, but the project should not host or stream video files from Vercel because the app is on a Vercel Hobby plan and video bandwidth/storage would be the wrong operational fit.

## Decision

Use Option B:

- Store video files in Google Drive.
- Configure Drive files as viewable by link.
- Disable download/copy/print options for Drive viewers where possible.
- Gate the Library UI and video embed inside the ABG app to Premium members.
- Accept that this is Premium access control, not DRM. A Premium member may still copy a link, screen record, or otherwise share content outside the app.

## Goal

- Give Premium members a simple archive of workshop recordings.
- Keep Vercel responsible only for the app UI and metadata, not video hosting.
- Let admins add recordings by pasting Google Drive file IDs or preview links.
- Use bilingual naming:
  - English: `Library`
  - Vietnamese: `Thư viện`

## Target Users

- Premium members who want to watch missed workshops or revisit recordings.
- Basic/Free members who should see the Library value but not access playback.
- Admins who manage workshop recording metadata.

## Scope

- Add a `Library` / `Thư viện` entry under `Hoạt động`.
- Add a member-facing Library list page.
- Add a Library detail/watch page for Premium members.
- Add Basic/Free lock state with upgrade messaging.
- Add an admin workflow for creating and editing Library items.
- Add optional slides/resource links for each Library item.
- Show linked recordings on event detail pages when a recording is attached to that event.
- Store only metadata and Google Drive identifiers/URLs in Supabase.
- Render Google Drive preview/player embeds for Premium members.

## Non-Goals

- Do not upload or store video files on Vercel.
- Do not proxy Drive videos through Next.js API routes.
- Do not build custom video streaming.
- Do not implement DRM or anti-screen-recording controls.
- Do not build automatic Google Drive permission management in the MVP.
- Do not require Google Drive API integration for MVP playback.
- Do not migrate existing event recap media into Library automatically.
- Do not gate slides/resource metadata from Basic/Free members unless a later spec changes access rules.

## Proposed Data Model

Create a `library_items` table with:

- `id`
- `slug`
- `title`
- `description`
- `event_id` nullable, for linking to a workshop event
- `drive_file_id` nullable
- `drive_preview_url`
- `thumbnail_url` nullable
- `resource_links` JSON array nullable, for slides and related resources
- `duration_text` nullable
- `speaker_name` nullable
- `recorded_at` nullable
- `status`: `draft | published | archived`
- `visibility`: initially `premium`
- `created_by_member_id`
- `created_at`
- `updated_at`
- `published_at` nullable

## Functional Requirements

- Library navigation must display as `Library` in English and `Thư viện` in Vietnamese.
- Library list must show published recordings.
- Premium members can open a recording detail page and view the embedded Google Drive video.
- Basic/Free members can see all published Library metadata and resource links, but cannot see the playable video embed.
- Admins can create, edit, publish, archive, and link Library items to existing events.
- Admins can paste either a Google Drive file ID or a Google Drive preview/share link.
- Admins can add optional slides/resource links with a label and URL.
- The app should derive and store a Drive preview URL suitable for embedding.
- Admin UI should remind admins to configure Drive viewer restrictions: disable download/copy/print where possible.
- Event detail pages should show a linked recording section when a published Library item is attached to that event.
- Public visitors should not access playable recordings.

## Access Rules

- Premium members: list and playback.
- Basic/Free approved members: all published Library metadata and resource links with locked playback.
- Admins: management access regardless of membership tier.
- Public/unauthenticated users: no playable video access.

## UX Requirements

- Library should feel like part of `Hoạt động`, not a separate product.
- Cards should be simple: title, description excerpt, linked event or date, duration, speaker, resource count, and locked/unlocked CTA.
- Detail page should prioritize the embedded video for Premium members and supporting workshop context/resource links for everyone with member access.
- Locked state should explain that recordings are a Premium benefit.

## Operational Requirements

- Video bandwidth should stay on Google Drive.
- Vercel bandwidth should be limited to app shell, metadata, thumbnails, and embed page rendering.
- Drive file permissions are managed manually by admins in Google Drive for MVP.
- Admins should verify each Drive video can play from the app before publishing.

## Acceptance Criteria

- [ ] `Hoạt động` includes `Library` / `Thư viện`.
- [ ] Admin can create a Library item from a Google Drive link or file ID.
- [ ] Published Library items appear on the Library list.
- [ ] Premium members can watch the embedded Google Drive video.
- [ ] Basic/Free members can see all published Library metadata and resource links, but cannot see the playable embed.
- [ ] Linked event detail pages show available recordings.
- [ ] Admins can add slides/resource links to a Library item.
- [ ] Admins see guidance to disable Drive viewer download/copy/print options.
- [ ] No video file is uploaded to or proxied through Vercel.
- [ ] The feature works with the existing Supabase, Next.js, NextAuth, and tier infrastructure.

## Risks And Tradeoffs

- Google Drive embeds are not DRM and links can leak.
- Drive playback UX depends on Google Drive's preview player.
- Manual Drive permission setup creates admin process risk.
- If Drive blocks embed playback for some file settings, admins must adjust sharing settings manually.

## Decisions

- Basic/Free members see all published Library metadata.
- Recordings also appear on linked event detail pages when available.
- MVP supports slides/resource links.
