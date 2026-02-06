import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

test.describe('API Error Handling', () => {
  const member = createTestMember();

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
    await page.getByLabel(/purpose/i).fill('Test');
    await page.getByRole('button', { name: /find/i }).click();

    await expect(page.getByText(/invalid|bad request/i)).toBeVisible();
  });

  test('handles 401 Unauthorized', async ({ page }) => {
    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.goto('/profile');
    await expect(page).toHaveURL(/login/);
  });

  test('handles 403 Forbidden', async ({ page }) => {
    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Access denied' }),
      });
    });

    await page.goto('/admin');
    await expect(page.getByText(/access denied|forbidden|permission/i)).toBeVisible();
  });

  test('handles 404 Not Found', async ({ page }) => {
    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Member not found' }),
      });
    });

    await page.goto('/profile');
    await expect(page.getByText(/not found/i)).toBeVisible();
  });

  test('handles 500 Internal Server Error', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/request');
    await page.getByLabel(/purpose/i).fill('Test request');
    await page.getByRole('button', { name: /find/i }).click();

    await expect(page.getByText(/server error|something went wrong/i)).toBeVisible();
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
    await page.getByLabel(/purpose/i).fill('Test');
    await page.getByRole('button', { name: /find/i }).click();

    await expect(page.getByText(/unavailable|maintenance|try again later/i)).toBeVisible();
  });

  test('handles malformed JSON response', async ({ page }) => {
    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'not valid json {{{',
      });
    });

    await page.goto('/profile');
    await expect(page.getByText(/error|unexpected/i)).toBeVisible();
  });

  test('handles empty response body', async ({ page }) => {
    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '',
      });
    });

    await page.goto('/profile');
    await expect(page.getByText(/error|no data/i)).toBeVisible();
  });
});
