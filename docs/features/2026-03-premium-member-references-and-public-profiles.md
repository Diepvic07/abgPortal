# Premium Member References and Public Profiles

## Summary

Add a premium-only reference system where premium members can write one immutable reference for another premium member, and each eligible recipient has a stable public profile URL that displays a minimal professional profile plus recipient-selected references. The public page must hide private member fields, remain crawlable by search engines, and become inaccessible when the recipient is no longer premium.

## Problem

- The product currently has no structured way for members to endorse or describe other members' credibility, contribution, or working relationship.
- Premium members do not have a public reputation page they can share outside the logged-in alumni portal.
- The existing profile contains many private networking and contact fields that are not suitable for public exposure.

## Goal

- Let premium members write references for other premium members.
- Turn a premium member's references into a stable public-facing professional profile URL.
- Expose only a limited set of public-safe profile fields while keeping personal and networking-specific data private.
- Preserve recipient control over which submitted references appear publicly without allowing post-submission rewriting by authors.

## Scope

- Premium-only reference submission flow
- Premium-only eligibility for receiving references
- One public profile URL per eligible recipient
- Recipient-side control over which references are publicly visible
- Public reference profile page with limited public fields
- Premium expiry behavior that disables public access
- Admin moderation for submitted references
- Database tables, constraints, API routes, and page flows needed for the feature

## Non-Goals

- No star ratings or numeric scoring in v1
- No author-side edit or delete after submission
- No recipient-side editing of reference content
- No structured relationship taxonomy in v1 beyond freeform context text
- No attachment uploads in v1
- No private reference mode in v1
- No reply threads or discussion under references in v1

## Target Users

- Premium members who want to write references for other members
- Premium members who want a public profile page built from references
- External viewers who visit the public profile URL
- Admins who need moderation control over abusive or inappropriate references

## UX / User Flow

1. A premium, approved, active member visits another eligible premium member's profile.
2. The writer submits one reference for that recipient, including freeform context for how they know the person.
3. Once submitted, the reference is immutable to the author.
4. The recipient sees submitted references in an internal management view.
5. The recipient chooses which submitted references are shown publicly.
6. The recipient's public profile URL exists as a single stable page.
7. The public page automatically exists even if zero references are currently visible and should show a sparse profile with a "No public references yet" empty state.
8. External viewers can access the public page while the recipient remains premium.
9. If the recipient is no longer premium, the public URL becomes inaccessible.
10. Admins can moderate, hide, or remove references if needed.

## Functional Requirements

- Only premium, approved, active members can write references.
- Only premium, approved, active members can receive references.
- A writer can submit at most one reference per recipient.
- Reference authors cannot edit or delete a reference after submission.
- Recipients cannot delete reference records.
- Recipients can choose which references are publicly visible on their public page.
- The public page exists automatically for an eligible recipient and uses one stable URL per recipient.
- Public reference profile pages are intended to be crawlable and indexable by search engines.
- Do not apply `noindex` to public reference profile pages.
- Public URL access must be disabled when the recipient is no longer premium.
- Public page ordering for visible references is automatic in v1: newest visible references first.
- Admins can moderate references and remove or hide abusive content.
- Relationship context is freeform text entered by the writer.

## Public Profile Visibility Rules

Public page must show only:

- `name`
- `abg_class`
- current `role`
- current `company`
- visible references

Public page must not show:

- `email`
- `phone`
- `facebook_url`
- `linkedin_url`
- `company_website`
- `country`
- `can_help_with`
- `looking_for`
- `job_preferences`
- `hiring_preferences`
- dating-related fields
- account/admin/payment metadata

## Acceptance Criteria

- [ ] A premium, approved, active member can submit one reference for another premium, approved, active member.
- [ ] A basic member cannot submit a reference.
- [ ] A reference writer cannot submit a second reference for the same recipient.
- [ ] After submission, the writer cannot edit or delete the reference.
- [ ] A recipient can mark a submitted reference as publicly visible or hidden.
- [ ] A recipient cannot delete the underlying reference record.
- [ ] A recipient has a single stable public profile URL.
- [ ] The public profile page is accessible while the recipient remains premium.
- [ ] The public profile page becomes inaccessible when the recipient is no longer premium.
- [ ] The public page remains indexable and does not apply `noindex`.
- [ ] The public page shows only approved public fields and visible references.
- [ ] The public page hides contact, networking, and private profile data.
- [ ] If no references are visible, the public page still exists and shows a sparse profile with "No public references yet".
- [ ] Visible references are ordered newest first.
- [ ] Admins can hide or remove a reference from public/member-facing visibility.

