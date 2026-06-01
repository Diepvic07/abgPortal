# Plan

## Skill Sequence

1. `spec-driven-development`: define the behavior before code and wait for user approval.
2. `frontend-ui-engineering`: add the admin form selector with clear, accessible form behavior.
3. `supabase`: respect the existing Supabase-backed event data path and avoid assuming CLI authentication.

## Implementation Plan

1. Update admin event form typing and defaults.
   - Import `EventMode` and `EVENT_MODE_LABELS`.
   - Add `event_mode` to `EventForm`.
   - Set default mode to `offline`.

2. Load existing event mode on edit.
   - Populate `form.event_mode` from `event.event_mode`.
   - Fall back conservatively to `offline` only when the saved event has no mode.

3. Add category-aware defaulting.
   - Wrap category changes in a helper.
   - If the selected category is `webinar`, set `event_mode` to `online`.
   - Keep admin override possible after the category selection.

4. Add the event mode selector to the admin form.
   - Place it near category/status/location fields.
   - Use existing labels where possible.
   - Keep layout consistent with the current admin form.

5. Submit event mode.
   - Add `event_mode: form.event_mode` to the create/update payload.
   - Preserve all existing payload behavior for nullable fields.

6. Update proposal-to-event conversion defaults.
   - Initialize the conversion modal event mode from `proposal.participation_format` when it is valid.
   - Keep the selector editable.
   - Make the backend proposal conversion route/helper default from `proposal.participation_format` if `event_mode` is omitted.

7. Update the reported production event row.
   - Use an authenticated production-safe path.
   - Verify the row reads back as `event_mode = 'online'`.

8. Validate through source inspection and preview.
   - Avoid local full app startup unless explicitly requested.
   - After deployment, verify on the live or Vercel preview admin flow.

## Files Expected To Change

- `components/admin/admin-event-manager.tsx`
- `components/admin/admin-proposal-manager.tsx`
- `app/api/admin/community/events/from-proposal/[id]/route.ts`
- `lib/supabase-events.ts`
- Possibly `lib/i18n/translations/en.ts`
- Possibly `lib/i18n/translations/vi.ts`

## Files Not Expected To Change

- Supabase migrations.
- Event detail display components.
- RSVP/payment/invite APIs.
