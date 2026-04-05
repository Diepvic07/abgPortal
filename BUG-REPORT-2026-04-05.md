# Bug Report - ABG Alumni Connect (Round 2)

**Report Date:** 2026-04-05
**Fix Date:** 2026-04-05
**Total New Reports:** 9 (all from diepvic@gmail.com, event detail page)
**Fixed:** 9

---

## Fixed Bugs

### BUG-014: Event date labels showing as "Registration Opens/Closes"

| Field | Detail |
|-------|--------|
| **ID** | `0a2383a1` |
| **Reported** | 2026-04-05 by diepvic@gmail.com |
| **Page** | /events/:id |
| **Description** | "Mở đăng ký" label shows a future event date (12/4) which doesn't make sense for registration. There's no place showing the actual event date/time (12/4/2026, 9h-3h). The previous fix incorrectly renamed event dates as registration dates. |
| **Root Cause** | Previous fix (BUG-003) incorrectly renamed `event_date`/`event_end_date` labels from "Starts/Ends" to "Registration Opens/Closes". These fields actually represent the event occurrence dates, not registration windows. |
| **Fix** | Reverted labels to "Ngày diễn ra" (Event Date) / "Kết thúc" (Ends) on the event detail page. Also reverted admin form labels to "Ngày & giờ diễn ra" / "Ngày & giờ kết thúc". |
| **Files Changed** | `components/events/event-detail.tsx`, `lib/i18n/translations/vi.ts`, `lib/i18n/translations/en.ts` |

**Test Cases:**
- [ ] Open any event detail page
- [ ] Verify "At a Glance" shows "Ngày diễn ra" (VI) / "Event Date" (EN) — NOT "Mở đăng ký"
- [ ] Verify end date shows "Kết thúc" (VI) / "Ends" (EN)
- [ ] Open Admin > Events form and verify labels say "Ngày & giờ diễn ra" / "Ngày & giờ kết thúc"

---

### BUG-015: "Cách tham gia" section should be "Địa điểm tổ chức"

| Field | Detail |
|-------|--------|
| **ID** | `3d86a0f6` |
| **Reported** | 2026-04-05 by diepvic@gmail.com |
| **Page** | /events/:id |
| **Description** | The "Cách tham gia" (How to Attend) section header doesn't accurately describe the content, which shows venue/location information. |
| **Root Cause** | Section header was labeled "How to Attend" but the content is venue/location details. |
| **Fix** | Renamed section header to "Địa điểm tổ chức" (VI) / "Event Venue" (EN). |
| **Files Changed** | `components/events/event-detail.tsx` |

**Test Cases:**
- [ ] Open any offline/hybrid event detail page
- [ ] Verify the venue section header says "Địa điểm tổ chức" (VI) / "Event Venue" (EN)
- [ ] Verify venue details (address, map link) still display correctly

---

### BUG-016: Cancellation note still showing in venue section

| Field | Detail |
|-------|--------|
| **ID** | `658143fb` |
| **Reported** | 2026-04-05 by diepvic@gmail.com |
| **Page** | /events/:id |
| **Description** | The cancellation policy note is still displayed inside the venue/location section, which is not the right place for it. |
| **Root Cause** | The cancellation note was rendered inside the venue section (formerly "Cách tham gia") regardless of the `allow_cancellation` setting. It doesn't belong with venue information. |
| **Fix** | Removed cancellation note from the venue section entirely. Added it to the registration section instead, only visible to users who have already registered. Displayed as subtle help text below the cancel button area. |
| **Files Changed** | `components/events/event-detail.tsx` |

**Test Cases:**
- [ ] Open an event detail page — verify no cancellation text in the "Địa điểm tổ chức" section
- [ ] Register for an event with cancellation enabled — verify cancellation note appears in the registration section
- [ ] Register for an event with cancellation disabled — verify the note says "không thể tự hủy"
- [ ] Before registering — verify no cancellation note is shown anywhere

---

### BUG-017: RSVP button labels need renaming + CTA styling + commitment score

| Field | Detail |
|-------|--------|
| **IDs** | `e5d654ee`, `632ed68f` |
| **Reported** | 2026-04-05 by diepvic@gmail.com |
| **Page** | /events/:id |
| **Description** | (1) "Sẽ tham gia" should be "Tham gia ngay", "Sẽ dẫn dắt" should be "Chung tay tổ chức". (2) RSVP buttons are too plain, need colorful CTA styling. (3) Should display the commitment score. |
| **Root Cause** | RSVP buttons used passive language ("Will Join" / "Will Lead") and plain border styling without visual distinction. Commitment score (`rsvp_score`) was available but not displayed. |
| **Fix** | (1) Renamed labels: "Tham gia ngay" / "Join Now" and "Chung tay tổ chức" / "Help Organize". (2) Added gradient backgrounds (blue for join, amber for organize), larger text, bolder styling, shadow effects on hover/selection. (3) Added commitment score badge (🔥) in the registration section header when `rsvp_score > 0`. |
| **Files Changed** | `components/events/event-detail.tsx` |

**Test Cases:**
- [ ] Open a published event detail page
- [ ] Verify RSVP buttons show "Tham gia ngay" and "Chung tay tổ chức" (VI)
- [ ] Verify buttons have colorful gradient backgrounds (blue-indigo for join, amber-orange for organize)
- [ ] Verify buttons have hover effects (shadow, border color change)
- [ ] Verify selected button has stronger styling (shadow, darker border)
- [ ] Verify commitment score badge appears if event has any RSVPs
- [ ] Switch to English — verify "Join Now" and "Help Organize"

---

