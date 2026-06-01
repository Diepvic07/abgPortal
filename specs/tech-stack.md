# Tech Stack

The ABG Alumni Connect project uses a Next.js, Supabase, and Vercel stack to support a bilingual, community-focused web platform with server-rendered pages, API routes, AI matching, email workflows, and admin operations.

## Core Technologies
- **Language**: TypeScript with strict project types and shared domain interfaces in `types/`.
- **Framework**: Next.js 16 App Router with React 19 for pages, server route handlers, middleware, and API endpoints.
- **Database**: Supabase Postgres is the runtime source of truth, with SQL migrations in `supabase/migrations/`.
- **Auth**: NextAuth v4 with Google OAuth and Resend-powered email magic links; Supabase stores verification tokens through a custom adapter.
- **AI**: Google Gemini via `@google/generative-ai`, currently using `gemini-flash-latest` for bio generation, matching, agenda generation, and translation support.
- **Email**: Resend for magic links, introductions, event/proposal notifications, and admin/member emails.
- **Storage**: Vercel Blob for member avatars; Supabase Storage for news images, proposal/event/comment images, and bug report screenshots.
- **Styling**: Tailwind CSS 4 with custom components, bilingual copy, and established ABG visual patterns.
- **Internationalization**: Local English and Vietnamese translation files under `lib/i18n/`; Vietnamese is the default when no saved locale exists.
- **Analytics**: PostHog client/server integration with reverse proxy rewrites configured in `next.config.ts`.
- **Testing**: Vitest for unit tests under `__tests__/`; Playwright E2E tests under `e2e/` with page objects, mocks, traces, screenshots, and multi-browser projects.
- **Deployment**: Vercel with Singapore region `sin1`, cron routes for reminders, and canonical host redirect to `www.abgalumni.vn`.

## Design Goals
- **Simplicity**: Keep domain logic in focused `lib/` service modules, feature UI in `components/`, and route-level orchestration in `app/`.
- **Reliability**: Use Supabase migrations, server-side service clients, explicit API validation, typed response helpers, and test coverage for scoring, notifications, auth, member flows, and admin workflows.
- **User Experience**: Prioritize fast member workflows, mobile-friendly layouts, bilingual copy, clear status states, and low-friction participation for events, proposals, matching, and profiles.
- **Privacy and Trust**: Gate member-only data behind approved accounts and tier rules, keep love matching privacy-preserving, and expose only intentionally public fields on public profiles.
- **Operational Fit**: Prefer tools that reduce admin coordination work: admin dashboards, payment review, duplicate detection, reminder crons, notifications, and content management inside the app.

## Non-Negotiable Constraints
- Supabase Postgres is the authoritative runtime database; older Google Sheets and CSV tooling is historical unless a migration script explicitly requires it.
- The Premium plan document is canonical for membership strategy: Free members get a constrained preview, Pro members get full access, launch payments use bank transfer, and Pro entitlement rules follow that document until replaced by an approved spec.
- Supabase MCP authentication and Supabase CLI authentication are separate concerns. Remote SQL should prefer authenticated MCP when available, and CLI-linked operations require explicit project linking plus `supabase login` or `SUPABASE_ACCESS_TOKEN`.
- Every new feature starts with an approved spec before implementation.
