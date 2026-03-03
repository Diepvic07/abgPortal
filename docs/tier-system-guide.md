# Tier System Guide

## Overview

ABG Alumni Connect uses a two-tier membership model to balance free access with sustainable operation:

| Feature | Basic | Premium |
|---------|-------|---------|
| **Cost** | Free | Paid membership |
| **Lifetime Requests** | 3 total | Unlimited |
| **Monthly Limit** | N/A | 100 per month |
| **Daily Soft-Cap** | N/A | 20/day (warning only) |
| **Profile Access** | Limited (no phone, LinkedIn) | Full access |
| **Match Results** | Blurred (teaser) | Full visibility + Match Score |
| **Premium Badge** | — | ✓ |

## Tier Determination

### How System Determines Tier

Tier is determined by single boolean flag in Members sheet:

```
Column S: paid = TRUE  → Premium Tier
Column S: paid = FALSE → Basic Tier
```

**Code location:** `lib/tier-utils.ts`

```typescript
export function getMemberTier(member: Member): TierType {
  return member.paid ? "premium" : "basic";
}
```

### Admin Tier Management

Admins can change tier for approved members:

1. Go to `/admin` → All Members tab
2. Find member in list
3. Click **Upgrade** (basic→premium) or **Downgrade** (premium→basic)
4. Change applies immediately in database
5. Member sees tier change on next page reload

**API Endpoint:** `/api/admin/tier` (POST)
```json
Request: { "memberId": "xxx", "tier": "premium" }
Updates: { "paid": true }
Response: { "success": true }
```

## Basic Tier

### Characteristics

- **Default tier** for new signups
- **Cost**: Free
- **Request limit**: 3 lifetime requests
- **Profile visibility**: Limited
- **Match results**: Blurred/soft-blocked

### Request Limits

Basic tier members get **3 lifetime requests total**.

**Tracking:**
- Column T: `free_requests_used` tracks count (0-3)
- Once `free_requests_used >= 3`, cannot make more requests
- Limit is lifetime, not per month/year

**Enforcement Logic:**
```typescript
const used = member.free_requests_used || 0;
const limit = 3;  // TIER_LIMITS.basic.lifetime_requests

if (used >= limit) {
  return { allowed: false, reason: "limit_reached", remaining: 0 };
}
return { allowed: true, remaining: limit - used };
```

### Profile Visibility (Soft Block)

When a Basic tier member views another member's profile:
- **Visible**: Name (blurred), role (blurred), company (blurred), expertise
- **Hidden**: Phone number, LinkedIn URL, voice recording
- **UX**: Fields show as "••••••" with message: "Upgrade to see full profile"

**Code location:** `lib/tier-utils.ts` `filterProfileByTier()`

```typescript
export function filterProfileByTier(profile: Member, viewerTier: TierType) {
  if (viewerTier === "premium") return profile;  // See everything

  // Basic sees limited info
  return {
    ...limitedProfile,
    phone: undefined,
    linkedin_url: undefined,
    voice_url: undefined,
  };
}
```

### Match Results Display

When Basic tier member gets match results:

**Premium Sees:**
```
John Smith
Senior Product Manager at TechCorp
LinkedIn: linkedin.com/in/johnsmith
Phone: +1 234-567-8900
```

**Basic Sees (Blurred):**
```
Jo** Sm***
Se**** Pr** Ma****r at Te**C**p
(Soft block message: "Upgrade to view full match")
```

**Blurring Function:**
```typescript
export function blurText(text: string, showFirst = 2): string {
  if (text.length <= 4) return "*".repeat(text.length);
  return firstPart + "***" + lastPart;
}

export function createBlurredMatch(match: { id, reason, member }) {
  return {
    id: match.id,
    name: blurText(match.member.name, 2),        // "Jo** Sm***"
    role: blurText(match.member.role, 3),        // "Se**** ..."
    company: blurText(match.member.company, 3),  // "Te**C**p"
    reason: match.reason,  // Keep reason visible as teaser
    blurred: true,
  };
}
```

### Upselling Strategy

Basic tier soft blocks are designed to encourage upgrades:

1. **Limited preview**: Show enough to see if match is interesting
2. **Visible reason**: Display why they matched (valuable info)
3. **Teaser effect**: First 2-3 characters visible + last 2-3 characters
4. **Upgrade prompt**: Clear CTA: "Upgrade to Premium to see full profile"

**Example:**
```
Match: "jo**** sm*th"
Reason: "Expert in blockchain, based in Vietnam"
Action: [Upgrade to view full details]
```

Member sees enough to know if match is interesting, but needs to upgrade for full access.

## Premium Tier

### Characteristics

- **Cost**: Paid membership
- **Request limit**: 100 per month with daily soft-cap of 20
- **Profile visibility**: Full access to all fields
- **Match results**: Unblurred, full details + Match Score (0-100)
- **Priority**: Treated as valued member

### Request Limits

Premium tier members get **100 requests per month** with a **daily soft-cap of 20** (warning only).

