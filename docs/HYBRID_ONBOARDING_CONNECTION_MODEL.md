# Hybrid Onboarding and Connection Email Model

## Purpose

This document defines the recommended onboarding and connection-request model for the ABG Members Portal.

The goals are:

- preserve launch network effects from the imported 500+ alumni profiles
- allow alumni to sign up with any current email
- avoid duplicate alumni profiles during onboarding
- avoid treating old institute emails as login identity
- support safe member-to-member connection requests by email

This spec is intended as a developer handoff.

## Product Principles

1. Authentication and alumni identity are separate concerns.
2. A user may sign up with a current email that is different from the historical email stored in institute data.
3. Imported alumni profiles should remain visible and connectable at launch, even if the alumni has not claimed the profile yet.
4. Legacy institute email can be used as an initial outreach channel, but should not be treated as verified current contact consent.
5. Direct two-way introductions should only happen after the recipient has either:
   - claimed the profile and enabled contact, or
   - explicitly accepted the connection request

## Core Entities

### `users`

Represents the login account.

Suggested fields:

- `id`
- `login_email`
- `auth_provider` (`google`, `email_magic_link`, `password` if used)
- `email_verified`
- `status` (`pending_claim`, `pending_admin_approval`, `approved_free`, `pro_active`, `rejected`)
- `created_at`

Rules:

- `login_email` must be unique across user accounts.
- `login_email` is used for authentication only.
- `login_email` must not overwrite imported alumni emails automatically.

### `alumni_profiles`

Represents the imported or claimed alumni directory profile.

Suggested fields:

- `id`
- `full_name`
- `class_year`
- `program`
- `organization`
- `title`
- `city`
- `country`
- `linkedin_url`
- `image_url`
- `claimed_by_user_id` nullable
- `claim_status` (`unclaimed`, `claimed`, `disputed`)
- `contact_status` (`legacy_only`, `contact_enabled`, `contact_disabled`)
- `created_from_source` (`imported_institute_data`, `app_created`)

Rules:

- One alumni profile can be claimed by at most one active user account.
- Imported profiles must remain stable as the source directory record.
- If claim ambiguity exists, mark as `disputed` and require admin review.

### `alumni_profile_emails`

Represents all emails associated with a profile.

Suggested fields:

- `id`
- `profile_id`
- `email`
- `email_type` (`institute`, `login`, `personal`, `other`)
- `source` (`imported`, `user_added`, `admin_added`)
- `is_primary_contact`
- `is_contact_enabled`
- `is_verified_by_user`

Rules:

- A profile may have multiple emails.
- Imported institute email should be stored here with `source=imported`.
- A user-approved contact email must be stored separately from the account login email model.
- Only one email per profile should be `is_primary_contact=true`.

### `profile_claims`

Represents user claim requests for imported profiles.

Suggested fields:

- `id`
- `user_id`
- `profile_id` nullable for unmatched manual review
- `submitted_name`
- `submitted_class_year`
- `submitted_program`
- `submitted_old_email`
- `submitted_phone`
- `submitted_linkedin`
- `status` (`pending`, `approved`, `rejected`, `needs_more_info`, `disputed`)
- `admin_notes`
- `created_at`
- `reviewed_at`

### `connection_requests`

Represents a request from one member to connect with another.

Suggested fields:

- `id`
- `requester_user_id`
- `requester_profile_id`
- `recipient_profile_id`
- `status` (`pending_recipient_acceptance`, `accepted`, `declined`, `expired`, `cancelled`)
- `delivery_mode` (`legacy_invite`, `direct_intro`)
- `recipient_email_snapshot`
- `message`
- `created_at`
- `responded_at`

## Onboarding Flow

```text
+-----------------------+
| Step 1: Authentication| (Google / Email Magic Link)
+-----------+-----------+
            |
            v
+-----------------------+
| Step 2: Email Verif.  | (Auth Identity Verification)
+-----------+-----------+
            |
            v
+-----------------------+      No /       +-----------------------+
| Step 3: Claim Prompt  +---------------->| Manual Review Intake  |
|  "Are you listed?"    |      Unsure     +-----------+-----------+
+-----------+-----------+                             |
            |                                         |
            | Yes                                     |
            v                                         |
+-----------------------+                             |
|  Step 4: Claim Flow   |                             |
|  (Search & Select)    |                             |
+-----------+-----------+                             |
            |                                         |
            v                                         |
     Match Confidence?                                |
      /     |     \                                   |
    High   Med    Low --------------------------------+
     |      |                                         |
     +------+                                         |
            |                                         |
            v                                         |
+-----------------------+                             |
| Step 5: Profile Comp. | (Fill missing required info)
+-----------+-----------+                             |
            |                                         |
            v                                         |
+-----------------------+                             |
| Step 6: Contact Pref. | (Primary Email & Opt-in)    |
+-----------+-----------+                             |
            |                                         |
            v                                         |
+-----------------------+                             |
| Step 7: Admin Approval|<----------------------------+
+-----------+-----------+
            |
            v
    [ Profile Claimed ]
```

### Step 1: Authentication

Allow:

- `Continue with Google`
- `Continue with Email`

Recommended note:

- Use Google as the primary sign-in option.
- Use email magic link as the fallback.

### Step 2: Email Verification

The user verifies the current email used for login.

Important:

- This proves account ownership only.
- This does not prove ownership of a specific alumni profile.

### Step 3: Claim Prompt

After first sign-in, ask:

