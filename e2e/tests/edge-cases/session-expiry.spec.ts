import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Session Expiry', () => {
  const member = createTestMember();

  test('handles session expiry during page load', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'expired-token',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.goto('/profile');
    await expect(page).toHaveURL(/login/);
  });

  test('handles session expiry during API call', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'about-to-expire',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    let isFirstCall = true;

    await page.route('**/api/auth/session', (route) => {
      if (isFirstCall) {
        isFirstCall = false;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: member.id, email: member.email },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      }
    });

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session expired' }),
      });
    });

    await setupAllMocks(page, {});

    await page.goto('/request');
    await page.getByLabel(/purpose/i).fill('Test request');
    await page.getByRole('button', { name: /find/i }).click();

    await expect(page).toHaveURL(/login/);
  });

  test('handles session expiry during form submission', async ({ page, context }) => {
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

    await page.route('**/api/profile', (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Session expired' }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(member),
        });
      }
    });

    await setupAllMocks(page, {});

    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();
    await page.getByLabel(/bio/i).fill('Updated bio');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/session expired|login again/i)).toBeVisible();
  });
});
