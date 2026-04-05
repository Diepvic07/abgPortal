# Bug Report - ABG Alumni Connect

**Report Date:** 2026-04-04
**Fix Date:** 2026-04-04
**Total Reports:** 22 open reports from 8 users
**Fixed:** 17 | **Deferred:** 3 | **Already Done:** 2

---

## Fixed Bugs

### BUG-001: Event categories too generic

| Field | Detail |
|-------|--------|
| **ID** | `3f352ff2` |
| **Reported** | 2026-04-04 by diu.tran@abg.edu.vn |
| **Page** | /admin (Event Manager) |
| **Description** | Event categories should be split into specific types: ABG Talks, Fieldtrip, Networking, Learning, Webinar, Event, Community Support, ABG Business Connect, Other |
| **Root Cause** | Original `EventCategory` type only had 6 generic categories: `charity`, `event`, `learning`, `community_support`, `networking`, `other`. |
| **Fix** | Updated `EventCategory` type and labels in `types/index.ts`. Updated Zod validation schemas in all 3 event API routes. Updated `ALL_CATEGORIES` array in `admin-event-manager.tsx`. |
| **Files Changed** | `types/index.ts`, `components/admin/admin-event-manager.tsx`, `app/api/admin/community/events/route.ts`, `app/api/admin/community/events/[id]/route.ts`, `app/api/community/events/route.ts` |

**Test Cases:**
- [ ] Open Admin > Events > Create New Event
- [ ] Verify category dropdown shows all 9 options: ABG Talks, Fieldtrip, Networking, Learning, Webinar, Event, Community Support, ABG Business Connect, Other
- [ ] Create an event with each new category (e.g. "ABG Talks") and verify it saves and displays correctly
- [ ] Edit an existing event with old category (e.g. "charity") and verify it still loads without error
- [ ] Verify event detail page displays the correct category label

---

### BUG-002: Event description textarea too small

| Field | Detail |
|-------|--------|
| **ID** | `867c74b1` |
| **Reported** | 2026-04-04 by diu.tran@abg.edu.vn |
| **Page** | /admin (Event Manager) |
| **Description** | The description textarea in the event creation/edit form is too small to write and review content. |
| **Root Cause** | Textarea had `rows={4}` and the modal was constrained to `max-w-lg` (512px). |
| **Fix** | Increased textarea to `rows={8}`. Widened modal from `max-w-lg` to `max-w-2xl` (672px). |
| **Files Changed** | `components/admin/admin-event-manager.tsx` |

**Test Cases:**
- [ ] Open Admin > Events > Create New Event
- [ ] Verify the description textarea is visibly taller (~8 lines)
- [ ] Verify the entire form modal is wider and fields have more room
- [ ] Verify the textarea is resizable (drag handle at bottom-right)
- [ ] Paste a long description (500+ chars) and verify it's easy to read and edit

---

### BUG-003: Date labels should say "Registration Opens/Closes"

| Field | Detail |
|-------|--------|
| **ID** | `c06077c9` |
| **Reported** | 2026-04-04 by diu.tran@abg.edu.vn |
| **Page** | /events/:id (Event Detail) |
| **Description** | "Bắt đầu" (Starts) and "Kết thúc" (Ends) should be renamed to "Mở đăng ký" (Registration Opens) and "Hạn đăng ký" (Registration Closes). |
| **Root Cause** | Hardcoded labels in `event-detail.tsx` and i18n translation keys used generic "Start/End" wording. |
| **Fix** | Updated labels in `event-detail.tsx` (Vietnamese + English). Updated `formStartDate`/`formEndDate` translations in both `vi.ts` and `en.ts`. |
| **Files Changed** | `components/events/event-detail.tsx`, `lib/i18n/translations/vi.ts`, `lib/i18n/translations/en.ts` |