### BUG-018: Event status badge should show countdown instead of "Đã đăng"

| Field | Detail |
|-------|--------|
| **ID** | `c0c1d919` |
| **Reported** | 2026-04-05 by diepvic@gmail.com |
| **Page** | /events/:id |
| **Description** | The "Đã đăng" (Published) status badge is not meaningful. Should show whether the event is upcoming (and in how many days) or already past. |
| **Root Cause** | The status badge always showed the raw status text ("Published"/"Draft"/etc.) without contextual information about the event's timing. |
| **Fix** | For published events, replaced the static "Đã đăng" badge with a dynamic countdown: "Còn X ngày" (In X days), "Diễn ra ngày mai" (Tomorrow), "Diễn ra hôm nay" (Today, with pulse animation), or "Đã diễn ra" (Past event). Non-published statuses (Draft, Cancelled, Completed) remain unchanged. |
| **Files Changed** | `components/events/event-detail.tsx` |

**Test Cases:**
- [ ] Open an event scheduled 5+ days in the future — verify badge shows "Còn X ngày" (green)
- [ ] Open an event scheduled for tomorrow — verify badge shows "Diễn ra ngày mai" (orange)
- [ ] Open an event scheduled for today — verify badge shows "Diễn ra hôm nay" (red, pulsing)
- [ ] Open an event whose date has passed — verify badge shows "Đã diễn ra" (gray)
- [ ] Open a draft event — verify it still shows "Bản nháp"
- [ ] Open a cancelled event — verify it still shows "Đã hủy"

---

### BUG-019: Members without avatars need colored letter-based avatars

| Field | Detail |
|-------|--------|
| **ID** | `3cc8c9ee` |
| **Reported** | 2026-04-05 by diepvic@gmail.com |
| **Page** | /events/:id |
| **Description** | In the registered members list, members without profile photos show a plain gray circle with a letter. It should show a colorful avatar with the first letter. |
| **Root Cause** | Fallback avatar used a static `bg-stone-300` (gray) background for all members without photos. |
| **Fix** | Added a deterministic color generation function (`getAvatarColor`) that assigns one of 17 distinct colors based on the member's name hash. Each member consistently gets the same color. Letters are now uppercase and bold. |
| **Files Changed** | `components/events/event-detail.tsx` |

**Test Cases:**
- [ ] Open an event with registered members who have no avatar photos
- [ ] Verify their initials appear in colorful circles (not gray)
- [ ] Verify each member gets a consistent color (reload page — same colors)
- [ ] Verify different members get different colors (not all the same)
- [ ] Verify members WITH photos still display their photo correctly

---

### BUG-020: Bug report modal needs Vietnamese interface

| Field | Detail |
|-------|--------|
| **ID** | `df538973` |
| **Reported** | 2026-04-05 by diepvic@gmail.com |
| **Page** | All pages (floating button) |
| **Description** | The "Report a Bug" modal is entirely in English. It needs Vietnamese translations. |
| **Root Cause** | Bug report modal had all strings hardcoded in English without i18n support. |
| **Fix** | Added `useTranslation()` hook to the modal. All strings (title, labels, placeholders, buttons, error messages, success toast) are now bilingual based on the user's locale setting. |
| **Files Changed** | `components/ui/bug-report-modal.tsx` |

**Test Cases:**
- [ ] Set language to Vietnamese, click the bug report button
- [ ] Verify modal title shows "Báo lỗi"
- [ ] Verify label shows "Có gì sai?"
- [ ] Verify placeholder shows "Mô tả lỗi..."
- [ ] Verify screenshot label shows "Ảnh chụp màn hình (tùy chọn)"
- [ ] Verify buttons show "Hủy" and "Gửi báo lỗi"
- [ ] Try submitting empty — verify error shows "Vui lòng mô tả lỗi"
- [ ] Submit successfully — verify toast shows "Đã gửi báo lỗi thành công"
- [ ] Switch to English — verify all text reverts to English

---

### BUG-021: Bug report button should look like a ladybug

| Field | Detail |
|-------|--------|
| **ID** | `8cbf93eb` |
| **Reported** | 2026-04-05 by diepvic@gmail.com |
| **Page** | All pages (floating button) |
| **Description** | The bug report red button should look like a ladybug. |
| **Root Cause** | Button was a plain red rounded rectangle with an exclamation icon and "Báo lỗi" text. |
| **Fix** | Replaced the button with a custom SVG ladybug illustration: red body with black spots, black head with white eyes, antennae. Hover effect scales up the ladybug. Drop shadow for depth. |
| **Files Changed** | `components/ui/bug-report-button.tsx` |

**Test Cases:**
- [ ] Log in and verify a ladybug icon appears at the bottom-right corner of the page
- [ ] Verify the ladybug has: red body, black spots, black head, white eyes, antennae
- [ ] Hover over the ladybug — verify it scales up slightly
- [ ] Click the ladybug — verify the bug report modal opens
- [ ] Verify the ladybug appears on all pages (navigate to /events, /request, /members, etc.)
- [ ] Log out — verify the ladybug disappears

---

## Summary of All Files Changed (Round 2)

| File | Changes |
|------|---------|
| `components/events/event-detail.tsx` | Reverted date labels, renamed venue section, moved cancellation note, CTA RSVP buttons, countdown status badge, colored avatars |
| `components/ui/bug-report-modal.tsx` | Full Vietnamese/English i18n support |
| `components/ui/bug-report-button.tsx` | Ladybug SVG design |
| `lib/i18n/translations/vi.ts` | Reverted admin form date labels |
| `lib/i18n/translations/en.ts` | Reverted admin form date labels |
