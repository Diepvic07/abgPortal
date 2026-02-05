# ABG Alumni Connect - Admin Guide

## Overview

Member matching platform enabling smart peer connections for ABG Alumni (~300 users).

## Access Points

- **App URL:** `https://your-app.vercel.app` (update after deployment)
- **Google Sheets:** [Link to spreadsheet]
- **Discord Channel:** Admin notification channel

## Daily Operations

### 1. Reviewing New Members

1. Check Discord for "New Member Onboarded" notifications
2. Open Google Sheets → Members tab
3. Find new row (sorted by `created_at`)
4. After payment received, set `paid` column to `TRUE`

### 2. Monitoring Requests

- Discord notifies on each new request
- Sheets → Requests tab shows all requests
- Status meanings:
  - `pending` - Just submitted
  - `matched` - AI found matches
  - `connected` - Intro email sent
  - `declined` - User cancelled

### 3. Common Tasks

**Mark Member as Paid:**
1. Open Members sheet
2. Find member by name/email
3. Change `paid` column to `TRUE`

**Deactivate Member:**
1. Find member row
2. Change `status` to `inactive`

**View Connection History:**
1. Open Connections sheet
2. Filter by date or member ID

## Google Sheets Structure

### Members Sheet (Columns A-N)
| Column | Field | Description |
|--------|-------|-------------|
| A | id | Unique ID |
| B | name | Full name |
| C | email | Email address |
| D | role | Job title |
| E | company | Company name |
| F | expertise | Areas of expertise |
| G | can_help_with | What they offer |
| H | looking_for | What they need |
| I | bio | AI-generated bio |
| J | voice_url | Voice intro URL (optional) |
| K | status | active/inactive |
| L | paid | TRUE/FALSE |
| M | free_requests_used | Count of free requests used |
| N | created_at | ISO timestamp |

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

### "Email not found" Error
- Member hasn't completed onboarding
- Check Members sheet for their email

### "Membership payment required" Error
- Member's `paid` column is FALSE
- Update to TRUE after payment

### "Free request limit reached" Error
- Unpaid member used their 1 free request
- Mark as paid after payment to unlock unlimited requests

### Discord Not Receiving Notifications
- Check webhook URL in Vercel env vars
- Verify Discord channel permissions

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

- [ ] Create Google Cloud project with Sheets API enabled
- [ ] Create service account and download JSON key
- [ ] Create Google Sheet with 3 tabs (Members, Requests, Connections)
- [ ] Share sheet with service account email (Editor access)
- [ ] Get Gemini API key from Google AI Studio
- [ ] Create Resend account and get API key
- [ ] Create Discord webhook in admin channel
- [ ] Deploy to Vercel and configure all env vars
- [ ] Run seed script to add test data
- [ ] Test full flow (onboard → request → connect)

## Support

For technical issues, contact the development team.
