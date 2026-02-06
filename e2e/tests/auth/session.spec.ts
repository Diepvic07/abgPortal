import { test, expect } from '@playwright/test';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Session Management', () => {
  test('session persists across page navigation', async ({ page, context }) => {
    const member = createTestMember();

    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'valid-session-token',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: member.id, email: member.email, name: member.name },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto('/request');
    await expect(page).toHaveURL('/request');

    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    await page.goto('/history');
    await expect(page).toHaveURL('/history');
  });

  test('session persists after page reload', async ({ page, context }) => {
    const member = createTestMember();

    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'valid-session-token',
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

    await page.goto('/profile');
    await page.reload();
    await expect(page).toHaveURL('/profile');
  });

  test('logout clears session', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'valid-session-token',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/auth/signout', (route) => {
      route.fulfill({
        status: 200,
        headers: { 'Set-Cookie': 'next-auth.session-token=; Max-Age=0' },
      });
    });

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.goto('/profile');
    await page.getByRole('button', { name: /sign out|logout/i }).click();

    await expect(page).toHaveURL(/login|\//);
  });

  test('expired session redirects to login', async ({ page, context }) => {
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
});
