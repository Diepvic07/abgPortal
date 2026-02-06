# ABG Alumni Connect - Codebase Summary

## Project Overview

ABG Alumni Connect is an AI-powered member matching platform for ABG Alumni community (~300 users). It enables smart peer connections through intelligent matching, automated introduction emails, and comprehensive member management.

**Repository:** 102 files | 102.8k tokens | 389k characters

## Core Features

### 1. Member Authentication
- **Dual Auth Methods**: Google OAuth + Magic Link (Email)
- **Approval Workflow**: pending → approved/rejected status
- **Account Status**: active, suspended, banned
- **Last Login Tracking**: Automatic updates on sign-in

### 2. Membership Tiers
- **Basic**: 1 free request lifetime, login access only
- **Premium**: Unlimited requests, 50 per day limit, full profile access
- **Tier Management**: Admin can upgrade/downgrade members via dashboard

### 3. Connection Matching
- **AI-Powered**: Gemini 1.5 Flash for matching logic
- **Smart Filtering**: Matches based on expertise, needs, location
- **Approval-Gated**: Only approved members can request matches
- **Tier-Limited**: Basic tier gets 1 match, premium unlimited

### 4. Admin Management
- **Approval Dashboard**: `/admin` - approve/reject pending members
- **Member Management**: View, filter, change tiers
- **CSV Import**: Bulk import pre-approved members with `is_csv_imported` flag
- **Tier Controls**: Upgrade/downgrade members between basic/premium

### 5. Notifications
- **Discord Webhooks**: New members, requests, connections
- **Email via Resend**: Confirmation, introductions, magic links
- **Status Updates**: Admin alerts for important actions

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Auth** | NextAuth v4 (Google + Email providers) |
| **Database** | Google Sheets API |
| **UI** | React + Tailwind CSS |
| **AI** | Google Gemini 1.5 Flash |
| **Email** | Resend |
| **Storage** | Vercel Blob (voice/avatar) |
| **Hosting** | Vercel |
| **Notifications** | Discord Webhooks |

## Project Structure

```
abg-alumni-connect/
├── app/                           # Next.js app directory
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   ├── login/page.tsx             # Auth login page
│   ├── signup/page.tsx            # New signup flow
│   ├── profile/page.tsx           # User profile
│   ├── onboard/page.tsx           # Member onboarding form
│   ├── request/page.tsx           # Connection request flow
│   ├── history/page.tsx           # User request history
│   ├── admin/page.tsx             # Admin dashboard (NEW)
│   ├── auth/                      # Auth status pages
│   │   ├── pending/page.tsx       # Pending approval state
│   │   ├── rejected/page.tsx      # Rejected state
│   │   ├── suspended/page.tsx     # Account suspended
│   │   ├── error/page.tsx         # Auth errors
│   │   └── verify-request/page.tsx # Magic link verification
│   └── api/
│       ├── auth/[...nextauth]/    # NextAuth configuration
│       ├── auth/check-email/      # Email existence check
│       ├── onboard/               # Create member
│       ├── request/               # Gemini matching
│       ├── connect/               # Send intro email
│       ├── my-requests/           # User request history
│       └── admin/                 # Admin operations
│           ├── members/           # List members
│           ├── approve/           # Approve member
│           ├── reject/            # Reject member
│           └── tier/              # Change member tier
│
├── components/                    # React components
│   ├── forms/
│   │   ├── member-onboarding-form.tsx
│   │   └── connection-request-form.tsx
│   ├── profile/
│   │   └── profile-edit-form-component.tsx
│   ├── ui/
│   │   ├── loading-spinner.tsx
│   │   ├── toast-provider.tsx
│   │   └── (other UI components)
│   └── match-results-display.tsx
│
├── lib/                           # Core utilities
│   ├── auth.ts                    # NextAuth configuration
│   ├── auth.ts                    # NextAuth config with approval checks
│   ├── auth-email-template.ts     # Magic link email templates
│   ├── auth-middleware.ts         # Session middleware
│   ├── google-sheets.ts           # Sheets CRUD operations
│   ├── gemini.ts                  # AI text generation
│   ├── tier-utils.ts              # Tier limits & filtering (NEW)
│   ├── resend.ts                  # Email sending
│   ├── discord.ts                 # Webhook notifications
│   └── utils.ts                   # Helper functions
│
├── types/index.ts                 # TypeScript interfaces
│   ├── Member                     # With approval_status, is_csv_imported
│   ├── ConnectionRequest
│   ├── Connection
│   └── MatchResult
│
├── scripts/
│   ├── seed-test-data.ts          # Initial seed script
│   ├── import-csv-members.ts      # Bulk CSV import (NEW)
│   └── (other scripts)
│
├── docs/
│   ├── codebase-summary.md        # This file
│   ├── setup-guide.md             # Environment setup
│   ├── admin-operations-guide.md  # Admin tasks
│   ├── (CSV sample files)
│   └── (test data)
│
├── public/                        # Static assets
├── README.md                      # Main documentation
├── package.json                   # Dependencies
└── tsconfig.json                  # TypeScript config
```