**Test Cases:**
- [ ] Open any published event detail page in Vietnamese
- [ ] Verify "At a Glance" section shows "Mở đăng ký" and "Hạn đăng ký" (not "Bắt đầu"/"Kết thúc")
- [ ] Switch to English and verify labels show "Registration Opens" / "Registration Closes"
- [ ] Open Admin > Events > Create/Edit Event and verify form labels match

---

### BUG-004: Add cancellation permission option for admin

| Field | Detail |
|-------|--------|
| **ID** | `00bd15f9` |
| **Reported** | 2026-04-04 by diu.tran@abg.edu.vn |
| **Page** | /events/:id + /admin |
| **Description** | Cancellation deadline should be an admin option — admin should be able to choose whether participants can cancel their registration or not. |
| **Root Cause** | No `allow_cancellation` field existed. Cancel RSVP button was always shown. Cancellation policy text was hardcoded. |
| **Fix** | Added `allow_cancellation` boolean to `CommunityEvent` interface. Added toggle checkbox in admin event form. Updated event detail page to conditionally show/hide cancel button and display appropriate policy text. Updated API schemas (create + update). |
| **Files Changed** | `types/index.ts`, `components/admin/admin-event-manager.tsx`, `components/events/event-detail.tsx`, `app/api/admin/community/events/route.ts`, `app/api/admin/community/events/[id]/route.ts`, `lib/i18n/translations/en.ts`, `lib/i18n/translations/vi.ts` |

**Test Cases:**
- [ ] Open Admin > Events > Create New Event
- [ ] Verify "Allow cancellation" checkbox is present and checked by default
- [ ] Create an event with cancellation **enabled** — verify users see "Cancel RSVP" button after registering
- [ ] Create an event with cancellation **disabled** — verify "Cancel RSVP" button is hidden
- [ ] Verify disabled-cancellation event shows message: "Sau khi đăng ký, bạn không thể tự hủy đăng ký..."
- [ ] Edit an existing event and toggle cancellation — verify change saves and reflects on detail page

---

### BUG-005: Users can't find profile / privacy settings

| Field | Detail |
|-------|--------|
| **IDs** | `5ea69378`, `9efc52ac`, `3e290240` |
| **Reported** | 2026-03-25 to 2026-03-31 by dxhien92@gmail.com, letructran.edu@gmail.com, vuthuyduong96@gmail.com |
| **Page** | /request |
| **Description** | Multiple users reported they cannot find how to update their profile, view their own profile, or find privacy settings. |
| **Root Cause** | Profile was only accessible through the avatar dropdown menu in the header. Users didn't realize they could click their avatar to access profile options. No visible "Profile" link in the main navigation. |
| **Fix** | Added a visible "Profile" link in both desktop and mobile navigation menus for authenticated users. |
| **Files Changed** | `components/layout/header-navigation.tsx` |

**Test Cases:**
- [ ] Log in and verify "Profile" link appears in the top navigation bar (desktop)
- [ ] Open mobile menu and verify "Profile" link appears
- [ ] Click "Profile" link — verify it navigates to /profile page
- [ ] On profile page, click "Edit" and verify privacy settings section is visible (checkboxes for nickname display)

---

### BUG-006: Can't add photo in profile edit

| Field | Detail |
|-------|--------|
| **IDs** | `19061754`, `69eb6196` |
| **Reported** | 2026-03-24 to 2026-03-25 by minhanhmiamia@gmail.com |
| **Page** | /profile?edit=true |
| **Description** | Users reported there is no visible option to add/change their profile photo in the edit form. |
| **Root Cause** | Avatar upload was only triggered by clicking on the avatar circle area, which was not obvious. The label was small gray text below the avatar. |
| **Fix** | Replaced the plain text label with a visible styled button ("Click to upload avatar") that explicitly triggers the file picker. |
| **Files Changed** | `components/profile/profile-edit-form-component.tsx` |

