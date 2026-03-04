import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

test.describe('Request History', () => {
  const member = createTestMember();

  // API response uses actual field names from EnrichedRequest interface:
  // id, request_text, status, created_at, matched_member: { id, name, role, company }
  const historyRequests = [
    {
      id: '1',
      request_text: 'Looking for tech mentorship',
      status: 'connected',
      created_at: '2026-02-05T10:00:00Z',
      category: 'partner',
      matched_member: { id: 'm1', name: 'Alice Chen', role: 'Engineer', company: 'TechCo' },
    },
    {
      id: '2',
      request_text: 'Networking in finance',
      status: 'pending',
      created_at: '2026-02-04T15:00:00Z',
      category: 'job',
      matched_member: null,
    },
    {
      id: '3',
      request_text: 'Career guidance',
      status: 'declined',
      created_at: '2026-01-20T09:00:00Z',
      category: 'partner',
      matched_member: { id: 'm2', name: 'Bob Smith', role: 'Manager', company: 'FinCo' },
    },
  ];

  test.beforeEach(async ({ page, context }) => {
    // Use setupE2EAuth to generate a real JWT for server-side getServerSession()
    await setupE2EAuth(page, context, {
      id: member.id,
      email: member.email,
      name: member.name,
    });

    await page.route('**/api/history**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          requests: historyRequests,
          love_matches: [],
        }),
      });
    });

    await setupAllMocks(page, {});
  });

  test('displays request history', async ({ page }) => {
    await page.goto('/history');

    // Wait for client component to load and fetch data
    await expect(page.getByText('Looking for tech mentorship')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Networking in finance')).toBeVisible();
    await expect(page.getByText('Career guidance')).toBeVisible();
  });

  test('shows request status badges', async ({ page }) => {
    await page.goto('/history');

    await expect(page.getByText('Looking for tech mentorship')).toBeVisible({ timeout: 10000 });
    // Status badges are span.rounded-full elements (not hidden select options)
    await expect(page.locator('span.rounded-full').filter({ hasText: /^Connected$/ }).first()).toBeVisible();
    await expect(page.locator('span.rounded-full').filter({ hasText: /^Pending$/ }).first()).toBeVisible();
    await expect(page.locator('span.rounded-full').filter({ hasText: /^Declined$/ }).first()).toBeVisible();
  });

  test('shows matched member name', async ({ page }) => {
    await page.goto('/history');

    await expect(page.getByText('Looking for tech mentorship')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Alice Chen')).toBeVisible();
    await expect(page.getByText('Bob Smith')).toBeVisible();
  });

  test('sorts by date (newest first)', async ({ page }) => {
    await page.goto('/history');

    await expect(page.getByText('Looking for tech mentorship')).toBeVisible({ timeout: 10000 });
    // Items rendered in order - first item most recent (2026-02-05)
    const requestTexts = page.locator('p.text-gray-700.text-sm');
    await expect(requestTexts.first()).toContainText('tech mentorship');
  });

  test('shows empty state when no history', async ({ page }) => {
    await page.route('**/api/history**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, requests: [], love_matches: [] }),
      });
    });

    await page.goto('/history');
    await expect(page.getByText(/no connection requests yet/i)).toBeVisible({ timeout: 10000 });
  });

  test('links to new request from empty state', async ({ page }) => {
    await page.route('**/api/history**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, requests: [], love_matches: [] }),
      });
    });

    await page.goto('/history');
    await expect(page.getByText(/no connection requests yet/i)).toBeVisible({ timeout: 10000 });
    // Click the link in main content area (not the nav link)
    await page.locator('main').getByRole('link', { name: /find connection/i }).click();

    await expect(page).toHaveURL(/request/);
  });
});
