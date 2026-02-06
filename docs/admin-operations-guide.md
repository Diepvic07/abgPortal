# ABG Alumni Connect - Admin Operations Guide

## Overview

Member matching platform with approval workflow and tier management. All admin operations use the Admin Dashboard at `/admin`.

## Access Points

- **Admin Dashboard:** `/admin` (approval, tier management, CSV import docs)
- **Google Sheets:** Backup database with Members, Requests, Connections tabs
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
- Visit Google Sheets → Requests tab for full history
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
1. Go to Google Sheets → Connections tab
2. Columns: from_id, to_id, intro_sent, feedback, created_at
3. Filter by member ID or date range

## Google Sheets Structure

### Members Sheet (Columns A-AP)

**Core Identity (A-F)**
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | id | String | Unique ID |
| B | name | String | Full name |
| C | email | String | Primary key, login email |
| D | role | String | Job title |
| E | company | String | Company name |
| F | expertise | String | Areas of expertise |

**Profile Content (G-J)**
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| G | can_help_with | String | What they offer/expert in |
| H | looking_for | String | What they need |
| I | bio | String | AI-generated professional bio |
| J | voice_url | String | Voice intro URL (optional) |

**Contact Details (K-Q)**
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| K | phone | String | Phone number |
| L | facebook_url | String | Facebook profile URL |
| M | linkedin_url | String | LinkedIn profile URL |
| N | company_website | String | Company website URL |
| O | avatar_url | String | Profile photo URL |
| P | country | String | Country of residence |
| Q | city | String | City |

**Membership & Tier (R-V)**
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| R | status | String | active/inactive |
| S | paid | Boolean | TRUE=Premium, FALSE=Basic |
| T | free_requests_used | Number | Count (basic tier: 0 or 1) |
| U | total_requests_count | Number | Lifetime requests made |
| V | requests_today | Number | Requests made today (resets daily) |

**Payment Status (W-X)**
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| W | payment_status | String | unpaid/pending/paid/expired |
| X | membership_expiry | String | ISO date when paid membership ends |

**Authentication (Y-AB)**
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| Y | auth_provider | String | magic_link or google |
| Z | auth_provider_id | String | Provider's user ID |
| AA | last_login | String | ISO timestamp of last login |
| AB | account_status | String | active/suspended/banned |

**Profile Customization (AC-AH)**
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| AC | abg_class | String | ABG cohort/class (e.g., "Class 2024") |
| AD | nickname | String | Nickname (optional) |
| AE | display_nickname_in_search | Boolean | Show nickname in search |
| AF | display_nickname_in_match | Boolean | Show nickname in match results |
| AG | display_nickname_in_email | Boolean | Show nickname in intro emails |
| AH | discord_username | String | Discord handle (optional) |

**Job Market Preferences (AI-AN)**
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| AI | open_to_work | Boolean | Open to job offers |
| AJ | job_preferences | String | Job search criteria |
| AK | hiring | Boolean | Currently hiring |
| AL | hiring_preferences | String | Hiring criteria |
| AM | gender | String | Female/Male/Undisclosed |
| AN | relationship_status | String | Personal relationship status |

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
| GOOGLE_SHEETS_ID | Spreadsheet ID from URL |
| GOOGLE_SERVICE_ACCOUNT_EMAIL | Service account email |
| GOOGLE_PRIVATE_KEY | Service account private key |
| GEMINI_API_KEY | Google AI Studio API key |
| RESEND_API_KEY | Resend email API key |
| DISCORD_WEBHOOK_URL | Discord webhook for notifications |
| BLOB_READ_WRITE_TOKEN | Vercel Blob storage token |

## Deployment Checklist

### Google Cloud & Sheets Setup
- [ ] Create Google Cloud project
- [ ] Enable Google Sheets API & Google Drive API
- [ ] Create service account and download JSON key
- [ ] Extract `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`
- [ ] Create Google Sheet with 3 tabs: Members, Requests, Connections
- [ ] Share sheet with service account email (Editor role)
- [ ] Set up column headers in all tabs (optional if using seed script)
- [ ] Get `GOOGLE_SHEETS_ID` from sheet URL

### Authentication Setup
- [ ] Create Google OAuth 2.0 credentials
- [ ] Extract `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- [ ] Set OAuth redirect URIs: `http://localhost:3000/api/auth/callback/google`
- [ ] Set up Resend email account
- [ ] Create API key: `RESEND_API_KEY`
- [ ] Generate verified "From" email or domain
- [ ] Set `EMAIL_FROM` (e.g., `ABG Connect <onboarding@your-domain.com>`)
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
- [ ] Run seed script: `npm run seed` (optional test data)
- [ ] Run CSV import: `npm run import-members` (for pre-approved members)
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
