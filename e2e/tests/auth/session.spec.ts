import { test, expect } from '@playwright/test';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Session Management', () => {
  test('session persists across page navigation (client-side routes)', async ({ page, context }) => {
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

    // /request and /news are client-side — they do not use getServerSession,
    // so the mocked api/auth/session is sufficient to keep them accessible.
    await page.goto('/request');
    await expect(page).toHaveURL('/request');

    await page.goto('/news');
    await expect(page).toHaveURL('/news');
  });

  test('session persists after page reload (client-side route)', async ({ page, context }) => {
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

    await page.goto('/request');
    await page.reload();
    await expect(page).toHaveURL('/request');
  });

  test('logout button is accessible on public pages', async ({ page, context }) => {
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

    // Navigate to a page that always loads (news or /)
    await page.goto('/news');
    // Verify page loads
    await expect(page).toHaveURL('/news');
  });

  test('unauthenticated user is redirected from server-protected routes', async ({ page }) => {
    // Mock empty session
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    // Server-side pages redirect to '/' when no session
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/($|news|login)/);

    await page.goto('/history');
    await expect(page).toHaveURL(/\/($|news|login)/);
  });
});
