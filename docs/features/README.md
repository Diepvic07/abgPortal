# Feature Specs

This folder is for implementation-ready feature descriptions that can be handed off to developers.

Use this folder when:

- a feature is approved for development
- the scope is concrete enough to build
- you want the spec versioned with the codebase
- product and engineering need a single source of truth for handoff

Do not use this folder for:

- rough backlog ideas
- meeting notes
- architecture decisions that apply across many features
- temporary brainstorming

## Recommended Workflow

1. Track the idea in your issue tracker or project board.
2. Create a feature spec in this folder once the idea is ready for implementation planning.
3. Review the spec with the developer before implementation starts.
4. Link the spec from the issue, PR, or task.
5. Update the spec if scope changes during development.

## File Naming

Recommended pattern:

```text
YYYY-MM-short-feature-name.md
```

Examples:

```text
2026-03-member-search-filters.md
2026-03-premium-referral-flow.md
2026-04-admin-bulk-actions.md
```

## Authoring Rules

- Keep the title specific and user-facing
- Separate scope from non-goals
- Write acceptance criteria that are testable
- Call out edge cases explicitly
- Include analytics requirements when relevant
- Leave open questions visible instead of hiding ambiguity

## Template

Start from [template.md](./template.md).