**Tracking:**
- Column BB: `requests_this_month` counts monthly usage
- Column BC: `month_reset_date` tracks current month's start (ISO date)
- Column V: `requests_today` counts requests in current day (informational)
- Resets monthly and daily at UTC midnight

**Enforcement Logic:**
```typescript
if (tier === "premium") {
  // Check monthly limit (hard block)
  const monthlyUsed = member.requests_this_month || 0;
  const monthlyRemaining = 100 - monthlyUsed;

  if (monthlyRemaining <= 0) {
    return { allowed: false, reason: "monthly_limit_reached", remaining: 0 };
  }

  // Check daily soft-cap (warning only)
  const dailyUsed = member.requests_today || 0;
  const warning = dailyUsed >= 20
    ? `You've made ${dailyUsed} requests today. Consider spreading requests across days.`
    : undefined;

  return { allowed: true, warning, remaining: monthlyRemaining };
}
```

### Profile Visibility (Full Access)

Premium tier members see complete profiles:
- All text fields visible
- Phone number visible
- LinkedIn URL clickable
- Voice recording playable
- All optional fields shown

### Daily & Monthly Resets

**Daily Reset (requests_today):**
- Resets at **UTC midnight** (00:00 UTC)
- Happens on first request of day
- Compare timestamp with today's date; if different → reset to 0

**Monthly Reset (requests_this_month):**
- Resets when month changes from `month_reset_date`
- Happens on first request of new month
- Compare `month_reset_date` with current month; if different → reset counter and update date

### Premium Badge

Premium members see visual indicator:
```
┌────────────────────┐
│  PREMIUM           │  ← Purple badge
│  Unlimited Access  │
└────────────────────┘
```

Shown in:
- Admin dashboard (tier column)
- User profile page
- Dashboard stats

## Approval Status vs. Tier Status

### Important Distinction

These are **different systems**:

**Approval Status** (`approval_status` column):
- Controls **WHO CAN USE THE PLATFORM**
- Values: pending, approved, rejected
- Set by: Admin approval workflow
- Checked **on every login**
- Blocks: Rejected members cannot login at all

**Tier Status** (`paid` boolean column):
- Controls **WHAT THEY CAN DO**
- Values: basic (false) or premium (true)
- Set by: Admin tier management
- Checked **on every request**
- Limits: Requests, profile visibility, daily caps

### Flow Diagram

```
Login Attempt
    ↓
[Check approval_status]
    ├─ pending → /auth/pending (wait)
    ├─ rejected → /auth/rejected (blocked)
    └─ approved → Continue
         ↓
    [Update last_login, create session]
         ↓
    User logged in ✓
         ↓
User makes request
    ↓
[Check approval_status again]
    └─ Must still be "approved" ✓
    ↓
[Check paid tier]
    ├─ basic → 1 free request (track free_requests_used)
    └─ premium → 50/day limit (track requests_today)
    ↓
[Check account_status]
    └─ Must be "active" (not suspended/banned) ✓
    ↓
[Check tier limits]
    ├─ Basic: free_requests_used < 1 ✓
    └─ Premium: requests_today < 50 ✓
    ↓
Request allowed ✓
```

## Tier Enforcement Points

### At Login

```typescript
// lib/auth.ts - signIn callback
if (member.approval_status === "pending") {
  return `/auth/pending`;  // Block until approved
}
if (member.approval_status === "rejected") {
  return "/auth/rejected";  // Permanent block
}
if (member.account_status === "suspended") {
  return "/auth/suspended";  // Temporary block
}
```

### At Request Time

```typescript
// lib/tier-utils.ts - canMakeRequest()
export function canMakeRequest(member: Member) {
  // Check approval first
  if (member.approval_status !== "approved") {
    return { allowed: false, reason: "not_approved" };
  }

  // Check account status
  if (member.account_status !== "active") {
    return { allowed: false, reason: "account_suspended" };
  }

  // Check tier limits
  const tier = getMemberTier(member);
  if (tier === "basic") {
    const used = member.free_requests_used || 0;
    if (used >= 3) {  // 3 lifetime limit
      return { allowed: false, reason: "limit_reached", remaining: 0 };
    }
    return { allowed: true, remaining: 3 - used };
  } else { // premium
    const monthlyUsed = member.requests_this_month || 0;
    const monthlyRemaining = 100 - monthlyUsed;
    if (monthlyRemaining <= 0) {
      return { allowed: false, reason: "monthly_limit_reached", remaining: 0 };
    }

    // Daily soft-cap (warning only)
    const dailyUsed = member.requests_today || 0;
    const warning = dailyUsed >= 20 ? `Made ${dailyUsed} requests today.` : undefined;

    return { allowed: true, warning, remaining: monthlyRemaining };
  }
}
```

### At Profile View

```typescript
// When rendering member profile
const viewerTier = getMemberTier(viewer);
const profileData = filterProfileByTier(targetProfile, viewerTier);