**Test Cases:**
- [ ] Go to /profile?edit=true
- [ ] Verify a visible button with "Bấm để up ảnh đại diện" text appears below the avatar
- [ ] Click the button — verify file picker opens
- [ ] Select an image — verify preview appears in the avatar circle
- [ ] Save the profile — verify avatar is uploaded and displays on profile view
- [ ] Also verify clicking the avatar circle itself still opens the file picker

---

### BUG-007: Pro user sees upgrade screen instead of profile

| Field | Detail |
|-------|--------|
| **ID** | `b257ecd8` |
| **Reported** | 2026-03-24 by mtthuong@gmail.com |
| **Page** | /onboard |
| **Description** | User has Pro badge visible under their name but when clicking "Profile" they see the upgrade/payment screen instead of their profile. |
| **Root Cause** | `/profile/page.tsx` redirects to `/onboard` if required fields (role, company, expertise) are missing — regardless of membership status. Then `/onboard` detects premium status and redirects to `/request`. This created a loop where Pro users with incomplete profiles could never access the profile edit form. |
| **Fix** | Changed `/profile/page.tsx` to skip the `/onboard` redirect for premium users. Instead, premium users with incomplete profiles are shown the profile edit form directly. |
| **Files Changed** | `app/profile/page.tsx` |

**Test Cases:**
- [ ] Find a Pro member who has incomplete profile (missing role/company/expertise)
- [ ] Log in as that member and navigate to /profile
- [ ] Verify the profile **edit form** is shown (not the upgrade screen)
- [ ] Fill in required fields and save — verify profile view is shown
- [ ] Verify a basic (non-Pro) member with incomplete profile is still redirected to /onboard

---

### BUG-008: Request Introduction modal closes when clicking textarea

| Field | Detail |
|-------|--------|
| **ID** | `ed1286a2` |
| **Reported** | 2026-03-26 by me@huongman.com |
| **Page** | /request (match results) |
| **Description** | After selecting "Request Introduction" on a match result, the modal opens but immediately closes when user clicks/taps the text input area. |
| **Root Cause** | The modal backdrop (`div` with `onClick={onClose}`) and the modal content (`div` with `e.stopPropagation()`) shared the same parent-child DOM structure. On certain browsers/devices, click events on the textarea could bubble through to the backdrop, triggering the close handler. |
| **Fix** | Restructured modal to use a **separate backdrop element** (`<div className="absolute inset-0" onClick={onClose} />`) instead of putting `onClick={onClose}` on the parent wrapper. The modal content uses `className="relative"` to sit above the backdrop via stacking context, completely isolating click events. |
| **Files Changed** | `components/match-intro-modal.tsx` |

**Test Cases:**
- [ ] Go to /request, submit a search, get match results
- [ ] Click "Request Introduction" on any match
- [ ] Verify the modal opens with textarea
- [ ] Click inside the textarea — verify modal stays open
- [ ] Type text in the textarea — verify modal stays open
- [ ] Click outside the modal (on the dark backdrop) — verify modal closes
- [ ] Repeat on mobile (touch events)

---

### BUG-009: Find Connection button not clickable when on request page

| Field | Detail |
|-------|--------|
| **ID** | `21c42781` |
| **Reported** | 2026-03-16 by ttvietduc@gmail.com |
| **Page** | /request |
| **Description** | When already on the Find Connection (/request) page, clicking the "Find Connection" nav link does nothing. |
| **Root Cause** | Next.js `<Link>` component does not trigger visible navigation when the target URL matches the current page. |
| **Fix** | Added an `onClick` handler that detects when user is already on `/request` (via `usePathname()`), prevents default Link behavior, scrolls to top, and calls `router.refresh()`. Applied to both desktop and mobile nav links. |
| **Files Changed** | `components/layout/header-navigation.tsx` |

**Test Cases:**
- [ ] Navigate to /request page
- [ ] Click "Find Connection" in the navigation bar
- [ ] Verify the page scrolls to top and refreshes (form should reset to initial state)
- [ ] Repeat on mobile menu
- [ ] Navigate to /request from another page (e.g. /events) — verify normal navigation still works

