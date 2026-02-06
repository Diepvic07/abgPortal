import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Request History', () => {
  const member = createTestMember();
  const historyItems = [
    {
      id: '1',
      purpose: 'Looking for tech mentorship',
      status: 'completed',
      createdAt: '2026-02-05T10:00:00Z',
      matchedMember: { name: 'Alice Chen' },
    },
    {
      id: '2',
      purpose: 'Networking in finance',
      status: 'pending',
      createdAt: '2026-02-04T15:00:00Z',
      matchedMember: null,
    },
    {
      id: '3',
      purpose: 'Career guidance',
      status: 'expired',
      createdAt: '2026-01-20T09:00:00Z',
      matchedMember: { name: 'Bob Smith' },
    },
  ];

  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'test-session',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: member.id, email: member.email },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.route('**/api/history', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ requests: historyItems }),
      });
    });

    await setupAllMocks(page, {});
  });

  test('displays request history', async ({ page }) => {
    await page.goto('/history');

    for (const item of historyItems) {
      await expect(page.getByText(item.purpose)).toBeVisible();
    }
  });

  test('shows request status badges', async ({ page }) => {
    await page.goto('/history');

    await expect(page.getByText(/completed/i)).toBeVisible();
    await expect(page.getByText(/pending/i)).toBeVisible();
    await expect(page.getByText(/expired/i)).toBeVisible();
  });

  test('shows matched member name', async ({ page }) => {
    await page.goto('/history');

    await expect(page.getByText('Alice Chen')).toBeVisible();
    await expect(page.getByText('Bob Smith')).toBeVisible();
  });

  test('sorts by date (newest first)', async ({ page }) => {
    await page.goto('/history');

    const items = page.locator('[data-testid="history-item"]');
    const firstItem = items.first();
    const lastItem = items.last();

    await expect(firstItem).toContainText('tech mentorship');
    await expect(lastItem).toContainText('Career guidance');
  });

  test('shows empty state when no history', async ({ page }) => {
    await page.route('**/api/history', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ requests: [] }),
      });
    });

    await page.goto('/history');
    await expect(page.getByText(/no requests|empty|get started/i)).toBeVisible();
  });

  test('links to new request from empty state', async ({ page }) => {
    await page.route('**/api/history', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ requests: [] }),
      });
    });

    await page.goto('/history');
    await page.getByRole('link', { name: /new request|get started/i }).click();

    await expect(page).toHaveURL(/request/);
  });
});
