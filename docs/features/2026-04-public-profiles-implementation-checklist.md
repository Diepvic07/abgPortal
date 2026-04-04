# Public Profiles Implementation Checklist

## Summary

This checklist translates the premium references and public-profile spec into concrete implementation work for the current codebase.

## Backend and Data

- [ ] Add `member_references` table
- [ ] Add `public_profile_slug` to `members`
- [ ] Add `public_profile_enabled` to `members`
- [ ] Backfill stable slugs using `name-idSuffix`
- [ ] Add unique constraint for `writer_member_id + recipient_member_id`
- [ ] Add unique constraint for `public_profile_slug`
- [ ] Add indexes for recipient lookup, public visibility, and slug lookup

## Business Rules

- [ ] Only premium, approved, active members can write references
- [ ] Only premium, approved, active members can receive public profiles
- [ ] Writers can submit at most one reference per recipient
- [ ] Writers cannot edit or delete after submission
- [ ] Recipients can show/hide references publicly
- [ ] Admin-removed references disappear from recipient management view
- [ ] Public profile is inaccessible when recipient is no longer premium

## API Surface

- [ ] `POST /api/references`
- [ ] `GET /api/references/received`
- [ ] `PATCH /api/references/[id]/visibility`
- [ ] `GET /api/admin/references`
- [ ] `PATCH /api/admin/references/[id]`

## Member-Facing UI

- [ ] Add reference submission flow on another member's profile
- [ ] Show duplicate-submission state when writer already submitted one
- [ ] Add reference management section on own profile
- [ ] Show stable public profile URL on own profile
- [ ] Add public-profile empty state when no references are visible

## Public Profile UI

- [ ] Add public route at `/u/[slug]`
- [ ] Show only name, ABG class, role, company, and visible references
- [ ] Do not show contact, networking, or private profile fields
- [ ] Keep page crawlable and indexable

## Admin

- [ ] Add moderation list for references
- [ ] Support remove/restore with moderation note

## Verification

- [ ] Premium gating works for writers and recipients
- [ ] Duplicate reference creation is blocked
- [ ] Recipient visibility toggle works
- [ ] Public page returns 404 or equivalent inaccessible state when recipient loses premium
- [ ] Public page never leaks private fields
