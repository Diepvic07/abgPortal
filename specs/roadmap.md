# Roadmap

The development of ABG Alumni Connect is divided into small phases that preserve the current working product while moving toward a stronger single digital home for ABG alumni activity.

## Phase 1: Project Foundation
- [x] Establish the Next.js App Router application with TypeScript, Tailwind CSS, shared components, and route handlers.
- [x] Configure Supabase Postgres migrations for members, requests, connections, news, proposals, events, references, notifications, scoring, payments, and finance.
- [x] Configure NextAuth with Google OAuth and Resend magic links.
- [x] Configure Vercel deployment, host redirect, API function duration, PostHog proxy rewrites, and reminder cron routes.
- [x] Add Vitest and Playwright test infrastructure with E2E page objects and external-service mocks.
- [x] Add project-level constitution files under `specs/`.

## Phase 2: Core Member Platform
- [x] Support email-first signup, login, onboarding, admin approval, rejected/suspended states, and member profile editing.
- [x] Support member search, directory access, profile visibility rules, contact requests, request history, and AI-assisted matching.
- [x] Support privacy-preserving love matching with anonymous request, accept/refuse/ignore, and reveal-on-accept flows.
- [x] Support admin member operations including approval, duplicate review, class management, tier updates, and member merge handling.
- [ ] Reconcile implementation and documentation around the Premium plan so README, admin docs, UI, API behavior, and tests all reflect the canonical Free/Pro model.
- [ ] Confirm active-member metrics and add an agreed reporting surface for current active users.

## Phase 3: Community Activity Hub
- [x] Support community proposals with commitments, comments, tags, discussions, polls, recaps, images, location, agenda, and admin management.
- [x] Support events with public/member views, RSVP registration, guest RSVP, fees, payment tracking, comments, recaps, organizer assignment, attendance verification, and proposal-to-event conversion.
- [x] Support public news and bilingual news management with comments, reactions, tagging, and share buttons.
- [ ] Add proposal milestones or progress updates for in-progress proposals so committed members can track execution.
- [ ] Add admin proposal merge handling to reduce duplicate community ideas and preserve commitments.
- [ ] Evaluate whether authenticated `/events` should remain the default member home and whether `/community` should be retained, redirected, or repurposed.

## Phase 4: Reputation and Member Value
- [x] Support member references, public profile slugs, public profile visibility controls, and admin reference moderation.
- [x] Support scoring tables, score events, period aggregates, and member-facing leaderboard access.
- [ ] Migrate remaining old leaderboard and contribution consumers to the `member_score_periods` scoring system.
- [ ] Add member profile score breakdowns so members can understand which events, proposals, references, connections, and comments earned points.
- [ ] Add comment scoring rate limits or quality safeguards before scoring becomes a strong member incentive.
- [ ] Define how Free and Pro membership status should affect public profiles, references, search, and reputation surfaces under the canonical Premium plan.

## Phase 5: Notifications and Engagement
- [x] Support push subscriptions, in-app notifications, notification preferences, notification bell, proposal discussion reminders, and duplicate reminders.
- [ ] Add unified notification preferences for email and push channels.
- [ ] Add email digest or AI-personalized event/proposal/news recommendations for members who do not rely on browser notifications. Spec: [Weekly Activity Email](2026-06-14-weekly-activity-email/requirements.md).
- [ ] Add reliable `@mention` autocomplete and member-ID based mention notifications for event and proposal comments.
- [ ] Add active-member retention reporting around event RSVPs, proposal commitments, comments, searches, and introductions.

## Phase 6: Operations, Payments, and Quality
- [x] Support admin payment records, event payments, finance transactions, and finance dashboard foundations.
- [ ] Align billing and payment flows with the Premium plan document, including bank-transfer proof, expected amount validation, admin approval/rejection, and Pro entitlement expiry.
- [ ] Decide whether future payment automation should integrate a payment gateway or continue with admin-reviewed bank transfer.
- [ ] Create a formal design system document covering colors, typography, spacing, category colors, component patterns, and bilingual UI conventions.
- [ ] Refresh stale docs that still describe legacy Google Sheets architecture, old tier limits, or outdated framework versions.
- [ ] Expand regression coverage for the canonical Free/Pro model, events, proposals, notifications, scoring, and admin payment workflows.
