# ABG Alumni Connect

ABG Alumni Connect is a member directory and AI-assisted introduction platform for the ABG alumni community. The current runtime stack is a Next.js App Router application backed by Supabase, with NextAuth for authentication, Gemini for match generation, and Resend for email workflows.

## Overview

- Email-first entry flow for signup and sign-in
- Google OAuth and magic-link authentication
- Approval workflow for newly onboarded members
- AI-assisted matching across `love`, `job`, `hiring`, and `partner` requests
- Tiered member experience with Basic vs Premium limits
- Public search preview with blurred results
- Authenticated member search with Vietnamese-aware filtering and ABG class filters
- Privacy-first love matching workflow
- Admin tools for approvals, duplicate review, member management, payments, class management, and bilingual news publishing
- In-app bug reporting with screenshot upload

## Tech Stack

- Framework: Next.js `16.1.6` with App Router
- UI: React `19`, TypeScript, Tailwind CSS `4`
- Database: Supabase Postgres
- Auth: NextAuth with Google OAuth and Resend-powered email magic links
- AI: Google Gemini
- Email: Resend
- Storage:
  - Vercel Blob for member avatar uploads
  - Supabase Storage for news images and bug-report screenshots
- Testing: Playwright

## Runtime Architecture

- `app/` contains pages and route handlers
- `components/` contains UI and feature components
- `lib/` contains shared domain logic, auth, data access, email, AI, and tier utilities
- `lib/supabase-db.ts` is the main server-side CRUD and mapping layer
- `lib/supabase/server.ts` creates the service-role Supabase client for server use
- `lib/supabase/client.ts` creates the browser Supabase client with the anon key
- `supabase/migrations/` contains the SQL schema and storage setup
- `types/` contains the app-level TypeScript models

Authentication uses NextAuth with JWT sessions. Email verification tokens are stored in Supabase through a custom adapter. Protected API routes typically resolve the current member record through `lib/auth-middleware.ts` before performing business logic.

## Database

The live application uses Supabase Postgres as the authoritative database.

Primary tables include:

- `members`
- `requests`
- `connections`
- `request_audits`
- `love_match_requests`
- `news`
- `contact_requests`
- `payment_records`
- `bug_reports`
- `abg_classes`
- `verification_tokens`

The repository still contains some migration-era scripts and notes related to Google Sheets. Those are historical artifacts and should not be treated as the current runtime architecture.

## Key Product Flows

### Authentication and onboarding

- Users start from an email-check flow before sign-in or signup
- Approved members can sign in with Google or magic link
- New members complete onboarding, get an AI-generated bio, and enter the approval queue
- Suspended or banned members are blocked at auth time

### Matching and search

- Authenticated members can search the directory with tier-based visibility rules
- Basic tier has limited quotas and reduced result visibility
- Premium tier gets larger result sets and monthly request allowances
- AI matching supports professional and dating-style flows
- Love matching uses a separate privacy-preserving workflow

### Admin operations

- Approve or reject pending members
- Review potential duplicates
- Grant or revoke admin access
- Upgrade or downgrade membership tiers and record payments
- Manage canonical ABG classes
- Publish bilingual news content
- Review bug reports

## Repository Layout

```text
app/                    Pages and API routes
components/             UI and feature components
docs/requirements/      Setup and operational notes
e2e/                    Playwright configuration and tests
lib/                    Auth, Supabase, AI, email, business logic
public/                 Static assets
scripts/                Migration and operational tooling
supabase/               SQL migrations and helpers
types/                  TypeScript domain models
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

This repository does not currently ship an `.env.example`, so create `.env.local` manually.

Main application variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `ADMIN_EMAILS`
- `BLOB_READ_WRITE_TOKEN`

Optional but used by specific flows:

- `CRON_SECRET`
- `VERCEL_PROJECT_PRODUCTION_URL`

Legacy migration scripts may also require:

- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

See [docs/requirements/setup-guide.md](docs/requirements/setup-guide.md) for provider setup details that still apply to the current stack.

### 3. Apply the Supabase schema

Apply the SQL files in `supabase/migrations/` to your Supabase project before running the app. The repository also includes `supabase/full-migration.sql` as a consolidated SQL file.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

Common development scripts:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

Playwright:

- `npm run test:e2e`
- `npm run test:e2e:ui`
- `npm run test:e2e:headed`
- `npm run test:e2e:debug`
- `npm run test:e2e:chromium`
- `npm run test:e2e:report`

Supabase-oriented migration and ops scripts:

- `npm run migrate:csv:dry`
- `npm run migrate:csv`
- `npm run migrate:xlsx:dry`
- `npm run migrate:xlsx`
- `npm run verify-migration`
- `npm run fetch:bugs`

Historical or one-off migration scripts also exist under `scripts/`. Review them before use, because some still assume older Google Sheets-based workflows or machine-specific file paths.

## Notes for Contributors

- The runtime application uses Supabase, not Google Sheets
- `README.md` should reflect the runtime architecture, not legacy migration tooling
- If you update quotas, auth behavior, or admin flows, update this file and the operational docs together

## License

Private repository for the ABG Alumni community.
