import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Tier-Based Request Limits', () => {
  let requestPage: RequestPage;

  test.describe('Basic Tier', () => {
    test.beforeEach(async ({ page, context }) => {
      requestPage = new RequestPage(page);
      const basicUser = createTestMember({ tier: 'basic' });

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
            user: { id: basicUser.id, email: basicUser.email, tier: 'basic' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });

      await setupAllMocks(page, {});
    });

    test('shows remaining requests count', async ({ page }) => {
      await page.route('**/api/profile', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            tier: 'basic',
            requestsRemaining: 3,
            requestsUsed: 2,
          }),
        });
      });

      await requestPage.goto();
      await expect(page.getByText(/3 requests remaining|2.*5/i)).toBeVisible();
    });

    test('blocks request when limit reached', async ({ page }) => {
      await page.route('**/api/request', (route) => {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Request limit reached',
            message: 'Upgrade to premium for unlimited requests',
          }),
        });
      });

      await requestPage.goto();
      await requestPage.submitRequest('Another request.');

      await expect(requestPage.tierLimitMessage).toBeVisible();
      await expect(page.getByText(/limit|upgrade|premium/i)).toBeVisible();
    });

    test('shows upgrade prompt when approaching limit', async ({ page }) => {
      await page.route('**/api/profile', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            tier: 'basic',
            requestsRemaining: 1,
            requestsUsed: 4,
          }),
        });
      });

      await requestPage.goto();
      await expect(page.getByText(/1 request remaining|upgrade/i)).toBeVisible();
    });
  });

  test.describe('Premium Tier', () => {
    test.beforeEach(async ({ page, context }) => {
      requestPage = new RequestPage(page);
      const premiumUser = createTestMember({ tier: 'premium' });

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
            user: { id: premiumUser.id, email: premiumUser.email, tier: 'premium' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });

      await setupAllMocks(page, {});
    });

    test('shows unlimited status for premium', async ({ page }) => {
      await page.route('**/api/profile', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tier: 'premium', requestsRemaining: null }),
        });
      });

      await requestPage.goto();
      await expect(page.getByText(/unlimited|premium/i)).toBeVisible();
    });

    test('allows unlimited requests', async ({ page }) => {
      await page.route('**/api/request', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, matches: [] }),
        });
      });

      await requestPage.goto();

      for (let i = 0; i < 3; i++) {
        await requestPage.submitRequest(`Request number ${i + 1}`);
        await expect(page.getByText(/no matches|results/i)).toBeVisible();
      }

      await expect(requestPage.tierLimitMessage).not.toBeVisible();
    });
  });
});
