import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Rate Limiting', () => {
  test('handles email check rate limit', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/auth/check-email', (route) => {
      requestCount++;
      if (requestCount > 3) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Too many requests',
            retryAfter: 60,
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: false }),
        });
      }
    });

    await page.goto('/login');

    for (let i = 0; i < 5; i++) {
      await page.getByLabel(/email/i).fill(`test${i}@example.com`);
      await page.getByRole('button', { name: /send|sign in/i }).click();
      await page.waitForTimeout(100);
    }

    await expect(page.getByText(/too many|rate limit|wait|try again/i)).toBeVisible();
  });

  test('handles request API rate limit', async ({ page, context }) => {
    const member = createTestMember({ tier: 'basic' });

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
          user: { id: member.id, email: member.email, tier: 'basic' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

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
    await page.getByLabel(/purpose/i).fill('Test request');
    await page.getByRole('button', { name: /find/i }).click();

    await expect(page.getByText(/rate limit|too many requests/i)).toBeVisible();
  });

  test('handles public search rate limit', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/search/public', (route) => {
      requestCount++;
      if (requestCount > 5) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Rate limit exceeded' }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: [] }),
        });
      }
    });

    await page.goto('/');

    for (let i = 0; i < 7; i++) {
      await page.getByPlaceholder(/search/i).fill(`search ${i}`);
      await page.getByRole('button', { name: /search/i }).click();
      await page.waitForTimeout(50);
    }

    await expect(page.getByText(/too many|slow down|wait/i)).toBeVisible();
  });

  test('shows retry countdown', async ({ page }) => {
    await page.route('**/api/auth/check-email', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Retry-After': '30' },
        body: JSON.stringify({ error: 'Rate limited', retryAfter: 30 }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText(/30|seconds|wait/i)).toBeVisible();
  });
});
