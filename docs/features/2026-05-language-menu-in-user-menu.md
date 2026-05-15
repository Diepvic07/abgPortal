# Language Menu in User Menu

## Summary

Move the desktop language choice menu out of the main header navigation and into the authenticated user menu so language selection lives with account-related controls.

## Problem

- The desktop header currently shows `LanguageSwitcherDropdown` as a separate top-level navigation control between FAQ and notifications.
- The user menu already groups profile, history, notification settings, admin access, payment state, and sign out.
- The language dropdown competes for horizontal header space and visually sits outside the account control group shown in the requested design direction.

## Goal

- Make language selection available from the user menu instead of as a separate desktop header control.
- Keep the current language switching behavior unchanged.
- Preserve the existing user menu account actions and visual hierarchy.

## Scope

- Desktop authenticated header only.
- Logged-out desktop header keeps the standalone language switcher.
- `components/layout/header-navigation.tsx`
- `components/ui/header-user-menu.tsx`
- `components/ui/language-switcher-dropdown.tsx` only if it needs a display variant that can render cleanly inside a white dropdown menu.
- "User component" means the existing `HeaderUserMenu` component at `components/ui/header-user-menu.tsx`.

## Non-Goals

- No changes to the i18n data model or translation keys.
- No changes to `LanguageProvider`, locale persistence, or local storage behavior.
- No deletion of the existing language switcher component.
- No backend, API, or Supabase changes.

## Target Users

- Authenticated ABG members using the desktop header.
- Admin users using the desktop header.

## UX / User Flow

1. An authenticated desktop user sees the header without the separate language dropdown between FAQ and notifications.
2. The user opens the avatar user menu.
3. The user sees a language row or section inside the user menu showing the active locale and available language choices.
4. Selecting English or Tiếng Việt immediately updates the locale using the existing i18n context.
5. The user menu stays open after the language selection changes.

## Functional Requirements

- Remove the standalone desktop `LanguageSwitcherDropdown` from the main header nav for authenticated users.
- Keep the standalone desktop `LanguageSwitcherDropdown` in the main header nav for logged-out users.
- Add language selection inside `HeaderUserMenu`.
- Preserve support for English and Tiếng Việt.
- Vietnamese should be the default language when no saved locale exists.
- Preserve the current selected-language indication.
- Preserve keyboard and pointer usability for opening the user menu and choosing a language.
- Avoid overlapping dropdowns or nested popovers that can render outside the user menu in a visually broken way.
- Keep notification bell placement unchanged unless implementation review shows it must move to satisfy the layout.

## Acceptance Criteria

- [ ] On desktop while authenticated, the top-level header no longer shows the separate `VI` / `EN` language dropdown next to FAQ.
- [ ] On desktop while logged out, the top-level header still shows the standalone language dropdown.
- [ ] Vietnamese is the default selected language when no saved locale exists.
- [ ] On desktop while authenticated, opening the avatar user menu exposes English and Tiếng Việt language choices.
- [ ] The active language is visibly marked inside the user menu.
- [ ] Choosing a different language updates page copy through the existing `useTranslation` / `setLanguage` behavior.
- [ ] Choosing a different language does not close the user menu.
- [ ] Existing user menu items still appear: profile, history, notification settings, admin for admins, payment CTA or pending state when applicable, and sign out.
- [ ] Existing membership badge and membership expiry display remain unchanged.
- [ ] The user menu layout does not overlap the header, viewport edge, or page content in the broken way shown by the current standalone language dropdown screenshot.
- [ ] `npm run lint` passes.

## Edge Cases

- Authenticated user with admin privileges:
  The Admin menu item remains visible and language selection does not obscure it.

- Authenticated user with pending, basic, expired, premium, or grace-period membership:
  Payment and membership sections remain visible with the same conditions as today.

- Small desktop widths where the desktop nav still renders:
  Moving language selection into the user menu should reduce header crowding rather than introduce new wrapping.

- Mobile header:
  Existing mobile language placement remains unchanged unless you explicitly approve moving it too.

- Unauthenticated desktop header:
  Language access stays as a standalone header item because logged-out users do not have a user menu.

## Data / Backend Impact

- No database changes.
- No API route changes.
- No authentication changes.
- No Supabase work.

## Analytics

- No new analytics required.

## Rollout Notes

- This is a UI-only change.
- Implementation should be verified manually in both Vietnamese and English.
- Implementation should be checked at desktop and mobile breakpoints.

## Dependencies

- Existing `LanguageProvider` and `useTranslation` behavior.
- Existing `HeaderUserMenu` component.
- Existing `LanguageSwitcherDropdown` component or a small menu-item variant derived from it.

## Open Questions

- None.

## Links

- Issue:
- Design: User-provided screenshots in conversation
- PRD:
- Related docs:
