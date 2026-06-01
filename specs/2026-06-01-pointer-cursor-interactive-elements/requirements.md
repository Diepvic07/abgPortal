# Pointer Cursor for Interactive Elements

## Summary

Make hover cursor behavior consistent across the ABG Alumni Connect UI so clickable and interactive controls show a pointer cursor, while disabled controls keep a non-interactive cursor.

## Problem

- Many buttons, links, menu items, icon buttons, and clickable labels have hover styles but do not explicitly show `cursor: pointer`.
- Some elements already use `cursor-pointer`, while others rely on browser defaults or have no pointer cursor despite being clickable.
- Disabled states often already use `disabled:cursor-not-allowed`, and that behavior should not be broken.
- Applying `cursor-pointer` manually to every current and future button/link would be noisy and easy to miss.

## Goal

- Ensure users get consistent pointer feedback on hover for interactive elements throughout the app.
- Keep disabled controls visually and behaviorally non-clickable.
- Prefer a small global CSS rule over large repetitive class changes unless a specific component needs an exception.

## Scope

- Update global UI cursor behavior in `app/globals.css`.
- Cover standard interactive elements:
  - `button`
  - links with `href`
  - `summary`
  - labels attached to form controls when appropriate
  - elements with `role="button"`, `role="link"`, `role="menuitem"`, `role="tab"`, `role="switch"`, or `role="checkbox"`
  - elements with app-specific clickable classes where needed
- Preserve disabled and busy states:
  - `button:disabled`
  - `[aria-disabled="true"]`
  - existing `cursor-not-allowed` utility usage
- Avoid changing normal text, cards, layout containers, or decorative hover-only surfaces into pointer targets unless they are actually clickable.

## Non-Goals

- No redesign of components.
- No large sweep adding `cursor-pointer` to every JSX file.
- No conversion of non-semantic clickable `<div>` elements into accessible buttons in this feature; that can be handled separately.
- No local dev-server or full test run required by default because this project validates primarily through GitHub/Vercel.

## Target Users

- Desktop users relying on hover feedback to identify clickable UI.
- Admins and members navigating dense operational screens with many buttons, links, filters, menus, tabs, and icon controls.

## UX / User Flow

1. User hovers over a clickable control.
2. Cursor changes to pointer.
3. User hovers over a disabled control.
4. Cursor remains not-allowed or otherwise non-clickable.
5. User hovers over normal non-clickable content.
6. Cursor remains default text/arrow behavior.

## Functional Requirements

- Global CSS must set `cursor: pointer` for enabled interactive elements.
- Disabled buttons must not show pointer.
- Elements with `aria-disabled="true"` must not show pointer.
- Existing Tailwind `cursor-not-allowed` classes must continue to win over global pointer rules.
- Existing upload/dropzone labels that intentionally use `cursor-pointer` must continue to behave the same.
- The rule should be easy to understand and maintain in `app/globals.css`.

## Acceptance Criteria

- [ ] Hovering enabled buttons shows pointer.
- [ ] Hovering links shows pointer.
- [ ] Hovering user-menu rows, language options, tabs, icon buttons, and share buttons shows pointer.
- [ ] Hovering disabled buttons does not show pointer.
- [ ] Existing `disabled:cursor-not-allowed` behavior remains intact.
- [ ] Normal cards or non-clickable content do not gain pointer cursor.
- [ ] The implementation is centralized and does not create broad JSX churn.

## Edge Cases

- A button with `disabled` and a Tailwind class should not show pointer.
- A pseudo-disabled link using `aria-disabled="true"` should not show pointer.
- An interactive element nested inside a label should still be clear and not conflict with text selection.
- Mobile and touch devices should not be affected negatively; cursor behavior is desktop-only affordance.

## Data / Backend Impact

- No backend impact.
- No API changes.
- No database changes.

## Analytics

- No analytics required.

## Rollout Notes

- This is low-risk UI polish and can ship in a small PR.
- Validate through GitHub/Vercel preview per project operating rules.

## Dependencies

- Existing Tailwind CSS 4 global stylesheet in `app/globals.css`.

## Open Questions

- Confirm that "everywhere" means enabled interactive elements only, not every element with a hover visual effect.