## Key Data Structures

### Member Schema (TypeScript Interface)
```typescript
interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  expertise: string;
  can_help_with: string;
  looking_for: string;
  bio: string;
  avatar_url?: string;
  voice_url?: string;

  // Tier & payment
  paid: boolean;                    // true = premium, false = basic
  free_requests_used: number;
  payment_status?: 'unpaid' | 'pending' | 'paid' | 'expired';
  membership_expiry?: string;

  // Approval workflow
  approval_status?: 'pending' | 'approved' | 'rejected';
  is_csv_imported?: boolean;       // true if imported via CSV

  // Account security
  account_status?: 'active' | 'suspended' | 'banned';
  auth_provider?: string;
  auth_provider_id?: string;
  last_login?: string;

  // Rates & limits
  total_requests_count?: number;
  requests_today?: number;

  // Additional profiles
  phone?: string;
  facebook_url?: string;
  linkedin_url?: string;
  company_website?: string;
  country?: string;
  abg_class?: string;
  [more optional fields...]
}
```

### Google Sheets Schema (Cloud Storage)

**Members Sheet** (Columns A-AP)
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | id | String | Unique ID |
| B | name | String | Full name |
| C | email | String | Primary key, login email |
| D | role | String | Job title |
| E | company | String | Company name |
| ... | (fields 6-39 as per type) | | |
| AO | approval_status | String | pending\|approved\|rejected |
| AP | is_csv_imported | Boolean | TRUE if from CSV import |

**Requests Sheet** (Columns A-G)
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | id | String | Request ID |
| B | requester_id | String | FK to Members.id |
| C | request_text | String | What member needs |
| D | matched_ids | String | Comma-separated match IDs |
| E | selected_id | String | Final chosen match |
| F | status | String | pending\|matched\|connected\|declined |
| G | created_at | String | ISO timestamp |

**Connections Sheet** (Columns A-G)
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | id | String | Connection ID |
| B | request_id | String | FK to Requests.id |
| C | from_id | String | FK to Members.id (requester) |
| D | to_id | String | FK to Members.id (matched) |
| E | intro_sent | Boolean | TRUE if email sent |
| F | feedback | String | Optional user feedback |
| G | created_at | String | ISO timestamp |

## Request Flow

### 1. Member Onboarding
```
User fills form → Validate email → Gemini generates bio →
Save to Sheets → Email confirmation → Discord alert →
User in "pending" approval status
```

### 2. Admin Approval
```
Admin views dashboard → Sees pending members →
Click Approve → approval_status = "approved" →
Member can now use platform → OR Reject →
approval_status = "rejected" → Member sees rejection page
```

### 3. Connection Request (Tier-Limited)
```
Approved member clicks "Find Connection" →
Check tier & limits (canMakeRequest) →
If basic: check free_requests_used < 1 →
If premium: check requests_today < 50 →
Submit request → Gemini matches →
Show results (blurred if basic tier) →
Member selects match → Intro email sent →
Connection logged → Request status = "connected"
```

### 4. CSV Bulk Import
```
CSV file prepared → Run import-csv-members script →
For each row: Check email doesn't exist → Create member →
Set approval_status = "approved" → Set is_csv_imported = TRUE →
Members skip approval queue, ready to use immediately
```

## Tier System Details

### Basic Tier (paid = false)
- **Cost**: Free
- **Free Requests**: 1 lifetime
- **Daily Limit**: N/A
- **Profile Visibility**: Limited (no phone, LinkedIn, voice)
- **Match Results**: Blurred names/roles/companies
- **Access**: Full app after approval