## Edge Cases

- A writer is premium when submitting but later loses premium:
  Their existing submitted reference remains stored, but they cannot create new references unless premium is restored.

- A recipient loses premium after accumulating public references:
  The public page must become inaccessible even though underlying references remain stored internally.

- A recipient has submitted references but sets all of them to hidden:
  The public page still exists and shows the sparse-profile empty state.

- A writer tries to submit another reference for the same recipient:
  API rejects the action because of a unique writer-recipient constraint.

- A writer submits abusive or false content:
  Admin can hide or remove the reference through moderation tools.

- A recipient wants a reference off the public page but not deleted:
  Recipient can hide it from public display without deleting the stored record.

- A recipient changes role or company after public page creation:
  Public page should reflect the current member profile values, not a copied snapshot, unless product later chooses snapshot behavior.

## Data / Backend Impact

### New tables

`member_references`

- `id`
- `writer_member_id`
- `recipient_member_id`
- `body`
- `relationship_context`
- `status`
- `is_publicly_visible`
- `created_at`
- `updated_at`
- `moderated_at`
- `moderated_by_member_id`
- `moderation_note`

### Recommended recipient public profile fields

This can be implemented either as fields on `members` or a dedicated profile table:

- `public_profile_slug`
- `public_profile_enabled`

`public_profile_enabled` should reflect actual accessibility rules and must be false when the recipient is not premium.

### Recommended enum-style fields

Reference statuses:

- `submitted`
- `visible`
- `hidden_by_recipient`
- `removed_by_admin`

### Constraints and indexing

- Unique constraint on `member_references (writer_member_id, recipient_member_id)`
- Foreign keys from `writer_member_id` and `recipient_member_id` back to `members`
- Unique constraint on public profile slug
- Index references by `recipient_member_id`, `status`, `is_publicly_visible`, and `created_at`

### Backend rules

- Enforce premium + approved + active gating for writing references
- Enforce premium + approved + active gating for receiving public profiles
- Block author edit/delete after reference creation
- Allow recipient visibility toggling only, not content editing
- Public page access must check premium status at request time
- Public page should source current role/company/class from the current member profile
- Visible reference ordering should default to newest first
- Admin-only moderation paths should support hide/remove behavior

### Suggested routes

- `POST /api/references`
- `GET /api/references/received`
- `PATCH /api/references/[id]/visibility`
- Admin moderation routes for references
- Public profile route such as `/u/[slug]` or `/references/[slug]`

## Analytics

Recommended events:

- `member_reference_submitted`
- `member_reference_visibility_changed`
- `public_reference_profile_viewed`
- `member_reference_removed_by_admin`

Recommended properties:

- `recipient_member_id`
- `writer_member_id`
- `recipient_tier`
- `is_publicly_visible`
- `public_profile_slug`

## Rollout Notes

- This feature has reputation and privacy implications and should launch with moderation tools available on day one.
- Public pages should be tested carefully against hidden-field requirements before release.
- Search-engine indexing should be deliberate and validated in production behavior.
- Premium-expiry handling should be enforced server-side, not only in UI visibility.

## Dependencies

- New Supabase migration(s) for references and public profile metadata
- Updates to `types/`
- Updates to `lib/supabase-db.ts`
- New internal reference management UI for recipients
- New public profile page
- Admin moderation UI or admin API support
- Analytics instrumentation if tracking is required from launch

## Open Questions

- Should the recipient be allowed to customize any public-page intro text, or should the page be purely data-driven in v1?
- Should removed-by-admin references remain visible to the recipient in their internal management view, or disappear entirely from recipient-facing UI?
- Should public profile slugs be generated from name plus ID suffix, or use a different stable slug strategy?
- Should admins be able to disable a public page manually even while the recipient is still premium?

## Links

- Issue:
- Design:
- PRD:
- Related docs:
