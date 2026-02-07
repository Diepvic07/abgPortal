import { test as base, expect, Page } from '@playwright/test';
import { createTestMember, createTestAdmin, TestMember } from './test-data';

type AuthFixtures = {
  authenticatedPage: { page: Page; member: TestMember };
  adminSession: { page: Page; admin: TestMember };
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page, context }, use) => {
    const member = createTestMember();

    // Mock auth session
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-session-token',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    // Mock session API
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: member.id,
            email: member.email,
            name: member.name,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await use({ page, member });
  },

  adminSession: async ({ page, context }, use) => {
    const admin = createTestAdmin();

    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-admin-session-token',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            isAdmin: true,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await use({ page, admin });
  },
});

export { expect };