// If basic tier, phone/linkedin/voice are undefined
```

## Tier Upgrade Flow

### User Wants to Upgrade

1. User clicks "Upgrade to Premium" on any soft-blocked content
2. Redirects to `/upgrade` or payment page
3. User completes payment process
4. Payment processor confirms success
5. System receives webhook
6. Admin marks `paid = TRUE` in database
7. User refreshed → sees "Premium" badge
8. Profile visibility updated
9. Can now make unlimited requests

### Current Implementation

**Upgrade Button:**
```typescript
// On soft-blocked profile or limit-reached error
<button onClick={() => window.location.href = "/upgrade"}>
  Upgrade to Premium
</button>
```

**Admin Upgrade:**
```typescript
// /admin dashboard
<button onClick={() => handleTierChange(memberId, "premium")}>
  Upgrade to Premium
</button>
```

**API Call:**
```typescript
fetch("/api/admin/tier", {
  method: "POST",
  body: JSON.stringify({ memberId, tier: "premium" }),
});
```

## Tier Downgrade

### Admin Downgrades Member

1. Admin goes to `/admin` → All Members tab
2. Finds Premium member
3. Clicks **Downgrade** button
4. Confirms action (irreversible)
5. `paid = FALSE` in database
6. Member's tier changes immediately
7. Member sees "Basic" badge on next reload
8. Profile visibility restricted on next profile view
9. Request limit enforced on next request attempt

**Notes:**
- Previous requests still count (cannot undo)
- If member used 1 free request as basic, still counts
- Can be re-upgraded later if payment received

## CSV Import Tier Assignment

### Default Tier for Imports

CSV-imported members are created with:
```typescript
paid: false,                    // Basic tier by default
approval_status: "approved",    // Skip approval queue
is_csv_imported: true,          // Marked as imported
free_requests_used: 0,          // No requests made yet
requests_today: 0,
```

### Rationale

- No payment received yet, so Basic tier is appropriate
- Pre-approved so they skip admin queue
- Can be individually upgraded after import if needed

### Bulk Tier Assignment

If you need to import members as Premium:

1. Import with script (creates as Basic)
2. Use bulk action in `/admin` to select multiple
3. Click "Bulk Upgrade" → set to Premium
4. Or manually upgrade each one

(Bulk feature may be added in future)

## Membership Expiry (Future Feature)

### Planned Enhancement

Current system has `membership_expiry` column but not fully implemented.

**Future Use:**
```typescript
if (member.payment_status === "paid" && member.membership_expiry) {
  const expiry = new Date(member.membership_expiry);
  if (new Date() > expiry) {
    // Membership expired
    return "expired";  // Downgrade to basic tier
  }
}
```

**Grace Period:**
- 7 days after expiry before full downgrade
- `getMembershipStatus()` returns "grace-period"
- Can still make requests but see upgrade prompts
- After grace period, auto-downgrade to basic

## Tier Limits Configuration

All tier limits defined in one place: `lib/tier-utils.ts`

```typescript
export const TIER_LIMITS = {
  basic: {
    lifetime_requests: 3,     // Lifetime requests
  },
  premium: {
    monthly_limit: 100,       // Per month
    daily_soft_cap: 20,       // Per day (warning only)
  },
} as const;
```

**To adjust limits:**
1. Edit `TIER_LIMITS` object
2. Recompile/redeploy
3. Changes apply immediately to new requests
4. Does not affect already-made requests

**Example: Increase monthly limit to 150**
```typescript
premium: {
  monthly_limit: 150,         // ← Change from 100
  daily_soft_cap: 20,
}
```

## Analytics & Reporting

### Tier Metrics

**In Admin Dashboard:**
- Total Premium members count
- Basic vs. Premium ratio
- Member signup-to-upgrade rate

**In Google Sheets:**
- Sort Members by `paid` column
- Filter by `is_csv_imported` flag
- See `free_requests_used` distribution
- Track `requests_today` patterns

### Key Questions

- How many basic members upgrade monthly?
- What's average time from signup to upgrade?
- Which members would benefit from upgrade?
- Are daily limits being hit (bottleneck)?

## Tier System Edge Cases

### New Member Onboarding

Q: What tier is new member at?
A: Basic tier (paid=false) automatically

Q: Can they make requests immediately?
A: No, must wait for approval first (approval_status check). Then gets 3 lifetime requests.

### CSV Import

Q: Can I import members as Premium?
A: Yes, but not in one step. Import as Basic, then bulk upgrade.

### Reroll/Refresh Feature

Q: Does rerolling/running again count against quota?
A: Yes, each "Run Again" request counts as a full request against monthly limit (Premium) or lifetime total (Basic).

### Monthly Reset Edge Case

Q: What happens if user was in grace period during month boundary?
A: Counter resets; previous month's usage doesn't carry over. Grace period only applies within current month.

### Account Suspension

Q: Does suspension affect tier?
A: No, tier remains. Account status blocks all access first.

### Payment Processing

Q: When does tier update after payment?
A: Admin manually clicks Upgrade in `/admin` dashboard (currently)

Q: Can it be automated?
A: Yes, with Stripe webhook → auto-update `paid` flag

## Related Documentation

- [Admin Operations Guide](./admin-operations-guide.md) - Tier management UI
- [Codebase Summary](./codebase-summary.md) - Technical implementation
- [Authentication Guide](./authentication-guide.md) - Approval workflow