---

### BUG-010: View profile before requesting connection

| Field | Detail |
|-------|--------|
| **ID** | `1bc20512` |
| **Reported** | 2026-03-11 by ttvietduc@gmail.com |
| **Page** | /request (match results) |
| **Description** | Users should be able to view a match's profile before requesting a connection. |
| **Status** | **Already implemented.** The "View Profile" button exists in `match-result-card.tsx` (lines 149-158) for non-love matches. It opens `/profile/{id}` in a new tab. |

**Test Cases:**
- [ ] Submit a search on /request (use "partner" or "job" category, NOT "love")
- [ ] Verify each match card shows a "View Profile" button next to "Request Intro"
- [ ] Click "View Profile" — verify it opens the member's profile in a new tab
- [ ] Verify "love" category matches do NOT show "View Profile" (privacy protection)

---

### BUG-011: JSON parsing errors / "Something went wrong" on request page

| Field | Detail |
|-------|--------|
| **IDs** | `aa20407b`, `e7559490`, `96f45422` |
| **Reported** | 2026-03-09 to 2026-03-21 by diepvic@gmail.com, diep@ejoylearning.com, ttvietduc@gmail.com |
| **Page** | /request |
| **Description** | Users see "Unexpected token 'A', 'An error o'... is not valid JSON" or "Something went wrong" errors. |
| **Root Cause** | When the server returns a non-JSON error response (e.g. Vercel HTML error page on 500/503 timeout, or an edge function failure), the client-side code called `response.json()` which threw a JSON parse error. The raw parse error was shown to users instead of a friendly message. This affected 3 API call sites: request submission, reroll, and connect. |
| **Fix** | Wrapped `response.json()` calls in try/catch blocks across all 3 API calls in `connection-request-form.tsx` and `match-results-display.tsx`. Non-JSON responses now show a user-friendly error message in the user's locale instead of the raw parse error. |
| **Files Changed** | `components/forms/connection-request-form.tsx`, `components/match-results-display.tsx` |

**Test Cases:**
- [ ] Submit a search on /request — verify results display normally
- [ ] (Simulate) Temporarily break the API endpoint to return non-JSON — verify user sees "Có lỗi xảy ra từ hệ thống. Vui lòng thử lại." (VI) or "A server error occurred. Please try again." (EN) instead of raw JSON parse error
- [ ] Click "Reroll" — verify error handling works
- [ ] Click "Request Introduction" and send — verify error handling works
- [ ] Verify 504/502 timeout errors show specific timeout message

---

### BUG-012: Proposal form font size too small

| Field | Detail |
|-------|--------|
| **ID** | `2fc58ce9` |
| **Reported** | 2026-04-04 by quephc@gmail.com |
| **Page** | /proposals/new |
| **Description** | Font size for questions in the proposal form is too small and hard to read. |
| **Root Cause** | Question labels used `text-sm` (14px) and helper text used `text-xs` (12px), which are too small for form prompts that users need to read carefully. |
| **Fix** | Increased question labels from `text-sm` to `text-base` (16px). Increased helper/description text from `text-xs` to `text-sm` (14px). |
| **Files Changed** | `components/proposals/new-proposal-form.tsx` |

**Test Cases:**
- [ ] Navigate to /proposals/new
- [ ] Verify all question labels (1. Loại hoạt động, 2. Tên hoạt động, etc.) are visually larger
- [ ] Verify helper text under labels is also more readable
- [ ] Compare with previous version if possible — confirm noticeable improvement
- [ ] Fill out and submit a proposal — verify form still works correctly

---

### BUG-013: Add "Verified" badge to members

| Field | Detail |
|-------|--------|
| **ID** | `18a8ac8d` |
| **Reported** | 2026-03-11 by ttvietduc@gmail.com |
| **Page** | /members |
| **Description** | Add "Verified" badge to distinguish members who have self-submitted complete info from those who haven't. |
| **Status** | **Already implemented.** Blue checkmark badge exists in `member-search-result-card.tsx` (lines 22-26, 45-53). Verification logic: non-CSV-imported members with name+role+company filled in are marked as verified. |

