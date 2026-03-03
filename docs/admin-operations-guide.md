# ABG Alumni Connect - Admin Operations Guide

## Overview

Member matching platform with approval workflow and tier management. All admin operations use the Admin Dashboard at `/admin`.

## Access Points

- **Admin Dashboard:** `/admin` (approval, tier management, member directory)
- **Supabase Database:** `/admin/members` page queries Postgres directly
- **Discord Channel:** Real-time alerts for new members, requests, connections

## Admin Dashboard (`/admin`)

### Access Control
- Must be authenticated via magic link or Google OAuth
- Must have approved account status
- System checks `approval_status = "approved"` before allowing access

### Dashboard Tabs

#### 1. Pending Tab
Lists all members with `approval_status = "pending"` (newest first).

**Actions:**
- **Approve**: Change status to "approved" → member can login immediately
- **Reject**: Change status to "rejected" → member blocked permanently (sees `/auth/rejected`)

**Tips:**
- Review email, role, company before deciding
- CSV imported members skip this tab (already approved)
- Rejection cannot be undone; ensure accuracy

#### 2. All Members Tab
View all members in system. Filter available by status, tier, import source.

**Columns:**
- **Name** - Member name + ABG class (if available)
- **Email** - Login email
- **Role** - Job title + company
- **Status** - Approval status badge (pending/approved/rejected) + CSV flag
- **Tier** - Premium or Basic
- **Actions** - Available buttons based on status

### Member Approval Workflow

```
New member signs up via form or magic link
         ↓
approval_status = "pending"
         ↓
Discord notifies admin
         ↓
Admin views /admin → Pending tab
         ↓
Admin clicks Approve OR Reject
         ↓
If Approve: approval_status = "approved"
           → Member can login & use platform

If Reject:  approval_status = "rejected"
           → Member blocked forever
           → Sees rejection page at /auth/rejected
```

### Tier Management

#### How Tiers Work

| Feature | Basic | Premium |
|---------|-------|---------|
| Cost | Free | Paid membership |
| Free Requests | 1 (lifetime) | Unlimited |
| Daily Limit | N/A | 50 requests/day |
| Profile Visibility | Limited (no phone, LinkedIn) | Full details |
| Match Results | Blurred names/roles | Full visibility |

#### Changing Member Tier

1. Go to `/admin` → All Members tab
2. Find member (filter by status or search)
3. Click **Upgrade** (if Basic) or **Downgrade** (if Premium)
4. Tier changes immediately in database
5. Member sees tier change on next page load

**When to Upgrade:**
- Member paid for premium membership
- Admin decision to grant premium access
- Member needs more than 1 connection

**When to Downgrade:**
- Payment cancelled or expired
- Revoke premium access for policy violation
- Demo/trial period ended

## Data Migration

### Live Data Migration (`npm run migrate-live`)

Use this **one-time script** to migrate production data from CSV to Supabase Postgres during initial deployment.

#### What It Does
1. **Clears all existing data** - Deletes all rows from members, requests, connections tables in Supabase
2. **Imports CSV data** - Reads `docs/abg_members_portal_data.csv` and maps all fields
3. **Auto-approves members** - Sets `approval_status = "approved"` (skip manual approval)
4. **Marks members as CSV imported** - Sets `is_csv_imported = TRUE` for tracking
5. **Creates admin account** - Adds `diepvic@gmail.com` as Premium tier admin
6. **Sets Basic tier** - All members start as Basic tier; admins upgrade manually

#### CSV File Format
Location: `/docs/abg_members_portal_data.csv`

Mapping from CSV columns to members table:
| CSV Column | Index | Maps To | Notes |
|------------|-------|---------|-------|
| Submission ID | 0 | id | Unique member identifier |
| Họ và tên | 3 | name | Full name |
| Email | 5 | email | Login email (unique key) |
| Position | 15 | role | Job title |
| Organization | 12 | company | Company name |
| Organization Field | 14 | expertise | Areas of expertise |
| 3 things to share | 16 | can_help_with | What they offer |
| 3 things to learn | 17 | looking_for | What they need |
| Bio | 18 | bio | Professional bio |
| Avatar URL | 6 | avatar_url | Profile photo URL |
| Country | 19 | country | Country of residence |
| Phone | 9 | phone | Phone number (optional) |
| Facebook | 10 | facebook_url | Facebook profile (optional) |
| LinkedIn | 11 | linkedin_url | LinkedIn profile (optional) |
| Organization Website | 13 | company_website | Company website (optional) |
| Học viên khoá ABG? | 4 | abg_class | ABG cohort (Class 2024, etc.) |
| Submitted at | 2 | created_at | Import timestamp |

