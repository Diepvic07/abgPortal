# TODOS

## Community Proposals — Deferred from v1

### Proposal Milestones/Updates
- **What:** Taskforce lead can post progress updates on in_progress proposals. Committed members get notified.
- **Why:** Closes the propose-commit-execute accountability loop. Without it, proposals go dark between "in_progress" and "completed."
- **Effort:** M (human ~3 days / CC ~20 min)
- **Priority:** P2
- **Depends on:** v1 proposals + notification system

### Proposal Merge Feature
- **What:** Admin can merge duplicate/similar proposals. Commitments transfer (keep higher level for dual-committed members). Merged proposal gets terminal status with reference.
- **Why:** Prevents community attention fragmentation when similar ideas are proposed separately.
- **Effort:** M (human ~3 days / CC ~20 min)
- **Priority:** P3
- **Depends on:** v1 proposals

### Actual Participation Tracking
- **What:** After proposal reaches "completed", admin rates each member's actual participation (1-10) vs committed level.
- **Why:** Creates accountability data. Identifies reliable contributors over time.
- **Effort:** S (human ~1 day / CC ~10 min)
- **Priority:** P3
- **Depends on:** v1 proposals + completed proposals existing

## Push Notifications — Deferred from Phase 2

### @Mention Notifications with Autocomplete
- **What:** Add @mention notifications in event/proposal comments. Requires autocomplete dropdown in comment textarea that inserts member IDs (not fuzzy name matching) for accurate resolution.
- **Why:** Fuzzy name-based matching has false positives with common Vietnamese names. ID-based resolution via autocomplete is the correct approach.
- **Effort:** M (human ~3 days / CC ~20 min)
- **Priority:** P2
- **Depends on:** Push notification infrastructure (shipped), comment UI component

### Unified Notification Preferences (Email + Push)
- **What:** Single settings page where members control both email and push toggles per notification type. Currently email and push have independent preference systems.
- **Why:** When email digest lands, members need one place to manage all notification channels to avoid fragmented UX.
- **Effort:** S (human ~1 day / CC ~15 min)
- **Priority:** P3
- **Depends on:** Push notification infrastructure (shipped) + email digest feature

## Member Scoring & Leaderboard — Deferred from v1

### Comment Scoring Rate Limiting
- **What:** Add a daily per-member cap (e.g., max 10 scored comments/day) to prevent gaming via high-volume low-effort 40-character comments.
- **Why:** The v1 duplicate rule only catches exact matches. A motivated member could post 20 unique low-effort comments/day for +100 points. High-trust community mitigates risk at current scale, but a cap is the correct long-term fix.
- **Effort:** S (human ~30 min / CC ~3 min)
- **Priority:** P3
- **Depends on:** v1 scoring system

### Migrate Old Leaderboard Consumers
- **What:** Switch existing UI consumers of `getLeaderboard()` and `getMemberContributions()` (proposals sidebar, member profiles) to use the new `member_score_periods`-based scoring system.
- **Why:** The old functions only reflect commitment weights, not the full scoring model. They're deprecated but still used by existing UI.
- **Effort:** S (human ~1 day / CC ~10 min)
- **Priority:** P2
- **Depends on:** v1 scoring system + backfill complete

### Score Breakdown on Member Profile
- **What:** Show individual score breakdown on member profile page: what earned them points, recent score events, category split.
- **Why:** Members will naturally ask "why do I have this score?" The `score_events` ledger already supports this query. The leaderboard shows totals; profiles should show the explanation.
- **Effort:** M (human ~2 days / CC ~15 min)
- **Priority:** P2
- **Depends on:** v1 scoring system

## Design System

### Create DESIGN.md (Design System)
- **What:** Run /design-consultation to formalize the design system: colors, typography, spacing scale, component patterns, category color palette.
- **Why:** The proposals UI established a de facto design system (blue CTAs, category pill colors, gray typography). As the platform grows (events, notifications, discussions), having a single source of truth prevents drift and inconsistency.
- **Effort:** S (human ~2 hours / CC ~15 min via /design-consultation)
- **Priority:** P3
- **Depends on:** Nothing. Can run anytime.
