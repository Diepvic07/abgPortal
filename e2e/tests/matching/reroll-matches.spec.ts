import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createTestMatch } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

const initialMatches = [
  createTestMatch('m1', 'Alice Wong', 95),
  createTestMatch('m2', 'Bob Lee', 88),
  createTestMatch('m3', 'Carol Park', 80),
];

test.describe('Reroll Matches', () => {
  let requestPage: RequestPage;

  test.beforeEach(async ({ page, context }) => {
    requestPage = new RequestPage(page);
    const currentUser = createTestMember({ tier: 'premium' });

    await setupE2EAuth(page, context, {
      id: currentUser.id,
      email: currentUser.email,
      tier: 'premium',
    });

    await setupAllMocks(page, { members: [] });
  });

  test('shows "Run Again" button after matches are displayed', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-123',
          matches: initialMatches,
        }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for tech mentors in the software industry.');

    await expect(page.getByText('Alice Wong').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /run again/i })).toBeVisible();
  });

  test('reroll fetches new matches and replaces old ones', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-123',
          matches: initialMatches,
        }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for tech mentors in the software industry.');
    await expect(page.getByText('Alice Wong').first()).toBeVisible();

    const newMatches = [
      createTestMatch('m4', 'Diana Tran', 92),
      createTestMatch('m5', 'Evan Nguyen', 87),
      createTestMatch('m6', 'Fiona Lim', 79),
    ];

    await page.route('**/api/request/reroll', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          matches: newMatches,
        }),
      });
    });

    await page.getByRole('button', { name: /run again/i }).click();

    await expect(page.getByText('Diana Tran').first()).toBeVisible();
    await expect(page.getByText('Evan Nguyen').first()).toBeVisible();
    await expect(page.getByText('Fiona Lim').first()).toBeVisible();

    await expect(page.getByText('Alice Wong')).not.toBeVisible();
    await expect(page.getByText('Bob Lee')).not.toBeVisible();
    await expect(page.getByText('Carol Park')).not.toBeVisible();
  });

  test('reroll sends exclude_ids containing all previously shown match ids', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-123',
          matches: initialMatches,
        }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for tech mentors in the software industry.');
    await expect(page.getByText('Alice Wong').first()).toBeVisible();

    let capturedBody: { request_id: string; exclude_ids: string[] } | null = null;

    await page.route('**/api/request/reroll', async (route) => {
      const body = route.request().postDataJSON();
      capturedBody = body;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          matches: [createTestMatch('m4', 'Diana Tran', 90)],
        }),
      });
    });

    await page.getByRole('button', { name: /run again/i }).click();
    await expect(page.getByText('Diana Tran').first()).toBeVisible();

    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.exclude_ids).toEqual(expect.arrayContaining(['m1', 'm2', 'm3']));
    expect(capturedBody!.exclude_ids).toHaveLength(3);
  });

  test('shows warning message when reroll returns a warning', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-123',
          matches: initialMatches,
        }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for tech mentors in the software industry.');
    await expect(page.getByText('Alice Wong').first()).toBeVisible();

    const warningMessage = "You've made 20 requests today. Consider spreading requests across days.";

    await page.route('**/api/request/reroll', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          matches: [createTestMatch('m4', 'Diana Tran', 90)],
          warning: warningMessage,
        }),
      });
    });

    await page.getByRole('button', { name: /run again/i }).click();
    await expect(page.getByText(warningMessage)).toBeVisible();
  });
});
