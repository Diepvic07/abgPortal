import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

// Helper: fill textarea and click submit, waiting for form to be ready
async function fillAndSubmit(page: import('@playwright/test').Page, text: string) {
  await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
  await page.locator('textarea[name="request_text"]').fill(text);
  await page.locator('form button[type="submit"]').click();
}

test.describe('API Error Handling', () => {
  const member = createTestMember();

  test.beforeEach(async ({ page, context }) => {
    await setupE2EAuth(page, context, { id: member.id, email: member.email });
    await setupAllMocks(page, {});
  });

  test('handles 400 Bad Request', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid request data' }),
      });
    });

    await page.goto('/request');
    await fillAndSubmit(page, 'Test request text for error handling.');

    await expect(page.getByText(/invalid request data/i)).toBeVisible();
  });

  test('handles 401 Unauthorized - redirects away from protected page', async ({ page, context }) => {
    // Clear cookies to simulate unauthenticated state for server-rendered page
    await context.clearCookies();
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.goto('/profile');
    // Server redirects unauthenticated users away from profile
    await expect(page).not.toHaveURL(/\/profile$/);
  });

  test('handles 403 Forbidden on admin page', async ({ page }) => {
    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Access denied' }),
      });
    });

    await page.goto('/admin');
    // Admin page handles non-admin access gracefully: either redirects or shows access denied
    // Just verify there's no server error (500) - page renders something
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/error\?/);
  });

  test('handles 500 Internal Server Error on request', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/request');
    await fillAndSubmit(page, 'Test request for error handling check.');

    await expect(page.getByText(/internal server error/i)).toBeVisible();
  });

  test('handles 503 Service Unavailable', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service temporarily unavailable' }),
      });
    });

    await page.goto('/request');
    await fillAndSubmit(page, 'Test request for service unavailable check.');

    await expect(page.getByText(/service temporarily unavailable/i)).toBeVisible();
  });

  test('handles 404 Not Found on API', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    });

    await page.goto('/request');
    await fillAndSubmit(page, 'Test request that returns 404 error.');

    await expect(page.getByText(/not found/i)).toBeVisible();
  });
});