### Premium Tier (paid = true)
- **Cost**: Paid membership
- **Free Requests**: Unlimited
- **Daily Limit**: 50 requests/day
- **Profile Visibility**: Full details visible
- **Match Results**: Full unblurred results
- **Access**: Full app with priority

### Tier Enforcement
- Checked in `lib/tier-utils.ts` via `canMakeRequest(member)`
- Approval status checked first (must be "approved")
- Then tier limits applied
- Basic tier tracks: `free_requests_used`
- Premium tier tracks: `requests_today` (resets daily)

## Admin Operations

### Dashboard Features (`/admin`)
- **Approval Tab**: Lists all pending members, approve/reject buttons
- **All Members Tab**: View all members, filter by status
- **Stats Panel**: Total, pending, premium count, CSV imported count
- **Tier Control**: For approved members, click to upgrade/downgrade

### CSV Import Script
```bash
npm run import-members -- --dry-run    # Preview changes
npm run import-members                  # Execute import
```
- Reads: `/docs/abg_members_portal_data_sample.csv`
- Sets: `approval_status = "approved"`, `is_csv_imported = TRUE`, `paid = FALSE`
- Skips: Existing emails, rows without email
- Rate-limits: 500ms between writes to avoid API throttling

## Authentication Flow

### Google OAuth
1. User clicks "Sign in with Google"
2. Google redirects with profile data
3. System checks if email exists in Sheets
4. If exists: Check approval_status
   - approved → Allow login
   - pending → Redirect to `/auth/pending`
   - rejected → Redirect to `/auth/rejected`
5. If not exists → Redirect to `/signup?email=...&name=...`

### Magic Link (Email)
1. User enters email
2. Resend sends magic link to inbox
3. User clicks link
4. Same approval flow as Google OAuth
5. Stores `auth_provider = "magic_link"`

## Environment Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `GOOGLE_SHEETS_ID` | String | Spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | String | Service account email |
| `GOOGLE_PRIVATE_KEY` | String | Service account private key |
| `GOOGLE_CLIENT_ID` | String | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | String | Google OAuth client secret |
| `GEMINI_API_KEY` | String | Google AI API key |
| `RESEND_API_KEY` | String | Resend email API key |
| `DISCORD_WEBHOOK_URL` | String | Discord webhook for alerts |
| `BLOB_READ_WRITE_TOKEN` | String | Vercel Blob storage token |
| `EMAIL_FROM` | String | From address for emails |
| `NEXTAUTH_SECRET` | String | JWT signing secret |
| `NEXTAUTH_URL` | String | Full auth callback URL |

## Key Metrics

| Metric | Value |
|--------|-------|
| Total Files | 102 |
| Total Tokens | 102.8k |
| Total Characters | 389k |
| Largest File | member-onboarding-form.tsx (5.6%) |
| TypeScript Coverage | ~85% |
| CSS Framework | Tailwind CSS |

## Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Set all environment variables in Vercel Dashboard
3. Deploy automatically on push to main
4. Database: Google Sheets (no additional setup)

### Local Development
1. Copy `.env.example` to `.env.local`
2. Fill in all required variables
3. Run `npm install && npm run dev`
4. Access at `http://localhost:3000`

## Notable Implementation Patterns

1. **Approval-First**: All sign-ins check approval_status before allowing access
2. **Tier-Gated Features**: Request limits enforced at API layer, not UI
3. **CSV Batch Processing**: Rate-limited imports to prevent API throttling
4. **Email-First Auth**: Magic links as default, Google OAuth as alternative
5. **Blurred Matching**: Basic tier sees softly-blocked results to encourage upgrades

## Security Considerations

- Service account key stored in environment, never in code
- Email verification required for magic link authentication
- Approval workflow prevents unauthorized member access
- Account suspension available for abuse prevention
- Discord webhooks for audit trail of admin actions
- NextAuth JWT session strategy with 30-day expiry

## Future Extensibility

Key areas designed for future expansion:
- Additional OAuth providers (Microsoft, LinkedIn)
- Payment gateway integration (Stripe for premium tier)
- Advanced filtering (location, industry, skill tags)
- Reputation/rating system for connections
- Analytics dashboard for member engagement
- API for third-party integrations
