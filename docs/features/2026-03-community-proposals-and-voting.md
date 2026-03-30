# Community Proposals and Voting

## Summary

Add a community proposal system where premium members can submit ideas or activities for the ABG community, premium members can upvote and comment on those ideas, and admins can rank, pin, and manage proposals based on community support. All logged-in approved members can browse proposals and see vote totals, but only premium members can participate by submitting, voting, and commenting.

## Problem

- Members currently have no structured way to propose community activities or ideas inside the platform.
- Admins do not have a clear, ranked signal showing which community ideas have the strongest support.
- Good ideas can get lost in ad hoc chat threads or private messages instead of being visible to the broader community.

## Goal

- Give the community a visible place to propose ideas and activities.
- Use premium participation as the gate for submitting, voting, and commenting.
- Help admins identify which ideas have the highest support and should move into implementation.

## Scope

- New proposal creation flow for premium members
- Proposal list page for all logged-in approved members
- Proposal detail page with vote count and comments
- Anonymous upvote system with one vote per user per proposal
- Unvote flow for premium members
- Named comments for premium members
- Admin proposal management with ranking, status management, pinning, and moderation
- Database tables, constraints, and API routes required to support the feature

## Non-Goals

- No downvotes in v1
- No public access for logged-out users in v1
- No admin pre-approval workflow before publication
- No multi-option polls inside one proposal
- No attachment uploads in v1
- No notification system for proposal activity in v1 unless added in a later phase

## Target Users

- Premium members who want to propose ideas, vote, and comment
- Logged-in approved members who want to browse community-supported ideas
- Admins who need to rank and operationalize the strongest proposals

## UX / User Flow

1. A premium member creates a new community proposal.
2. The proposal is published immediately without waiting for admin approval.
3. All logged-in approved members can browse the proposal list and open proposal detail pages.
4. Premium members can upvote a proposal once and can later remove that vote.
5. Premium members can post named comments under proposals.
6. Once a proposal receives its first vote, the author can no longer edit it.
7. Admins can sort proposals by votes, pin important proposals, and update proposal status.
8. Admins can mark high-support proposals as selected and later move them through implementation statuses.

## Functional Requirements

- Only members with `approval_status = approved` and active accounts can view proposals.
- Only premium members can create proposals.
- Only premium members can vote on proposals.
- Only premium members can comment on proposals.
- Voting is upvote-only.
- Each premium member can have at most one active vote per proposal.
- A premium member can remove their vote from a proposal.
- Members can see total vote counts but cannot see the identities of voters.
- Comments are named, not anonymous.
- Comment authors can edit and delete their own comments.
- Proposal authors can edit their proposal only until the first vote is cast.
- Proposal authors can archive their own proposal only when it has zero votes.
- Admins can pin proposals regardless of vote count.
- Admins can change proposal status and moderate proposals/comments after publication.
- Voting must be locked once a proposal reaches `selected`, `in_progress`, or `completed`.

## Acceptance Criteria

- [ ] A premium, approved, active member can create a proposal and it becomes visible immediately.
- [ ] A basic member cannot create a proposal.
- [ ] An approved logged-in member can browse published proposals and see vote totals.
- [ ] A premium member can upvote a proposal once.
- [ ] A premium member can remove their vote.
- [ ] The same member cannot create multiple active votes on the same proposal.
- [ ] Voter identities are not visible in the member UI.
- [ ] A premium member can post a named comment on a proposal.
- [ ] A comment author can edit their own comment.
- [ ] A comment author can delete their own comment.
- [ ] A proposal author can edit the proposal only when it has zero votes.
- [ ] Once a proposal has one or more votes, author-side editing is blocked.
- [ ] A proposal author can archive their own proposal only before the first vote.
- [ ] Admins can sort proposals by vote count.
- [ ] Admins can pin a proposal.
- [ ] Admins can change proposal status to support operational follow-up.
- [ ] Admins can hide or remove abusive proposals and comments.
- [ ] Member-facing default proposal list sorting is by highest vote count.
- [ ] Voting is blocked when a proposal is `selected`, `in_progress`, or `completed`.

## Edge Cases

- A premium member is downgraded after creating a proposal:
  Existing proposal remains visible, but the member can no longer create new proposals, vote, or comment unless premium is restored.

- A premium member is downgraded after voting:
  Existing vote remains unless product decides otherwise; for v1, keep the historical vote and block future voting actions while not premium.

