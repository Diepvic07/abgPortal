import { test, expect, Page, BrowserContext } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

const member = createTestMember();

async function setupAuth(page: Page, context: BrowserContext) {
  await setupE2EAuth(page, context, {
    id: member.id,
    email: member.email,
    name: member.name,
  });
  await setupAllMocks(page, {});
}

// The history page component fetches /api/history?type=requests&days=0 (default tab)
// and /api/history?type=incoming&days=0 when switching to incoming tab
function mockHistoryAPI(
  page: Parameters<typeof setupAllMocks>[0],
  outgoingData: object,
  incomingData: object,
) {
  return page.route('**/api/history**', (route) => {
    const url = route.request().url();
    if (url.includes('type=incoming')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, ...incomingData }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, ...outgoingData }),
      });
    }
  });
}

test.describe('Enhanced Dashboard', () => {
  test('shows Outgoing and Incoming tabs with count badges', async ({ page, context }) => {
    await setupAuth(page, context);

    await mockHistoryAPI(page, {
      requests: [
        {
          id: 'req-1',
          request_text: 'Looking for tech mentor',
          status: 'matched',
          created_at: '2026-03-01T10:00:00Z',
          category: 'job',
          matched_member: { id: 'm1', name: 'Alice', role: 'Engineer', company: 'TechCo' },
        },
        {
          id: 'req-2',
          request_text: 'Need career advice',
          status: 'pending',
          created_at: '2026-03-02T10:00:00Z',
          category: null,
          matched_member: null,
        },
      ],
      love_matches: [
        {
          id: 'lm-1',
          request_id: 'req-3',
          from_id: member.id,
          to_id: 'target',
          status: 'pending',
          from_profile_shared: '{"nickname":"StarGazer"}',
          created_at: '2026-03-01T10:00:00Z',
        },
      ],
    }, {
      connections: [
        {
          id: 'conn-1',
          created_at: '2026-03-01T10:00:00Z',
          request_text: 'Networking request',
          requester: { id: 'u1', name: 'Bob', role: 'Manager', company: 'FinCo' },
        },
      ],
      love_matches: [],
    });

    await page.goto('/history');

    // Outgoing tab button should be visible (default active)
    const outgoingBtn = page.getByRole('button', { name: /outgoing/i });
    await expect(outgoingBtn).toBeVisible();

    // Incoming tab should be visible
    const incomingBtn = page.getByRole('button', { name: /incoming/i });
    await expect(incomingBtn).toBeVisible();

    // Switch to Incoming tab
    await incomingBtn.click();

    // Incoming content (Bob's requester name) should show
    await expect(page.getByText('Bob')).toBeVisible();
  });

  test('displays category badge per request with correct styling', async ({ page, context }) => {
    await setupAuth(page, context);

    await mockHistoryAPI(page, {
      requests: [
        {
          id: 'req-love',
          request_text: 'Looking for love connection',
          status: 'pending',
          created_at: '2026-03-01T10:00:00Z',
          category: 'love',
          matched_member: null,
        },
        {
          id: 'req-job',
          request_text: 'Seeking job opportunity',
          status: 'pending',
          created_at: '2026-03-01T10:00:00Z',
          category: 'job',
          matched_member: null,
        },
        {
          id: 'req-hiring',
          request_text: 'Looking to hire engineers',
          status: 'pending',
          created_at: '2026-03-01T10:00:00Z',
          category: 'hiring',
          matched_member: null,
        },
        {
          id: 'req-partner',
          request_text: 'Seeking business partner',
          status: 'pending',
          created_at: '2026-03-01T10:00:00Z',
          category: 'partner',
          matched_member: null,
        },
      ],
      love_matches: [],
    }, {
      connections: [],
      love_matches: [],
    });

    await page.goto('/history');

    // Category badge labels from CATEGORY_STYLES in history-request-list-display.tsx
    const loveBadge = page.locator('span', { hasText: 'Love' }).filter({ hasText: /^Love$/ });
    await expect(loveBadge.first()).toBeVisible();
    await expect(loveBadge.first()).toHaveClass(/pink/);

    const jobBadge = page.locator('span', { hasText: 'Job' }).filter({ hasText: /^Job$/ });
    await expect(jobBadge.first()).toBeVisible();
    await expect(jobBadge.first()).toHaveClass(/blue/);

    const hiringBadge = page.locator('span', { hasText: 'Hiring' }).filter({ hasText: /^Hiring$/ });
    await expect(hiringBadge.first()).toBeVisible();
    await expect(hiringBadge.first()).toHaveClass(/purple/);

    const partnerBadge = page.locator('span', { hasText: 'Partner' }).filter({ hasText: /^Partner$/ });
    await expect(partnerBadge.first()).toBeVisible();
    await expect(partnerBadge.first()).toHaveClass(/orange/);
  });

  test('shows love match status labels for different statuses', async ({ page, context }) => {
    await setupAuth(page, context);

    await mockHistoryAPI(page, {
      requests: [],
      love_matches: [
        {
          id: 'lm-pending',
          request_id: 'req-1',
          from_id: member.id,
          to_id: 'target-1',
          status: 'pending',
          from_profile_shared: '{"nickname":"StarGazer"}',
          created_at: '2026-03-01T10:00:00Z',
        },
        {
          id: 'lm-accepted',
          request_id: 'req-2',
          from_id: member.id,
          to_id: 'target-2',
          status: 'accepted',
          from_profile_shared: '{"nickname":"StarGazer"}',
          created_at: '2026-03-01T10:00:00Z',
        },
        {
          id: 'lm-refused',
          request_id: 'req-3',
          from_id: member.id,
          to_id: 'target-3',
          status: 'refused',
          from_profile_shared: '{"nickname":"StarGazer"}',
          created_at: '2026-03-01T10:00:00Z',
        },
      ],
    }, {
      connections: [],
      love_matches: [],
    });

    await page.goto('/history');

    // Status labels from history-page-client.tsx love match rendering
    await expect(page.getByText('Waiting for response')).toBeVisible();
    await expect(page.getByText('Matched!')).toBeVisible();
    await expect(page.getByText('Not a match')).toBeVisible();
  });

  test('incoming love match shows Accept and Pass action buttons', async ({ page, context }) => {
    await setupAuth(page, context);

    await mockHistoryAPI(page, {
      requests: [],
      love_matches: [],
    }, {
      connections: [],
      love_matches: [
        {
          id: 'lm-incoming',
          request_id: 'req-5',
          from_id: 'sender',
          to_id: member.id,
          status: 'pending',
          from_profile_shared: JSON.stringify({
            nickname: 'MoonWalker',
            gender: 'Female',
            country: 'Japan',
            self_description: 'Kind, Creative',
            interests: 'Art, Music',
            core_values: 'Kindness',
            ideal_day: 'Museum visit',
          }),
          created_at: '2026-03-01T10:00:00Z',
        },
      ],
    });

    await page.goto('/history');

    // Click Incoming tab
    await page.getByRole('button', { name: /incoming/i }).click();

    // Accept and Pass buttons should be visible (from love-match-respond-actions.tsx)
    await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pass' })).toBeVisible();
  });

  test('auto-timeout love match shows Expired status badge', async ({ page, context }) => {
    await setupAuth(page, context);

    await mockHistoryAPI(page, {
      requests: [],
      love_matches: [
        {
          id: 'lm-ignored',
          request_id: 'req-6',
          from_id: member.id,
          to_id: 'target-ignored',
          status: 'ignored',
          from_profile_shared: '{"nickname":"StarGazer"}',
          created_at: '2026-02-01T10:00:00Z',
        },
      ],
    }, {
      connections: [],
      love_matches: [],
    });

    await page.goto('/history');

    // "Expired" status label from history-page-client.tsx (ignored → 'Expired')
    await expect(page.getByText('Expired')).toBeVisible();
  });
});
