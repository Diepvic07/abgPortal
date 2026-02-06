# Authentication Guide

## Overview

ABG Alumni Connect supports dual authentication:
1. **Magic Link (Email)** - Resend sends verification link to inbox
2. **Google OAuth** - Sign in with existing Google account

Both methods require email verification and member approval before platform access.

## Authentication Flow

### Step 1: User Arrives at Login
User visits `/login` and sees two options:
- Sign in with Email (Magic Link)
- Sign in with Google

### Step 2: Email Verification
**Magic Link Path:**
1. User enters email
2. NextAuth generates verification link
3. Resend sends email with 24-hour link
4. User clicks link to verify ownership

**Google OAuth Path:**
1. User clicks "Sign in with Google"
2. Google OAuth popup opens
3. User authenticates with Google account
4. Google returns verified email & profile

### Step 3: System Checks Email
System queries Members sheet for email match:
- **Email found** → Check approval_status
- **Email not found** → Redirect to `/signup`

### Step 4: Approval Status Check

**If approval_status = "approved":**
- Login succeeds
- Update `last_login` timestamp
- Create JWT session
- Redirect to home page

**If approval_status = "pending":**
- Login redirects to `/auth/pending`
- Message: "Your membership is pending admin approval"
- User waits for admin decision
- Cannot access platform features

**If approval_status = "rejected":**
- Login redirected to `/auth/rejected`
- Message: "Your membership application was rejected"
- Access permanently denied
- Cannot reapply automatically

### Step 5: Account Status Check

After approval check, system verifies account_status:
- **active** → Proceed with login
- **suspended** → Redirect to `/auth/suspended`
- **banned** → Redirect to `/auth/suspended`

### Step 6: Session Created
- JWT token created with user email
- Token stored in secure HTTP-only cookie
- Session valid for 30 days
- Last login updated in database

## Magic Link (Email) Authentication

### How It Works

1. User enters email at `/login`
2. NextAuth sends request to Resend email service
3. Email arrives in user's inbox with 24-hour link
4. Link contains signed token (cannot be forged)
5. User clicks → Verifies ownership → Logs in

### Email Template

Resend sends custom HTML + text version:

**Subject:** Sign in to ABG Alumni Connect

**Body includes:**
- Greeting with user email
- Clickable sign-in button
- Fallback link (copy-paste)
- 24-hour expiration warning
- Company branding

### Configuration

**Environment Variables:**
```
EMAIL_FROM=ABG Connect <onboarding@resend.dev>
RESEND_API_KEY=re_xxxxx (from Resend dashboard)
NEXTAUTH_URL=https://your-domain.com (callback URL)
```

**Email Sending Logic:**
- Located in: `lib/auth.ts` EmailProvider
- Template: `lib/auth-email-template.ts`
- Called from: NextAuth email provider callback

### Advantages
- No password management
- Works across devices
- Secure (email-verified access)
- Good for mobile users
- Lower friction than passwords

### Disadvantages
- Requires email access
- 24-hour link expiration
- Email delivery delays possible
- Cannot initiate from app without email client

## Google OAuth Authentication

### How It Works

1. User clicks "Sign in with Google" button
2. App redirects to Google OAuth consent screen
3. Google asks for permission to share:
   - Email address
   - Name
   - Profile picture
4. User grants → Google redirects back with tokens
5. NextAuth exchanges tokens for user info
6. System checks approval_status

### Configuration

**Environment Variables:**
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
NEXTAUTH_SECRET=randomly_generated_32_char_string
```

**How to Get Credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project (or select existing)
3. Go to APIs & Services → OAuth consent screen
4. Configure:
   - App name: "ABG Alumni Connect"
   - User type: External
   - Scopes: email, profile, openid
5. Go to Credentials → Create OAuth 2.0 ID
6. Application type: Web application
7. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google`
8. Save Client ID and Client Secret

### OAuth Callback Flow

