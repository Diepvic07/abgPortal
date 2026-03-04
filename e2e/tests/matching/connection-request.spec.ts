import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createTestMatch } from '../../fixtures/test-data';
import { clearCapturedEmails } from '../../mocks/resend.mock';

test.describe('Connection Request', () => {
  let requestPage: RequestPage;
  const matchedMember = createTestMatch('match-1', 'Alice Chen', 95);

  test.beforeEach(async ({ page, context }) => {
    requestPage = new RequestPage(page);
    const currentUser = createTestMember();
    clearCapturedEmails();

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
          user: { id: currentUser.id, email: currentUser.email, tier: 'premium' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-test-1',
          matches: [matchedMember],
        }),
      });
    });

    await setupAllMocks(page, { resend: { captureEmails: true } });
  });

  test('sends connection request', async ({ page }) => {
    await page.route('**/api/connect', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Connection request sent' }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for mentorship in tech leadership area.');

    // Select the match card first
    await page.locator('div.cursor-pointer').filter({ hasText: 'Alice Chen' }).first().click();

    // Click connect button
    await page.getByRole('button', { name: /request intro|connect/i }).click();

    // Success title is "Introduction Sent!"
    await expect(page.getByText(/introduction sent/i)).toBeVisible();
  });

  test('shows no confirmation modal - directly sends', async ({ page }) => {
    await page.route('**/api/connect', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('General networking request.');

    // Select match and connect
    await page.locator('div.cursor-pointer').first().click();
    await page.getByRole('button', { name: /request intro|connect/i }).click();

    await expect(page.getByText(/introduction sent/i)).toBeVisible();
  });

  test('handles connection API error', async ({ page }) => {
    await page.route('**/api/connect', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to send connection' }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Networking request in fintech space.');

    // Select match and click connect
    await page.locator('div.cursor-pointer').first().click();
    await page.getByRole('button', { name: /request intro|connect/i }).click();

    await expect(page.getByText(/failed to send connection/i)).toBeVisible();
  });

  test('prevents duplicate connection - API returns 400', async ({ page }) => {
    await page.route('**/api/connect', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Already connected or pending' }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Networking request for mentoring.');

    await page.locator('div.cursor-pointer').first().click();
    await page.getByRole('button', { name: /request intro|connect/i }).click();

    await expect(page.getByText(/already connected or pending/i)).toBeVisible();
  });

  test('shows success state after connection sent', async ({ page }) => {
    await page.route('**/api/connect', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking to connect with mentors.');

    await page.locator('div.cursor-pointer').first().click();
    await page.getByRole('button', { name: /request intro|connect/i }).click();

    // After success, component shows "Introduction Sent!" heading
    await expect(page.getByText(/introduction sent/i)).toBeVisible();
  });
});
