# Plan

## 1. Data And Types

1. Add a Supabase migration for `library_items`.
2. Add TypeScript types and labels for Library item status/visibility.
3. Add types for Library resource links.
4. Add helper functions for Drive file ID extraction and preview URL normalization.

## 2. Server Data Access

1. Add `lib/supabase-library.ts` for CRUD/list/detail functions.
2. Add member-facing read functions for published Library items.
3. Add admin functions for create, update, publish, archive.

## 3. API Routes

1. Add member routes for Library list/detail if the UI needs client fetching.
2. Add admin routes under `/api/admin/...` for Library management.
3. Validate Drive links, resource links, and status values with `zod`.

## 4. Member UI

1. Add `Library` / `Thư viện` navigation under `Hoạt động`.
2. Add Library list page with locked and unlocked card states.
3. Add Library detail page with Premium gate.
4. Render the Google Drive embed only after server/client access checks confirm Premium or admin access.
5. Show all published metadata and resource links to Basic/Free members.
6. Add a recording section to linked event detail pages when a published Library item exists for that event.

## 5. Admin UI

1. Add Library management to the admin page or existing admin content area.
2. Add create/edit form fields for title, description, event link, Drive URL/file ID, thumbnail, duration, speaker, recorded date, and status.
3. Add resource link management for slides and related materials.
4. Show Drive setup guidance near the Drive URL field.

## 6. Validation

1. Source-level validation and `git diff --check`.
2. Prefer GitHub/Vercel preview validation because local full-app validation is not reliable on this machine.
3. Manual online validation with one test Drive video.

## Likely Files

- `supabase/migrations/...`
- `types/index.ts`
- `lib/supabase-library.ts`
- `lib/drive-video.ts`
- `app/library/...` or `app/events/library/...`
- `components/library/...`
- `components/events/...`
- `components/admin/...`
- `lib/i18n/translations/en.ts`
- `lib/i18n/translations/vi.ts`
- `docs/operations.md` if admin Drive workflow needs durable operations notes

## Sequencing

Implement in small slices:

1. Data model and Drive URL helper.
2. Admin create/edit/list.
3. Member list/detail with Premium gate and resources.
4. Navigation and event-detail recording links.
5. Online validation and polish.