- A member tries to vote twice on the same proposal:
  API rejects the second vote because of a unique `(proposal_id, member_id)` constraint.

- A proposal receives its first vote while the author is editing:
  Save should fail if the proposal already has one or more votes at update time.

- A proposal author tries to archive after votes already exist:
  Archive action should be rejected for author-side actions; admin can still archive through moderation/status controls.

- An admin pins a lower-vote proposal:
  Pinned state takes precedence in the UI over raw vote ordering where applicable.

- A comment author edits or deletes a comment after replies are added:
  There are no reply threads in v1, so author edit/delete only applies to the single comment row.

- A proposal or comment becomes abusive after publication:
  Admin can set status to removed/hidden without deleting historical rows.

## Data / Backend Impact

### New tables

`community_proposals`

- `id`
- `created_by_member_id`
- `title`
- `summary`
- `description`
- `category`
- `status`
- `is_pinned`
- `vote_count`
- `comment_count`
- `created_at`
- `updated_at`
- `published_at`
- `selected_at`
- `selected_by_member_id`
- `admin_note`

`community_proposal_votes`

- `id`
- `proposal_id`
- `member_id`
- `created_at`

`community_proposal_comments`

- `id`
- `proposal_id`
- `member_id`
- `body`
- `status`
- `created_at`
- `updated_at`
- `deleted_at`

### Recommended enum-style fields

Proposal categories:

- `charity`
- `event`
- `community_support`
- `learning`
- `other`

Proposal statuses:

- `published`
- `selected`
- `in_progress`
- `completed`
- `archived`
- `removed`

Comment statuses:

- `visible`
- `hidden`
- `removed`

### Constraints and indexing

- Unique constraint on `community_proposal_votes (proposal_id, member_id)`
- Foreign keys from proposals, votes, and comments back to `members`
- Index proposals by `status`, `category`, `vote_count`, `created_at`, and `is_pinned`
- Index comments by `proposal_id` and `status`

### Backend rules

- Enforce premium-only submit/vote/comment in API logic
- Enforce approved + active account state for viewing
- Block proposal edits when `vote_count > 0`
- Allow author archive only when `vote_count = 0`
- Allow comment authors to edit/delete only their own comments
- Block new votes and unvotes when proposal status is `selected`, `in_progress`, or `completed`
- Keep `vote_count` and `comment_count` denormalized on `community_proposals` for efficient ranking and listing
- Add admin-only update paths for status changes, moderation, and pinning
- Default member list sorting should be highest `vote_count` first

### Suggested routes

- `GET /api/community/proposals`
- `POST /api/community/proposals`
- `GET /api/community/proposals/[id]`
- `PATCH /api/community/proposals/[id]`
- `POST /api/community/proposals/[id]/vote`
- `DELETE /api/community/proposals/[id]/vote`
- `GET /api/community/proposals/[id]/comments`
- `POST /api/community/proposals/[id]/comments`
- `PATCH /api/community/proposals/comments/[comment_id]`
- `DELETE /api/community/proposals/comments/[comment_id]`
- Admin routes for proposal status, pinning, and moderation

## Analytics

Recommended events:

- `community_proposal_created`
- `community_proposal_voted`
- `community_proposal_unvoted`
- `community_proposal_comment_added`
- `community_proposal_selected`
- `community_proposal_pinned`
- `community_proposal_removed`

Recommended properties:

- `proposal_id`
- `category`
- `status`
- `vote_count`
- `is_pinned`
- `member_tier`

## Rollout Notes

- This should launch behind admin awareness because live publication is immediate and requires moderation tools on day one.
- Admin views should be built in the same delivery phase as member-facing creation and voting.
- Existing premium gating logic can likely be reused, but proposal-specific permissions still need explicit API enforcement.

## Dependencies

- New Supabase migration(s) for proposals, votes, and comments
- Updates to `types/`
- Updates to `lib/supabase-db.ts`
- New member-facing pages/components
- New admin UI surfaces or admin tab additions
- Analytics event wiring if PostHog tracking is required from day one

## Open Questions

- Should pinned proposals always render before higher-vote unpinned proposals, or should pinning only apply to a dedicated highlighted section?
- Should archived proposals remain visible in member-facing history views, or be hidden from the default list?
- Should comments use hard delete or soft delete in v1 from the author perspective?
- Should admins be able to unlock voting on a selected proposal if status changes back to `published`?

## Links

- Issue:
- Design:
- PRD:
- Related docs:
