# Operations Guide

This guide records project-specific operating rules that affect validation, deployment, database access, and production changes for ABG Alumni Connect.

## Validation Strategy

Local development and test runs are not the default validation path for this project.

Reasons:

- The local machine does not have enough API keys to run the full app end-to-end.
- Node-based local tooling has previously stalled silently for commands such as build, lint, typecheck, Vitest, and small Node scripts.
- Online GitHub/Vercel validation is closer to the way changes are actually reviewed and shipped.

Preferred validation path:

1. Make small, scoped changes.
2. Run cheap source checks that do not require the full app when useful.
3. Push to GitHub.
4. Validate through GitHub PR review, Vercel preview, or the production environment after merge.

If local checks are still useful for a narrow pure-code concern, ask before running them and stop quickly if they stall.

## GitHub And Vercel Deployment

GitHub is the source of truth for code review and merge state.

Vercel for this project is owned or initialized by another collaborator's account. The local Vercel CLI on this machine may not have access to inspect failed preview deployments or logs.

Operational rules:

- If Vercel preview logs are inaccessible from this machine, report that limitation clearly.
- Do not spend time repeatedly trying the same local Vercel inspection command when the CLI account cannot access the deployment owner context.
- If a PR is otherwise ready but Vercel fails only because deployment logs are inaccessible from this machine, ask the user whether to merge through GitHub anyway.
- If the user explicitly asks to merge through GitHub despite the Vercel failure, merge the PR and report the Vercel limitation.

Useful commands:

```bash
gh pr view <number> --json state,mergeStateStatus,statusCheckRollup,url
gh pr checks <number>
gh pr merge <number> --merge --delete-branch
```

## Supabase Operations

Supabase MCP authentication and Supabase CLI authentication are separate.

On this machine, the Supabase CLI is installed through Homebrew at:

```bash
/opt/homebrew/bin/supabase
```

Rules:

- Do not assume `supabase db query --linked` can run just because MCP or the app can access Supabase.
- In Codex, do not assume `/opt/homebrew/bin` is on `PATH`; call Supabase CLI with the absolute path `/opt/homebrew/bin/supabase` before trying `npx`, downloads, or broad filesystem searches.
- Before using Supabase CLI remote commands, verify the project is linked and the CLI has either `supabase login` or `SUPABASE_ACCESS_TOKEN`.
- For migrations, run `/opt/homebrew/bin/supabase migration list --linked` and `/opt/homebrew/bin/supabase db push --dry-run` before applying `/opt/homebrew/bin/supabase db push`.
- Prefer authenticated MCP for ad hoc remote SQL when available.
- Verify production data changes with an independent read after writing.
- Do not shell-source `.env` files. Parse only exact required keys or use a dotenv-aware tool.

For direct production row updates:

- Get explicit user approval for the specific production change.
- Use the narrowest update possible.
- Read the changed row back immediately.
- Report the affected table, row identifier, and resulting key fields.

## Feature Workflow

Every feature starts with a spec before implementation.

Expected pattern:

1. Write or update a spec under `specs/`.
2. Stop for user review.
3. Implement only after approval.
4. Include validation notes in the PR body or final report.

Bug fixes that change behavior should still have a compact spec when they affect product flows, admin workflows, database behavior, notifications, payments, or public pages.

## Local Secrets And Ignored Files

Use `.env.example` as the tracked template and `.env.local` for real secrets.

Do not commit:

- `.env*` files with real credentials
- `.vercel/`
- local build output
- local agent files such as `AGENTS.md`

`AGENTS.md` is intentionally ignored and local-only for this workspace. Repo-wide contributor guidance should go into tracked docs such as this file, `README.md`, or feature specs.

## Production Change Checklist

Before changing production behavior or data:

- Confirm the exact target environment.
- Confirm whether the change is code, configuration, or data.
- Confirm whether a spec is required.
- Confirm whether the user has approved any production data write.
- Record validation results and skipped checks.
