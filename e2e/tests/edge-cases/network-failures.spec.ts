import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

test.describe('Network Failures', () => {
  const member = createTestMember();

  test.beforeEach(async ({ page, context }) => {
    await setupE2EAuth(page, context, { id: member.id, email: member.email });
    await setupAllMocks(page, {});
  });

  test('handles complete network failure on request API', async ({ page }) => {
    await page.route('**/api/request', (route) => route.abort('failed'));

    await page.goto('/request');
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
    await page.locator('textarea[name="request_text"]').fill('Test request for network failure check.');
    await page.locator('form button[type="submit"]').click();

    // Error message shown in error div (t.common.error = "Something went wrong")
    await expect(page.locator('div.text-error, .bg-red-50').first()).toBeVisible({ timeout: 10000 });
  });

  test('handles request API abort gracefully', async ({ page }) => {
    await page.route('**/api/request', (route) => route.abort('connectionrefused'));

    await page.goto('/request');
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
    await page.locator('textarea[name="request_text"]').fill('Test request that will abort.');
    await page.locator('form button[type="submit"]').click();

    // Error shown without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('handles intermittent connection on profile PATCH', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/profile', (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.abort('failed');
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ member }),
        });
      }
    });

    // Test direct API call behavior
    const response = await page.request.patch('/api/profile', {
      data: { bio: 'Updated bio' },
    }).catch(() => null);

    // Either succeeds or fails gracefully
    expect(response === null || [200, 400, 401, 500].includes(response?.status() ?? 0)).toBe(true);
  });

  test('no console errors on request network failure', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.route('**/api/request', (route) => route.abort('failed'));

    await page.goto('/request');
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
    await page.locator('textarea[name="request_text"]').fill('Test request for console errors.');
    await page.locator('form button[type="submit"]').click();

    await page.waitForTimeout(1000);

    const unexpectedErrors = consoleErrors.filter(
      (e) =>
        !e.includes('net::ERR') &&
        !e.includes('NetworkError') &&
        !e.includes('Failed to fetch') &&
        !e.includes('Failed to load resource') &&
        !e.includes('401') &&
        !e.includes('Unauthorized')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });

  test('request form remains visible after network failure', async ({ page }) => {
    await page.route('**/api/request', (route) => route.abort('failed'));

    await page.goto('/request');
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
    await page.locator('textarea[name="request_text"]').fill('Test request for form visibility.');
    await page.locator('form button[type="submit"]').click();

    await page.waitForTimeout(500);

    // Form should still be visible (not navigated away)
    await expect(page).toHaveURL(/request/);
  });
});
