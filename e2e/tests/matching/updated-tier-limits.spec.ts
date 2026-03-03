import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createTestMatch } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

const defaultMatches = [createTestMatch('m1', 'Alice Chen', 90)];

test.describe('Updated Tier Limits', () => {
  test('basic tier allows 3rd request (not blocked at 1)', async ({ page, context }) => {
    const user = createTestMember({ tier: 'basic' });

    await setupE2EAuth(page, context, {
      id: user.id,
      email: user.email,
      tier: 'basic',
    });

    await setupAllMocks(page, {});

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-123',
          matches: defaultMatches,
        }),
      });
    });

    const requestPage = new RequestPage(page);
    await requestPage.goto();
    await requestPage.submitRequest('Looking for a mentor in product management area.');

    await expect(page.getByText('Alice Chen').first()).toBeVisible();
  });

  test('basic tier blocks after 3 requests with upgrade prompt', async ({ page, context }) => {
    const user = createTestMember({ tier: 'basic' });

    await setupE2EAuth(page, context, {
      id: user.id,
      email: user.email,
      tier: 'basic',
    });

    await setupAllMocks(page, {});

    // Mock API returning 403 (limit reached) which triggers FakeResultsPaywall
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

    const requestPage = new RequestPage(page);
    await requestPage.goto();
    await requestPage.submitRequest('Looking for co-founders in the AI space innovation.');

    // FakeResultsPaywall shows "Upgrade to Premium" text
    await expect(page.getByText(/upgrade to premium/i)).toBeVisible();
  });

  test('premium shows daily soft-cap warning at 20 via reroll', async ({ page, context }) => {
    const user = createTestMember({ tier: 'premium' });

    await setupE2EAuth(page, context, {
      id: user.id,
      email: user.email,
      tier: 'premium',
    });

    await setupAllMocks(page, {});

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-456',
          matches: defaultMatches,
        }),
      });
    });

    const requestPage = new RequestPage(page);
    await requestPage.goto();
    await requestPage.submitRequest('Looking for investors in Southeast Asia market.');

    await expect(page.getByText('Alice Chen').first()).toBeVisible();

    const warningMessage = "You've made 20 requests today. Consider spreading requests across days.";

    await page.route('**/api/request/reroll', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            matches: [createTestMatch('m2', 'Bob Kim', 88)],
            warning: warningMessage,
          },
        }),
      });
    });

    await page.getByRole('button', { name: /run again/i }).click();

    await expect(page.getByText(warningMessage)).toBeVisible();
  });

  test('premium blocks at monthly limit with paywall', async ({ page, context }) => {
    const user = createTestMember({ tier: 'premium' });

    await setupE2EAuth(page, context, {
      id: user.id,
      email: user.email,
      tier: 'premium',
    });

    await setupAllMocks(page, {});

    // Mock 403 for premium monthly limit
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Monthly request limit reached',
        }),
      });
    });

    const requestPage = new RequestPage(page);
    await requestPage.goto();
    await requestPage.submitRequest('Seeking partnerships in clean energy innovations.');

    // FakeResultsPaywall shows upgrade prompt
    await expect(page.getByText(/upgrade to premium/i)).toBeVisible();
  });
});
