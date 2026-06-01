# Plan

## 1. Global Cursor Rule
1. Add a concise interactive-element cursor rule in `app/globals.css`.
2. Include common semantic elements and ARIA role selectors.
3. Exclude disabled elements with `:disabled` and `[aria-disabled="true"]`.

## 2. Exceptions and Compatibility
1. Confirm Tailwind `cursor-not-allowed` still wins for disabled buttons.
2. Avoid changing non-clickable hover cards into pointer targets.
3. Add targeted component-level classes only if the global selector cannot cover a real interactive element safely.

## 3. Review and Validation
1. Inspect the diff for CSS selector breadth.
2. Use GitHub/Vercel preview for visual validation.
3. Spot-check desktop hover behavior on:
   1. header navigation and user menu
   2. event detail actions
   3. admin dashboard buttons
   4. share buttons
   5. disabled submit buttons
