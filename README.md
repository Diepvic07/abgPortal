# ABG Alumni Connect

AI-powered member matching platform for ABG Alumni community (~300 users).

## Features

- **Email-First Landing Page**: Check email status before auth, guided to signup or signin
- **Public Search Preview**: Unauthenticated users can search and see blurred member results
- **Dual Authentication**: Google OAuth + Magic Link (Email) sign-in
- **Approval Workflow**: Admin approves pending members; rejected members see status page
- **Two-Tier System**: Basic (3 lifetime requests) and Premium (100/month, 20/day soft-cap)
- **Request Categories**: 4 categories (Love, Job, Hiring, Partner) with card-style selection
- **AI Matching**: Gemini returns top 5 matches with match scores (0-100) and explanations
- **Reroll/Refresh**: "Run Again" button to get fresh matches (counts against quota)
- **Custom Intro Text**: Optional 500-char personal message included in intro emails
- **Love Matching Privacy**: Anonymous profiles, pre-send notice, accept/refuse/ignore, 3-day auto-timeout
- **Enhanced Dashboard**: `/history` with Outgoing/Incoming tabs, love match sections, status badges
- **News Board**: Public `/news` and `/news/[slug]` with ISR, Google Sheets CMS, category filtering, Markdown
- **Member Onboarding**: Form with AI-generated bio via Gemini
- **Admin Dashboard**: `/admin` for member approval, tier management, CSV bulk import
- **Email Introductions**: Automated intro emails to both parties via Resend
- **Admin Notifications**: Email alerts for new members/requests/connections
- **CSV Import**: Bulk import pre-approved members with single command

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Google Sheets API
- **AI**: Gemini 1.5 Flash
- **Email**: Resend
- **Storage**: Vercel Blob (avatar uploads)
- **Hosting**: Vercel

## Getting Started

### 1. Clone and Install