**Test Cases:**
- [ ] Go to /members and search for any member
- [ ] Verify members who completed their profile show a blue checkmark next to their name
- [ ] Verify CSV-imported members (who haven't updated their profile) do NOT show the checkmark

---

## Deferred Bugs (Not Fixed)

### DEFERRED-001: Don't expose registrant info publicly

| Field | Detail |
|-------|--------|
| **ID** | `c0b3e646` |
| **Reported** | 2026-04-04 by diu.tran@abg.edu.vn |
| **Page** | /events/:id |
| **Description** | Registrant information should not be shown publicly on the event detail page. |
| **Reason Deferred** | Excluded from this fix batch per request. |

### DEFERRED-002: "Cách tham gia" section showing location info

| Field | Detail |
|-------|--------|
| **ID** | `47d0fd33` |
| **Reported** | 2026-04-04 by diu.tran@abg.edu.vn |
| **Page** | /events/:id |
| **Description** | The "How to Attend" section currently shows venue/location info which doesn't logically fit. |
| **Reason Deferred** | Excluded from this fix batch per request. |

### DEFERRED-003: Cover image should preserve aspect ratio

| Field | Detail |
|-------|--------|
| **ID** | `b1b1a831` |
| **Reported** | 2026-04-04 by diu.tran@abg.edu.vn |
| **Page** | /events/:id |
| **Description** | Event cover image should display at original aspect ratio instead of being cropped. |
| **Reason Deferred** | Excluded from this fix batch per request. |

---

## Unresolved / Needs Investigation

### INVESTIGATE-001: Signup error (unknown)

| Field | Detail |
|-------|--------|
| **ID** | `7750aa0f` |
| **Reported** | 2026-03-25 by vuthuyduong96@gmail.com |
| **Page** | /signup |
| **Description** | "Không hiểu lỗi gì ạ?" (Don't understand what error?) — screenshot attached but error is not specific. |
| **Screenshot** | [View](https://ketrmymhnrtkiygjbtye.supabase.co/storage/v1/object/public/bug-screenshots/b7711afc-0336-49a7-ba66-812265f83c82.blob) |
| **Notes** | May be resolved by the JSON error handling fix (BUG-011). Needs user re-test. |

---

## Summary of All Files Changed

| File | Changes |
|------|---------|
| `types/index.ts` | Updated `EventCategory` type + labels, added `allow_cancellation` to `CommunityEvent` |
| `components/admin/admin-event-manager.tsx` | New categories, bigger textarea, wider modal, cancellation toggle |
| `components/events/event-detail.tsx` | Registration date labels, cancellation policy text, conditional cancel button |
| `components/match-intro-modal.tsx` | Restructured modal backdrop to fix click-through bug |
| `components/forms/connection-request-form.tsx` | Safe JSON parsing with friendly error messages |
| `components/match-results-display.tsx` | Safe JSON parsing for reroll + connect API calls |
| `components/layout/header-navigation.tsx` | Added Profile nav link, Find Connection refresh behavior |
| `components/profile/profile-edit-form-component.tsx` | Made avatar upload button more visible |
| `components/proposals/new-proposal-form.tsx` | Increased font sizes for labels and helper text |
| `app/profile/page.tsx` | Skip onboard redirect for premium users |
| `app/api/admin/community/events/route.ts` | Updated category enum + allow_cancellation |
| `app/api/admin/community/events/[id]/route.ts` | Updated category enum + allow_cancellation |
| `app/api/community/events/route.ts` | Updated category enum |
| `lib/i18n/translations/en.ts` | Registration date labels, cancellation toggle labels |
| `lib/i18n/translations/vi.ts` | Registration date labels, cancellation toggle labels |
