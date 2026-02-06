import { test, expect } from '@playwright/test';

test.describe('Protected Route Access', () => {
  const protectedRoutes = ['/onboard', '/profile', '/request', '/history'];
  const adminRoutes = ['/admin'];

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });
  });

  for (const route of protectedRoutes) {
    test(`${route} redirects to login when unauthenticated`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/login/);
    });
  }

  for (const route of adminRoutes) {
    test(`${route} redirects to login when unauthenticated`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/login|unauthorized/);
    });
  }

  test('admin route blocks non-admin users', async ({ page, context }) => {
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
          user: { id: '123', email: 'user@test.com', isAdmin: false },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto('/admin');
    await expect(page).toHaveURL(/unauthorized|request|\//);
  });

  test('public routes accessible without auth', async ({ page }) => {
    const publicRoutes = ['/', '/login', '/signup'];

    for (const route of publicRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(route);
    }
  });
});