- `Are you already listed in our alumni directory?`

If yes:

- send user to claim flow

If no or unsure:

- send user to manual review intake instead of auto-creating a duplicate profile immediately

### Step 4: Claim Flow

Collect:

- full name used at the institute
- class/cohort/year
- program/department if available
- old institute email if remembered, optional
- LinkedIn or phone, optional

System behavior:

- search the imported alumni profiles
- show likely matches
- let the user select a profile and submit a claim

Matching guidance:

- high confidence: exact full name + exact class year
- medium confidence: similar name + same class/program
- low confidence: no strong match or multiple equally plausible matches

Low-confidence cases:

- send to admin review
- do not auto-create a second alumni profile

### Step 5: Profile Completion

Before admin approval, require the user to fill missing required profile fields.

### Step 6: Contact Preference Setup

Before the account becomes fully usable, require the user to choose contact behavior.

Show:

- imported email(s) on file
- current login email
- option to add a new preferred contact email

Ask:

- `Which email should other members use to connect with you?`
- `Do you want to receive connection requests by email?`

Result:

- save one `primary contact email`
- set `is_contact_enabled=true` only if user explicitly opts in

### Step 7: Admin Approval

Admin reviews:

- claim data
- matched alumni profile
- imported profile details
- supporting evidence
- whether profile is already claimed

Admin actions:

- approve claim
- reject claim
- request more info
- mark disputed

If approved:

- link `users.id` to `alumni_profiles.claimed_by_user_id`
- set account to `approved_free`

## Hybrid Connection Email Model

This app should preserve network effects by allowing connection requests to imported profiles that have not yet claimed an account.

The correct model is not "always send a full introduction email to both sides immediately."

Instead, use two different delivery behaviors.

### Mode A: Recipient profile is claimed and contact-enabled

Conditions:

- profile is claimed
- profile has `is_primary_contact=true`
- primary contact email has `is_contact_enabled=true`

Behavior:

- system may send the normal two-sided introduction email
- send to requester contact email and recipient primary contact email

### Mode B: Recipient profile is imported or unclaimed

Conditions:

- profile is `unclaimed`, or
- profile has only imported legacy email, or
- profile has not enabled contact

Behavior:

- send a one-sided connection invitation to the imported email on file
- do not immediately expose the requester's personal email as a full mutual intro
- email should say someone from the alumni portal wants to connect
- include CTA to:
  - claim profile
  - accept request
  - update preferred contact email

If recipient accepts:

- then send the actual two-sided introduction

If recipient ignores:

- keep request pending or expire it after configured window

## Email Sending Rules

### Do send to imported institute email when:

- recipient profile is unclaimed
- recipient has no verified contact email set
- email content is a connection invitation or claim prompt

### Do not use imported institute email for:

- default two-way introduction emails
- permanent primary contact without recipient confirmation
- login identity assumptions

### Do send direct intro emails when:

- recipient has claimed profile
- recipient chose a contact email
- recipient enabled contact

### Sender disclosure rule

For unclaimed recipients:

- do not reveal full requester contact details until recipient accepts or claims

This reduces privacy risk and stale-address misdelivery risk.

## Recommended Connection Request Lifecycle

1. Member A clicks `Connect` on Member B.
2. System checks Member B profile state.
3. If Member B is claimed and contact-enabled:
   - send direct intro email to both sides
   - set `delivery_mode=direct_intro`
4. If Member B is unclaimed or legacy-only:
   - send one-sided invite to imported email
   - set `delivery_mode=legacy_invite`
5. If Member B accepts or claims profile:
   - ask Member B to confirm preferred contact email
   - convert request to accepted
   - send two-way introduction
6. If Member B declines:
   - mark request declined
7. If no response after configured period:
   - expire request

## Conflict Prevention Rules

1. Never use email as the sole key for alumni identity.
2. Never overwrite imported profile email with login email automatically.
3. Never auto-create duplicate alumni profiles when match is uncertain.
4. Never allow two active users to claim the same profile without admin dispute handling.
5. Never use stale imported email as a verified contact preference unless recipient confirms it.

## Suggested UI Copy

### Signup

`Use your current email to sign in. If you already appear in our alumni directory, you will claim your profile after signup.`

### Claim flow

`Your login email does not need to match the historical email we may have on file from your time at the institute.`

### Contact preference

`Choose which email other members should use to connect with you.`

### Legacy invitation email

`Someone from the alumni portal wants to connect with you. Claim your profile or confirm your preferred contact email to continue.`

## Acceptance Criteria

1. A user can sign up with a new current email and still claim an imported alumni profile.
2. Imported profiles remain connectable at launch even if not yet claimed.
3. Direct two-way intro emails are only sent to recipients who have claimed and enabled contact, or who explicitly accept a connection request.
4. Imported institute email can receive a connection invitation without being treated as verified current contact.
5. Duplicate profile creation is prevented for low-confidence claim matches.
6. One alumni profile cannot be silently linked to multiple active user accounts.
7. A profile can store multiple emails without creating auth conflicts.

## Implementation Notes

- Prefer using account ID and profile ID as the authoritative relationships.
- Treat emails as attributes with specific roles, not as universal identity keys.
- Add audit logs for claim approval, dispute handling, contact email changes, and connection-request delivery.
- Rate-limit connection requests to imported profiles to reduce spam and abuse risk.
- Include unsubscribe handling on all connection-related emails sent to imported legacy addresses.
