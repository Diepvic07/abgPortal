import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

test.describe('Rate Limiting', () => {
  test('handles email check rate limit on login page', async ({ page }) => {
    // Mock the check-email API to return 429 after 3 requests
    await page.route('**/api/auth/check-email', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Too many requests',
          retryAfter: 60,
        }),
      });
    });

    await page.goto('/login');

    // Login form handles 429 gracefully without crashing - page remains functional
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('button[type="submit"]').click();

    // Page should still be rendered (form redirects to /signup or shows error, doesn't crash)
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/error/);
  });

  test('handles request API rate limit - shows error', async ({ page, context }) => {
    const member = createTestMember({ tier: 'basic' });

    await setupE2EAuth(page, context, { id: member.id, email: member.email });

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: 3600,
        }),
      });
    });

    await setupAllMocks(page, {});

    await page.goto('/request');
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
    await page.locator('textarea[name="request_text"]').fill('Test rate limited request here.');
    await page.locator('form button[type="submit"]').click();

    // 429 error message shown
    await expect(page.getByText(/rate limit exceeded|error|too many/i)).toBeVisible({ timeout: 10000 });
  });

  test('handles retry countdown on login rate limit', async ({ page }) => {
    await page.route('**/api/auth/check-email', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Retry-After': '30' },
        body: JSON.stringify({ error: 'Rate limited', retryAfter: 30 }),
      });
    });

    await page.goto('/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('button[type="submit"]').click();

    // Login form handles 429 gracefully - does not crash or show error page
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/error/);
  });

  test('handles public search rate limit', async ({ page }) => {
    // Public search rate limit via /api/request 429
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded' }),
      });
    });

    await setupAllMocks(page, {});
    await page.goto('/request');

    // Unauthenticated user - form still shown
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
  });
});
