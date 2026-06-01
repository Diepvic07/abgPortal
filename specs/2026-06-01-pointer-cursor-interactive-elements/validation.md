# Validation

## Automated

- No local test/lint/typecheck run by default per project operating rules.
- Use GitHub/Vercel checks after pushing the PR.

## Manual

- Open the Vercel preview on desktop.
- Confirm enabled buttons show pointer cursor on hover.
- Confirm links show pointer cursor on hover.
- Confirm dropdown menu items and language controls show pointer cursor.
- Confirm disabled buttons still show `not-allowed` or otherwise do not show pointer.
- Confirm non-clickable content cards do not imply clickability.

## Definition of Done

- Interactive cursor behavior is consistent across the project.
- Disabled controls retain non-clickable cursor behavior.
- Implementation is centralized, small, and easy to maintain.
