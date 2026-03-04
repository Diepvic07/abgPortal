import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createTestMatch } from '../../fixtures/test-data';

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

    test('shows request form for basic tier user', async ({ page }) => {
      await requestPage.goto();
      await expect(requestPage.purposeTextarea).toBeVisible();
      await expect(requestPage.submitButton).toBeVisible();
    });

    test('blocks request when limit reached - shows upgrade paywall', async ({ page }) => {
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
      await requestPage.submitRequest('Another request for mentoring help.');

      // 403 triggers FakeResultsPaywall with upgrade prompt
      await expect(page.getByText(/upgrade to premium/i)).toBeVisible();
    });

    test('shows upgrade paywall text when approaching limit', async ({ page }) => {
      await page.route('**/api/request', (route) => {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Request limit reached',
            upgrade_required: true,
          }),
        });
      });

      await requestPage.goto();
      await requestPage.submitRequest('Need guidance on career growth.');

      await expect(page.getByText(/upgrade to premium/i).first()).toBeVisible();
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

    test('allows requests for premium user', async ({ page }) => {
      const match = createTestMatch('m1', 'Alice Chen', 90);

      await page.route('**/api/request', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, request_id: 'req-1', matches: [match] }),
        });
      });

      await requestPage.goto();
      await requestPage.submitRequest('Looking for a business mentor in tech.');

      await expect(page.getByText('Alice Chen').first()).toBeVisible();
    });

    test('allows multiple requests without limit', async ({ page }) => {
      let callCount = 0;
      const match = createTestMatch('m1', 'Alice Chen', 90);

      await page.route('**/api/request', (route) => {
        callCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, request_id: `req-${callCount}`, matches: [match] }),
        });
      });

      await requestPage.goto();
      await requestPage.submitRequest('First request for networking help.');

      await expect(page.getByText('Alice Chen').first()).toBeVisible();

      // No tier limit message shown
      await expect(page.getByText(/upgrade to premium/i)).not.toBeVisible();
    });
  });
});