```
User clicks button
    ↓
Google OAuth consent screen
    ↓
User grants permission
    ↓
Google → https://app/api/auth/callback/google?code=xxx
    ↓
NextAuth exchanges code for tokens
    ↓
Extract user email, name, picture
    ↓
Call signIn() callback (see below)
```

### Advantages
- No password required
- Single-click login
- Consistent identity (Google account)
- Profile picture auto-populated
- Works seamlessly across devices

### Disadvantages
- Requires Google account
- Cannot use offline without Google
- Depends on Google availability
- Profile picture from Google only

## SignIn Callback Logic

Both authentication methods call the same `signIn()` callback in `lib/auth.ts`:

```typescript
async signIn({ user, account }) {
  // 1. Verify email exists
  if (!user.email) return false;

  // 2. Check if member exists in Sheets
  const member = await getMemberByEmail(user.email);

  // 3. If new email → redirect to signup
  if (!member) {
    return `/signup?email=${encodeURIComponent(user.email)}`;
  }

  // 4. Check approval_status
  if (member.approval_status === "pending") {
    return `/auth/pending?email=${encodeURIComponent(user.email)}`;
  }
  if (member.approval_status === "rejected") {
    return "/auth/rejected";
  }

  // 5. Check account_status
  if (member.account_status === "suspended" || member.account_status === "banned") {
    return "/auth/suspended";
  }

  // 6. Update last_login timestamp
  await updateMemberLastLogin(user.email);

  // 7. Allow login
  return true;
}
```

## New Member Signup Flow

### Path: `/signup`

When new email detected during login:

1. Redirect to `/signup?email=user@example.com&name=User%20Name`
2. User fills out onboarding form:
   - Name
   - Role
   - Company
   - Expertise
   - Can help with
   - Looking for
   - Additional info (optional)
3. Click Submit
4. API call to `/api/onboard`:
   - Generate UUID
   - Call Gemini to create bio
   - Save to Members sheet
   - Set `approval_status = "pending"`
   - Send confirmation email via Resend
   - Alert admin via Discord
5. Redirect to `/auth/pending` → Display "waiting for approval"
6. Admin reviews in `/admin` → Clicks Approve
7. Next login succeeds

## Pending Approval State

### Path: `/auth/pending`

Shown when `approval_status = "pending"`:

```
┌─────────────────────────────────────┐
│  Membership Pending Approval         │
│                                     │
│  Hi user@example.com                │
│                                     │
│  Your membership is under review.   │
│  We'll send an email when approved. │
│                                     │
│  Expected: 1-2 business days        │
│                                     │
│  [← Back to Login]                  │
└─────────────────────────────────────┘
```

**Features:**
- Shows user's email
- Explains approval process
- Sets expectations (1-2 days)
- Cannot proceed further
- Can return to login

## Rejected Status

### Path: `/auth/rejected`

Shown when `approval_status = "rejected"`:

```
┌─────────────────────────────────────┐
│  Membership Application Rejected     │
│                                     │
│  Your application was not approved. │
│  Unfortunately, you are not able to │
│  join at this time.                 │
│                                     │
│  For questions, contact support:    │
│  admin@abgalumni.org                │
│                                     │
│  [← Back to Home]                   │
└─────────────────────────────────────┘
```

**Notes:**
- Rejection is permanent
- No reapplication option
- Cannot view platform
- Only contact admin for appeals

## Account Suspended State

### Path: `/auth/suspended`

Shown when `account_status != "active"`:

```
┌─────────────────────────────────────┐
│  Account Suspended                  │
│                                     │
│  Your account has been suspended.   │
│                                     │
│  Reason: Policy violation           │
│  Duration: Permanent                │
│                                     │
│  Appeal: contact admin              │
│  Email: admin@abgalumni.org        │
│                                     │
│  [← Back to Home]                   │
└─────────────────────────────────────┘
```

**Reasons for Suspension:**
- Abuse or harassment
- Fake profile information
- Payment dispute
- Policy violations
- Admin discretion

## Session Management