#### Prerequisites
- CSV file at `/docs/abg_members_portal_data.csv`
- All required env vars set (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- **WARNING: All existing data will be deleted. Back up your Supabase database before running.**

#### Step-by-Step
**1. Backup Current Data (CRITICAL)**
```bash
# Export Supabase data via dashboard or pg_dump
supabase db pull  # or use Supabase dashboard export
```

**2. Verify CSV File**
```bash
# Check file exists and has data
head -5 docs/abg_members_portal_data.csv
```

**3. Run Migration**
```bash
npm run migrate-live
```

Expected output:
```
==================================================
ABG Live Data Migration
==================================================

Connecting to Supabase...
  ✓ Connected

Clearing all tables...
  ✓ Cleared members
  ✓ Cleared requests
  ✓ Cleared connections

Parsing CSV file...
  Found 442 rows in CSV
  ✓ Parsed 442 members

Adding admin account...
  ✓ Admin account added (diepvic@gmail.com)

Inserting members into Supabase...
  ✓ Inserted 443 members

==================================================
Migration Complete!
==================================================
Total members: 443
  - CSV members: 442 (Basic tier)
  - Admin: 1 (Premium tier)

All members have:
  - approval_status = approved
  - account_status = active
  - is_csv_imported = TRUE (except admin)

Next steps:
  1. Verify member count in Supabase dashboard
  2. Test login with a sample member email
  3. Mark premium members via admin panel
```

**4. Verify in Supabase**
1. Go to Supabase dashboard → SQL Editor
2. Run: `SELECT COUNT(*) FROM members;` → Should show 443
3. Run: `SELECT name, email, approval_status FROM members LIMIT 5;` → Verify data

**5. Test Login**
```bash
# Try logging in with a member email from the CSV
# Should succeed with approval_status = "approved"
```

**6. Tier Upgrades**
1. Login to `/admin`
2. Go to All Members tab
3. Find members who paid for Premium
4. Click **Upgrade** to change their tier

#### Differences from `npm run import-members`
| Feature | migrate-live | import-members |
|---------|--------------|-----------------|
| Purpose | One-time production migration | Ongoing member imports |
| Clears data | YES (all tables) | NO (appends only) |
| Updates schema | N/A (predefined) | NO |
| Auto-approves | YES | YES |
| Creates admin | YES | NO |
| Use case | Initial deployment | Adding members later |

#### Troubleshooting

**"CSV file not found"**
- Verify: `/docs/abg_members_portal_data.csv` exists
- Check file path is correct in script

**"Migration failed" with API error**
- Verify all env vars are set correctly
- Check Supabase project is accessible and keys are valid
- Ensure database migrations have been run: `supabase migration up`

**Partial import (missing some members)**
- Re-run script - it appends and will add missing rows
- Check CSV file has no blank rows between data

**Admin account already exists after migration**
- Email conflict: Change admin email in script if re-running

## Daily Operations

### Morning Checklist

1. **Check Discord Alerts** - Review overnight sign-ups, requests, connections
2. **Review Pending Members** - Visit `/admin` → Pending tab
3. **Approve Qualified Members** - Check role, company, email legitimacy
4. **Reject Suspicious** - Flag spam accounts, incomplete profiles
5. **Monitor Request Volume** - Check for unusual activity patterns

### Approve New Members

1. Click `/admin` in browser
2. Go to **Pending** tab
3. Review member details (name, role, company, ABG class)
4. Click **Approve** if legitimate
5. Member receives confirmation and can login
6. Discord alert sent confirming approval

### Reject Problem Members

1. Click `/admin` → **Pending** tab
2. Click **Reject** button for member
3. Confirmation dialog appears (action cannot be undone)
4. Click confirm
5. Member blocked, sees `/auth/rejected` page
6. Discord alert sent confirming rejection

**Rejection Reasons:**
- Fake email address (not company domain)
- Incomplete or inappropriate profile
- Spam or bot-like behavior
- Already rejected once (reapplication)
- Not aligned with ABG Alumni values

### Manage Member Tier

For **approved members only**:

1. Go to `/admin` → **All Members** tab
2. Find member in list (use browser search if needed)
3. Click **Upgrade** (basic→premium) or **Downgrade** (premium→basic)
4. Change applies instantly
5. Member's request limits update immediately

**Upgrade to Premium When:**
- Member pays membership fee
- Member needs unlimited requests
- Special grant from leadership

**Downgrade to Basic When:**
- Membership payment cancelled
- Trial period ends
- Account under review

### Monitor Requests

- Discord notifies on each new request
- View request history in Supabase dashboard → requests table
- Status meanings:
  - `pending` - Waiting for matches
  - `matched` - AI found matches, awaiting selection
  - `connected` - Intro email sent to both parties
  - `declined` - Member cancelled request

### CSV Bulk Import

Use this to pre-approve large groups of members at once (e.g., ABG Class 2024).

#### Prerequisites
- CSV file with member data (see sample at `/docs/abg_members_portal_data_sample.csv`)
- Required columns: Email, Name, Role, Company, Expertise, Can Help With, Looking For
- All other fields optional

#### Step-by-Step Import

**1. Prepare CSV File**
- Ensure headers match expected format (Vietnamese column names in sample)
- Check for duplicate emails (will be skipped)
- Remove test/incomplete rows
- Save as UTF-8 encoding

**2. Place CSV in Project**
- Copy/update CSV file at: `/docs/abg_members_portal_data_sample.csv`
- Or update path in `scripts/import-csv-members.ts`

**3. Dry Run (Preview)**
```bash
npm run import-members -- --dry-run
```
Output shows what WILL be imported without making changes:
```
Found 47 records in CSV
[OK] Would import: user@example.com (John Doe)
[SKIP] Already exists: existing@member.com
[SKIP] Row with no email: John (no email provided)
...
IMPORT SUMMARY
Total records: 47
Imported: 45
Skipped: 2
Errors: 0
```

**4. Execute Import**
```bash
npm run import-members
```
Members are created with:
- `approval_status = "approved"` (skip approval queue)
- `is_csv_imported = TRUE` (tracked for reference)
- `paid = FALSE` (basic tier by default)
- All profile fields from CSV columns

**5. Monitor Progress**
- Watch console output for [OK], [SKIP], [ERROR] messages
- Script rate-limits to 500ms between writes (prevents API throttling)
- If interrupted, re-run to skip existing emails and resume

**6. Verify in Dashboard**
1. Go to `/admin` → All Members tab
2. Filter by status "approved" and "CSV" badge
3. Spot-check a few members
4. Discord alert sent for each new member

**Common Issues:**
- "Email already exists" → Member already imported, skip is correct
- "Invalid column headers" → Ensure CSV has exact header names
- "Timeout/API error" → Run again, script resumes from last success
- "No email in row" → Rows without email are skipped

### Common Tasks

**Bulk Approve CSV Members:**
1. Run CSV import script (see above)
2. Members auto-approved, no manual action needed
3. Verify in `/admin` → All Members tab

**Upgrade Member to Premium:**
1. Go to `/admin` → All Members tab
2. Find member, click **Upgrade**
3. Tier changes immediately
4. Member sees "Premium" badge after login

**Downgrade Member to Basic:**
1. Go to `/admin` → All Members tab
2. Find member, click **Downgrade**
3. Tier changes immediately
4. Previous requests still count against 1 free request limit

**View Connection History:**
1. Go to Supabase dashboard → connections table
2. Columns: id, request_id, from_id, to_id, intro_sent, feedback, created_at
3. Filter by member ID or date range via SQL queries

## Database Structure (Supabase Postgres)

### Members Table

**Core Identity**
| Field | Type | Notes |
|-------|------|-------|
| id | TEXT | Unique ID (primary key) |
| name | TEXT | Full name |
| email | TEXT | Login email (unique) |
| role | TEXT | Job title |
| company | TEXT | Company name |
| expertise | TEXT | Areas of expertise |

**Profile Content**
| Field | Type | Notes |
|-------|------|-------|
| can_help_with | TEXT | What they offer/expert in |
| looking_for | TEXT | What they need |
| bio | TEXT | AI-generated professional bio |
| voice_url | TEXT | Voice intro URL (optional) |
| avatar_url | TEXT | Profile photo URL |

**Contact Details**
| Field | Type | Notes |
|-------|------|-------|
| phone | TEXT | Phone number |
| facebook_url | TEXT | Facebook profile URL |
| linkedin_url | TEXT | LinkedIn profile URL |
| company_website | TEXT | Company website URL |
| country | TEXT | Country of residence |

**Membership & Tier**
| Field | Type | Notes |
|-------|------|-------|
| status | TEXT | active/inactive |
| paid | BOOLEAN | TRUE=Premium, FALSE=Basic |
| free_requests_used | INTEGER | Count (basic tier: 0 or 1) |
| total_requests_count | INTEGER | Lifetime requests made |
| requests_today | INTEGER | Requests made today (resets daily) |

**Payment Status**
| Field | Type | Notes |
|-------|------|-------|
| payment_status | TEXT | unpaid/pending/paid/expired |
| membership_expiry | TIMESTAMPTZ | When paid membership ends |

**Authentication**
| Field | Type | Notes |
|-------|------|-------|
| auth_provider | TEXT | magic_link or google |
| auth_provider_id | TEXT | Provider's user ID |
| last_login | TIMESTAMPTZ | ISO timestamp of last login |
| account_status | TEXT | active/suspended/banned |

**Profile Customization**
| Field | Type | Notes |
|-------|------|-------|
| abg_class | TEXT | ABG cohort/class (e.g., "Class 2024") |
| nickname | TEXT | Nickname (optional) |
| display_nickname_in_search | BOOLEAN | Show nickname in search |
| display_nickname_in_match | BOOLEAN | Show nickname in match results |
| display_nickname_in_email | BOOLEAN | Show nickname in intro emails |
| discord_username | TEXT | Discord handle (optional) |

**Job Market Preferences**
| Field | Type | Notes |
|-------|------|-------|
| open_to_work | BOOLEAN | Open to job offers |
| job_preferences | TEXT | Job search criteria |
| hiring | BOOLEAN | Currently hiring |
| hiring_preferences | TEXT | Hiring criteria |
| gender | TEXT | Female/Male/Undisclosed |
| relationship_status | TEXT | Personal relationship status |

**Admin & Import (AO-AP)**
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| AO | approval_status | String | **pending/approved/rejected** (NEW) |
| AP | is_csv_imported | Boolean | **TRUE if bulk imported** (NEW) |
| created_at | ISO timestamp | Sign-up or import date |

### Requests Sheet (Columns A-G)
| Column | Field | Description |
|--------|-------|-------------|
| A | id | Request ID |
| B | requester_id | Member who requested |
| C | request_text | What they need |
| D | matched_ids | Comma-separated match IDs |
| E | selected_id | Chosen match ID |
| F | status | pending/matched/connected/declined |
| G | created_at | ISO timestamp |

### Connections Sheet (Columns A-G)
| Column | Field | Description |
|--------|-------|-------------|
| A | id | Connection ID |
| B | request_id | Related request |
| C | from_id | Requester member ID |
| D | to_id | Target member ID |
| E | intro_sent | TRUE/FALSE |
| F | feedback | User feedback (optional) |
| G | created_at | ISO timestamp |

## Troubleshooting

### Login Issues

**"Email not found" Error**
- Member hasn't completed signup
- Check Members sheet (column C) for their email
- If missing: Guide them to `/signup` form

**"Pending approval" Message**
- Member's `approval_status = "pending"`
- Solution: Go to `/admin` → Pending tab → Click Approve

**"Account rejected" Message**
- Member's `approval_status = "rejected"`
- Contact admin to determine if rejection can be overturned
- If error: Manually edit sheet to "pending", re-approve

**"Account suspended" Message**
- Member's `account_status = "suspended"` or `"banned"`
- Check for policy violations, abuse, or payment issues
- Solution: Change account_status to "active" if appropriate

### Request Issues

**"Free request limit reached" Error**
- Basic tier member (`paid = FALSE`)
- `free_requests_used >= 1`
- Solution: Upgrade to Premium via `/admin` → All Members → Upgrade button

**"Daily limit exceeded" Error**
- Premium member (`paid = TRUE`)
- `requests_today >= 50`
- Solution: Explain daily reset happens at midnight UTC

**CSV Import Not Finding Members**
- Ensure CSV file at `/docs/abg_members_portal_data_sample.csv`
- Check column headers match expected Vietnamese names (see script)
- Verify UTF-8 encoding (not ANSI)
- Try dry-run first: `npm run import-members -- --dry-run`

### Discord Not Receiving Notifications
- Check webhook URL in Vercel env vars
- Verify Discord channel still exists and bot has access
- Test webhook manually in Discord channel settings
- Regenerate webhook URL if needed

## Environment Variables

Located in Vercel Dashboard → Settings → Environment Variables:

| Variable | Purpose |
|----------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key (public) |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key (secret) |
| GEMINI_API_KEY | Google AI Studio API key |
| RESEND_API_KEY | Resend email API key |
| DISCORD_WEBHOOK_URL | Discord webhook for notifications |
| BLOB_READ_WRITE_TOKEN | Vercel Blob storage token |
| GOOGLE_CLIENT_ID | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret |
| NEXTAUTH_SECRET | NextAuth JWT secret |
| NEXTAUTH_URL | NextAuth callback URL |
| EMAIL_FROM | Email from address |

## Deployment Checklist

### Supabase Database Setup
- [ ] Create Supabase project
- [ ] Get `NEXT_PUBLIC_SUPABASE_URL` from project settings
- [ ] Get `NEXT_PUBLIC_SUPABASE_ANON_KEY` from API keys
- [ ] Get `SUPABASE_SERVICE_ROLE_KEY` from API keys
- [ ] Run database migrations: `supabase migration up`
- [ ] Verify tables created: members, requests, connections, request_audits, love_match_requests, news
- [ ] Enable Row Level Security (RLS) policies (already in migration)

### Google OAuth Setup
- [ ] Create Google Cloud project
- [ ] Create Google OAuth 2.0 credentials
- [ ] Extract `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- [ ] Set OAuth redirect URIs: `https://your-domain.com/api/auth/callback/google`
- [ ] Also set: `http://localhost:3000/api/auth/callback/google` (for local dev)

### Email & Auth Setup
- [ ] Set up Resend email account
- [ ] Create API key: `RESEND_API_KEY`
- [ ] Verify "From" email or domain
- [ ] Set `EMAIL_FROM` (e.g., `ABG Connect <noreply@your-domain.com>`)
- [ ] Generate `NEXTAUTH_SECRET` (use: `openssl rand -base64 32`)
- [ ] Set `NEXTAUTH_URL` for environment

### AI & Integrations
- [ ] Get `GEMINI_API_KEY` from Google AI Studio
- [ ] Create Discord server and admin channel
- [ ] Create Discord webhook in channel
- [ ] Extract `DISCORD_WEBHOOK_URL`
- [ ] Set up Vercel Blob (if voice features needed)
- [ ] Extract `BLOB_READ_WRITE_TOKEN`

### Vercel Deployment
- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Add all environment variables to Vercel project
- [ ] Deploy to production
- [ ] Verify all webhooks working (test Discord alert)
- [ ] Test authentication flow (magic link and OAuth)

### Post-Deployment
- [ ] Run live data migration: `npm run migrate-live` (for initial ABG member import)
  - OR run seed script: `npm run seed` (for test data only)
- [ ] Verify member count in Supabase (should be 442+ members)
  - Query: `SELECT COUNT(*) FROM members;`
- [ ] Test login with sample member email
- [ ] Mark premium members via admin panel
- [ ] Test complete flow:
  - [ ] User signup via magic link
  - [ ] Admin approval flow
  - [ ] User login after approval
  - [ ] Connection request (basic tier)
  - [ ] Tier upgrade to premium
  - [ ] Admin dashboard access
- [ ] Verify Discord notifications
- [ ] Monitor error logs in Vercel dashboard

## Support

For technical issues, contact the development team.
