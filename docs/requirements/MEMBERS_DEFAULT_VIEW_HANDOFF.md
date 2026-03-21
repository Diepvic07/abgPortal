# Members Page Default View Handoff

## Purpose

Improve the Members page so a basic member does not land on an empty state.

Right now, the user opens the Members page and sees no member results until they manually use the filter. This is confusing because the page does not immediately show what the feature does.

## Required Behavior

For a basic member, the Members page should automatically show **all members in the same class as the logged-in user** on first load.

The user should not need to type a keyword or manually select a filter before seeing results.

## Expected Default Flow

1. User opens the Members page.
2. System detects the logged-in user’s class.
3. System automatically loads all members from that same class.
4. The class filter is preselected to the user’s class.
5. The member list is shown immediately.
6. A helper message explains the default view and the Premium upgrade boundary.

## Required Helper Copy

Use this exact copy:

`Basic membership lets you view all members in your class. Upgrade to Premium to explore the wider alumni network and use additional filters.`

## Functional Requirements

1. Default result set for a basic member = all members whose class matches the logged-in user’s class.
2. Results must render automatically on first page load.
3. The class filter must show the logged-in user’s class as the default selected value.
4. The helper copy must be visible near the member list or filter area.
5. Search and filters must still work normally after page load.
6. Access to other classes and broader filtering should remain restricted to Premium according to current product rules.

## UX Goal

The page should immediately teach the user two things:

1. The Members page already contains discoverable results.
2. Premium is required to explore beyond the user’s own class and use additional filters.

## Edge Case

If the logged-in user has no class value stored:

- do not show a blank page without explanation
- show a fallback helper message
- guide the user toward updating their profile or using the available allowed filters

## Acceptance Criteria

1. A basic member sees a non-empty member list immediately on page load.
2. The default list contains all members from the same class as the logged-in user.
3. The class filter is preselected to the user’s class.
4. The helper copy is visible and matches the approved wording.
5. The page no longer depends on the user taking the first action before understanding the feature.