```bash
cd abg-alumni-connect
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Required variables (see [setup-guide.md](docs/setup-guide.md) for detailed instructions):
- `GOOGLE_SHEETS_ID` - Spreadsheet ID from URL
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Service account email
- `GOOGLE_PRIVATE_KEY` - Service account private key (with quotes)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GEMINI_API_KEY` - From Google AI Studio
- `RESEND_API_KEY` - From Resend dashboard
- `EMAIL_FROM` - Email address for sending (e.g., `ABG Connect <onboarding@resend.dev>`)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token (avatar storage)
- `NEXTAUTH_SECRET` - Random secret for JWT signing
- `NEXTAUTH_URL` - Full callback URL (http://localhost:3000 for local)

### 3. Setup Google Sheets

Create a spreadsheet with 4 sheets:
- **Members** - Headers in row 1 (includes new columns: requests_this_month, month_reset_date)
- **Requests** - Headers in row 1 (includes new columns: category, custom_intro_text)
- **Connections** - Headers in row 1
- **LoveMatchRequests** - Headers in row 1 (new sheet for love match workflow)

Or run the seed script after configuring env:

```bash
npx tsx scripts/seed-test-data.ts
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  layout.tsx                   # Root layout
  page.tsx                     # Landing page
  login/page.tsx               # Auth login page
  signup/page.tsx              # New member signup
  profile/page.tsx             # User profile
  onboard/page.tsx             # Member onboarding form
  request/page.tsx             # Connection request form
  history/page.tsx             # Request history (Outgoing/Incoming tabs + love matches)
  news/page.tsx                # News feed (public, ISR)
  news/[slug]/page.tsx         # News article detail (public, ISR)
  admin/page.tsx               # Admin dashboard (APPROVAL + TIER MGMT)
  auth/
    pending/page.tsx           # Pending approval status
    rejected/page.tsx          # Rejected status
    suspended/page.tsx         # Account suspended
    verify-request/page.tsx    # Magic link verification
  error.tsx                    # Global error page
  loading.tsx                  # Global loading state
  api/
    auth/[...nextauth]/        # NextAuth configuration
    auth/check-email/          # Check if email exists
    onboard/route.ts           # POST - create member
    request/route.ts           # POST - find matches (returns top 5 with scores)
    request/reroll/route.ts    # POST - reroll matches (NEW)
    connect/route.ts           # POST - send intro email
    my-requests/route.ts       # GET - user request history
    love-match/send/route.ts   # POST - send love match request (NEW)
    love-match/respond/route.ts# POST - respond to love match (accept/refuse) (NEW)
    love-match/list/route.ts   # GET - list incoming love matches (NEW)
    admin/members/             # GET - list members (admin)
    admin/approve/             # POST - approve member (admin)
    admin/reject/              # POST - reject member (admin)
    admin/tier/                # POST - change member tier (admin)

components/
  forms/
    member-onboarding-form.tsx
    connection-request-form.tsx
  profile/
    profile-edit-form-component.tsx
  history/
    love-match-status-badge.tsx
    incoming-love-match-card.tsx
  love-match/
    love-match-card.tsx
    love-match-modal.tsx
    love-match-request-form.tsx
  news/
    news-card.tsx
    news-card-grid.tsx
    news-detail-page.tsx
    news-filter-bar.tsx
    news-hero-section.tsx
    news-loading-skeleton.tsx
    news-markdown-renderer.tsx
  ui/
    loading-spinner.tsx
    toast-provider.tsx

lib/
  auth.ts                  # NextAuth config with approval checks
  auth-email-template.ts   # Magic link email templates
  auth-middleware.ts       # Session middleware
  google-sheets.ts         # Sheets CRUD operations
  gemini.ts                # AI text generation
  tier-utils.ts            # Tier limits & enforcement
  resend.ts                # Email sending
  news-service.ts          # News CMS service with ISR (NEW)
  news-utils.ts            # News parsing/formatting helpers (NEW)
  utils.ts                 # Helpers (UUID, dates, cn)

types/
  index.ts                 # TypeScript interfaces (with approval_status, is_csv_imported)

scripts/
  seed-test-data.ts        # Initial database seed
  import-csv-members.ts    # Bulk CSV import (NEW)
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Deploy

See [docs/admin-operations-guide.md](docs/admin-operations-guide.md) for full deployment checklist.

## User Flows

### Email-First Landing Flow (NEW)
1. User arrives at `/` → Sees landing page with 3 sections
2. **Search Section**: Public search with email check → Blurred preview results
3. **Auth Section**: Two cards:
   - "Returning Member" → Email check with `intent=signin` → Route to login if approved
   - "Join Community" → Email check with `intent=signup` → Route to signup if email available
4. System checks email against Members sheet:
   - **Not found + signup**: "Great! Sign in with Google to continue"
   - **Not found + signin**: "Join Community instead"
   - **Found + pending**: "Application pending review"
   - **Found + approved + signup**: "Already registered"
   - **Found + approved + signin**: "Welcome back!"

### Public Search (NEW)
1. User enters query on landing page without login
2. POST `/api/search/public` with query
3. Rate limited: 5 requests/min per IP
4. Returns 3 blurred matches (name/role/company obscured)
5. Shows matching reason (visible to encourage signup)
6. Message: "Sign in to see full profiles"

### Authentication
1. User visits `/login` → chooses Google OAuth or Magic Link
2. Email verified → System checks if member exists
3. If not exists → Redirect to `/signup` to create profile
4. If exists → Check approval status:
   - **pending**: Redirect to `/auth/pending` (wait for admin approval)
   - **approved**: Allow login, set `last_login`, redirect to home
   - **rejected**: Redirect to `/auth/rejected` (access denied)
5. If account suspended/banned → Redirect to `/auth/suspended`

### Member Onboarding (New Members)
1. User fills signup form with profile info
2. Gemini AI generates professional bio
3. Member saved to Sheets with `approval_status = "pending"`
4. Confirmation email sent via Resend
5. Member waits in pending state, cannot access platform

### Admin Approval Workflow
1. Admin visits `/admin` dashboard
2. Views "Pending" tab showing new applications
3. Reviews member profile and decides:
   - **Approve**: Set `approval_status = "approved"`, member can now login
   - **Reject**: Set `approval_status = "rejected"`, member blocked permanently
4. For approved members, admin can manage tier (basic/premium)

### CSV Bulk Import (Pre-Approved Members)
1. Prepare CSV with member data (see sample in `/docs`)
2. Run: `npm run import-members -- --dry-run` (preview)
3. Run: `npm run import-members` (execute)
4. Members automatically set to:
   - `approval_status = "approved"` (skip queue)
   - `is_csv_imported = TRUE` (marked for reference)
   - `paid = FALSE` (basic tier by default)
5. Members can login immediately

### Connection Request
1. Approved member selects category (Love/Job/Hiring/Partner) and describes what they need
2. System checks tier & request limits via `canMakeRequest()`:
   - **Basic**: Must have free_requests_used < 3 (3 lifetime requests)
   - **Premium**: Must have requests_this_month < 100 (monthly reset) with 20/day soft-cap (warning only)
3. Gemini returns top 5 matches with match scores (0-100) and explanations
4. User can click "Run Again" to get fresh matches (counts against quota)
5. Results shown (blurred for basic tier as soft upsell)
6. User optionally adds custom intro text (max 500 chars)
7. User selects preferred match
8. For Love Matching: Anonymous flow with 3-day accept/refuse/ignore timeout
9. For other categories: Direct intro email sent to both parties
10. Connection logged with appropriate status

## License

Private - ABG Alumni Community
