# Product Requirements Document (PRD)
**Project Name:** ABG Alumni Connect
**Last Updated:** 2026-03-03
**Status:** Active MVP

## 1. Product Overview
ABG Alumni Connect is an AI-powered networking and matching platform designed exclusively for the ABG Alumni community (approximately 300 users). The platform facilitates high-quality, low-friction peer connections to help members leverage their shared social capital effectively, justifying a paid membership model.

### 1.1 Target Audience
- **Target Users:** ABG Alumni members (active professionals).
- **Primary Need:** Finding and connecting with the right person in the network for specific expertise, advice, or collaboration without the noise of traditional social media groups (e.g., Facebook, Zalo).

### 1.2 Core Value Proposition
Smart, low-effort peer connections powered by AI, augmented with an automated introduction workflow, ensuring members get exactly the help they need.

---

## 2. Platform Architecture & Tech Stack
- **Frontend/Backend:** Next.js 14 (App Router), deployed on Vercel
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Google Sheets API (used as a lightweight CMS/DB)
- **AI Integration:** Google Gemini 1.5 Flash (for matching logic and profile generation)
- **Emails:** Resend API
- **Notifications:** Discord Webhooks
- **Storage:** Vercel Blob (for avatars/images)

---

## 3. Core Features

### 3.1 Authentication & Onboarding
- **Email-First Landing Flow:** Users enter their email on the landing page before authenticating. The system routes them contextually (Signin vs. Signup) based on their existence in the database.
- **Dual Authentication:** Support for Google OAuth (single-click) and Magic Link via Email (passwordless).
- **AI Profile Generation:** During onboarding, users input their details (role, expertise, what they need/offer) and Gemini AI automatically generates a professional, third-person bio.

### 3.2 Member Approval & Access Workflow
- **Application Queue:** All new signups default to a `pending` state and cannot access the platform.
- **Admin Review:** Administrators review pending members and can set their status to `approved`, `rejected` (permanently blocked), or `suspended`.
- **Pre-Approved Imports:** Admins can bulk import members via CSV, bypassing the approval queue (`is_csv_imported = TRUE`).

### 3.3 Two-Tier Membership System
To balance free access with sustainable operations, the platform enforces a two-tier system:

**Basic Tier (Free)**
- **Limit:** 3 lifetime connection searches/requests.
- **Profile Visibility:** Limited view of other members. Phone numbers and LinkedIn URLs are hidden.
- **Match Results:** Teaser format. Names, roles, and companies of matches are blurred (e.g., `Jo** Sm***`), but the "Reason for Match" is fully visible to encourage upgrades.

**Pro Tier (Paid - 500,000 VND / year)**
- **Cost Analysis & Proposed Limit:** With Gemini API costs and an affordable 500k/year membership, unlimited matching is unsustainable. 
  - *Proposed Limit:* **100 connection requests per month** (approximately 3 per day, or ~1200/year). This prevents abuse via API farming while offering more than enough connections for genuine networking. A daily soft-cap of **20 per day** can also be used to mitigate sudden bot bursts.
- **Profile Visibility:** Full access to all member details (phone, LinkedIn).
- **Match Results:** Full visibility of matched members.
- **Visuals:** Premium/Pro badge displayed on profile and dashboard.

### 3.4 AI-Powered Connection Matching
- **Request Categories:** Members can select from 4 distinct types of searches based on their primary intent:
  - **Love Matching (Dating):** Find a romantic partner within the verified alumni network.
  - **Job Hunting:** Discover open roles or connect with mentors/recruiters.
  - **Recruitment (Hiring):** Find talent for available job positions.
  - **Partner Matching (Professional):** Connect for business partnerships or networking.
- **Request Flow:** A member selects a request category and submits a request detailing what they are looking for (text input).
- **Intelligent Matching (Top 5):** The Gemini API analyzes the request against the database of approved members and returns the top **5 most relevant matches**, each with a calculated **Match Score** and a reasoned explanation for *why* they are a good fit.
- **Refresh / Reroll:** Users can click a "Run Again/Redraw" button if they aren't satisfied with the matches. Since LLM models incorporate temperature/randomness, running it again may yield different matches or newly discovered angles. (Each run counts against their request quota).
- **Selection & Introduction:** The requester selects their preferred match. The system automatically sends a professionally formatted email via Resend introducing both parties.
- **Public Search Preview:** Unauthenticated users can perform a search on the landing page, receiving 3 blurred matches to demonstrate the platform's value and encourage signups.

### 3.5 Administrator Operations
- **Admin Dashboard (`/admin`):**
  - **Approval Management:** View, approve, or reject new applicants.
  - **Member Management:** View all members, filter by status, and monitor key metrics.
  - **Tier Management:** Manually upgrade or downgrade approved members between Basic and Premium tiers.
- **Notifications:** Admins receive real-time alerts via a Discord Webhook when new members onboard, new matches are requested, and when connections are accepted.

---

## 4. User Journeys

### 4.1 New User Onboarding
1. User arrives at landing page and enters email in the "Join Community" section.
2. System checks email; routes to `/signup`.
3. User completes form (name, role, what they offer/seek).
4. Gemini generates a bio; profile is saved as `pending`.
5. Admin is notified via Discord and approves the user via `/admin`.
6. User can now log in via Google or Magic Link and access the platform.

### 4.2 Connection Request (Pro User)
1. User navigates to `/request`, selects a matching category (e.g., Love Matching or Job Hunting), and describes a need.
2. System verifies tier limits (`requests_this_month < 100`).
3. Gemini returns top 5 unblurred matches with match scores and explanations.
4. User may click "Run Again" to get a fresh set of 5 matches.
5. User selects a match.
6. System sends an automated email introducing both members.
7. Connection is logged in the system.

### 4.3 Appreciating the Paywall (Basic User)
1. User navigates to `/request`, selects a matching category, and describes a need.
2. System verifies they haven't used their 3 free lifetime searches.
3. Gemini returns top 5 matches, but personal details (name, role, company) are blurred.
4. User sees the matching reason and match score, realizing the value of the platform.
5. User clicks "Upgrade to Pro" CTA to access the unblurred profiles and connect.

---

## 5. Security & Rate Limiting
- **Authentication:** Sessions managed via NextAuth JWT (30-day expiry).
- **Rate Limiting:** 
  - Email checking API capped at 10 requests/minute per IP.
  - Public search API capped at 5 requests/minute per IP.
- **Authorization:** Enforcement checks run on API routes (e.g., verifying `approval_status == 'approved'` and `account_status == 'active'` before allowing a request).
- **Secrets:** Google Service Account keys and API keys are stored securely in environment variables.

---

## 6. Future Extensibility (Roadmap)
- **Automated Tier Upgrades:** Integration with a payment gateway (e.g., Stripe) to automatically switch members to Premium upon payment.
- **Advanced Filtering:** Location, industry, and exact skill tags in the matching algorithm.
- **Connection Feedback:** A reputation or rating system post-introduction to improve match quality.
- **Membership Expiry:** Implementation of a strict expiration date on Premium subscriptions with an automated grace period.
