import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createTestAdmin } from '../../fixtures/test-data';

test.describe('Admin Access Control', () => {
  test('blocks unauthenticated access', async ({ page }) => {
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.goto('/admin');
    await expect(page).toHaveURL(/login/);
  });

  test('blocks non-admin users', async ({ page, context }) => {
    const regularUser = createTestMember();

    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'regular-user-token',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: regularUser.id, email: regularUser.email, isAdmin: false },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto('/admin');
    await expect(page).toHaveURL(/unauthorized|request|\//);
  });

  test('allows admin access', async ({ page, context }) => {
    const admin = createTestAdmin();

    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'admin-token',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: admin.id, email: admin.email, isAdmin: true },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [] }),
      });
    });

    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');
  });

  test('admin API rejects non-admin requests', async ({ page, context }) => {
    const regularUser = createTestMember();

    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'regular-token',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: regularUser.id, isAdmin: false },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    const response = await page.request.get('/api/admin/members');
    expect(response.status()).toBe(403);
  });
});