### JWT Token Strategy

NextAuth uses JWT (JSON Web Tokens) for sessions:

```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60  // 30 days
}
```

**Token Contents:**
```json
{
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://...",
  "provider": "google" or "email",
  "providerAccountId": "xxx",
  "iat": 1704067200,
  "exp": 1706745600
}
```

**Token Expiration:**
- Valid for 30 days
- Auto-refreshed on page load
- Stored in HTTP-only cookie
- Cannot be accessed by JavaScript

### Checking Authentication in Code

**In React Components:**
```typescript
import { useSession } from "next-auth/react";

export default function Page() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauthenticated") return <div>Not logged in</div>;

  return <div>Welcome, {session?.user?.email}</div>;
}
```

**In API Routes:**
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ user: session.user });
}
```

## Security Best Practices

### Environment Variable Protection
- Never commit secrets to git
- Use `.env.local` for local development
- Use Vercel dashboard for production secrets
- Rotate secrets regularly

### Email Verification
- 24-hour magic link expiration
- One-time-use tokens
- Prevent email enumeration
- Rate-limit login attempts

### OAuth Security
- Redirect URI whitelist validation
- PKCE flow for native apps
- Secret refresh on token rotation
- State parameter to prevent CSRF

### Session Security
- JWT signed with secret
- HTTP-only cookie (no JS access)
- Secure flag (HTTPS only in production)
- SameSite=Lax to prevent CSRF

### Admin Access
- Approval status checked every login
- Account status validated per request
- Session revoked if status changes
- Discord audit trail of approvals

## Troubleshooting

### Magic Link Email Not Arriving
**Cause:** Resend email service issue or spam filter
**Solution:**
- Check spam/promotions folder
- Verify `EMAIL_FROM` configured correctly
- Check Resend API quota in dashboard
- Try requesting link again (24-hour limit)

### Google OAuth Error: Invalid Client
**Cause:** Client ID/Secret mismatch or redirect URI misconfigured
**Solution:**
- Verify credentials in Google Cloud Console
- Check redirect URI matches exactly: `https://domain.com/api/auth/callback/google`
- Ensure Sheets API enabled in project
- Regenerate credentials if needed

### Session Not Persisting After Login
**Cause:** NEXTAUTH_SECRET not set or cookie issues
**Solution:**
- Generate secret: `openssl rand -base64 32`
- Set in `.env.local` and Vercel
- Clear browser cookies
- Check cookie policy (cookies enabled)
- Verify NEXTAUTH_URL matches deployment domain

### Member Stuck in "Pending" Forever
**Cause:** Admin hasn't approved or email notification missed
**Solution:**
- Admin checks `/admin` → Pending tab
- Click Approve button
- Send notification email to member
- Member tries logging in again

## Testing Authentication Locally

### Magic Link Testing
```bash
# 1. Start dev server
npm run dev

# 2. Go to http://localhost:3000/login
# 3. Enter email: test@example.com
# 4. Check console logs for Resend email (in dev mode, printed to console)
# 5. Click link from console output

# OR use Resend test inbox at Resend.com dashboard
```

### Google OAuth Testing
```bash
# Prerequisites:
# 1. Google Cloud Console project created
# 2. OAuth credentials with http://localhost:3000/api/auth/callback/google
# 3. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local

# 1. Start dev server
npm run dev

# 2. Go to http://localhost:3000/login
# 3. Click "Sign in with Google"
# 4. Use test Google account
# 5. Grant permissions when prompted
```

### Admin Approval Testing
```bash
# 1. Signup new member → redirects to /auth/pending
# 2. Use admin account to login (if approved)
# 3. Visit http://localhost:3000/admin
# 4. Click Approve on new member
# 5. New member can now login
```

## Related Documentation
- [Setup Guide](./setup-guide.md) - Environment variable configuration
- [Admin Operations Guide](./admin-operations-guide.md) - Approval workflow
- [Codebase Summary](./codebase-summary.md) - Technical architecture
