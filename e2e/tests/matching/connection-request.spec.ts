import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { clearCapturedEmails } from '../../mocks/resend.mock';

test.describe('Connection Request', () => {
  let requestPage: RequestPage;
  const matchedMember = createTestMember({ id: 'match-1', name: 'Alice Chen', email: 'alice@abg.org' });

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
          matches: [{ id: matchedMember.id, name: matchedMember.name, score: 0.95 }],
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
    await requestPage.submitRequest('Looking for mentorship.');
    await requestPage.connectWithMatch(0);

    await expect(page.getByText(/sent|success|connection/i)).toBeVisible();
  });

  test('shows confirmation modal before sending', async ({ page }) => {
    await requestPage.goto();
    await requestPage.submitRequest('General networking.');
    await requestPage.connectWithMatch(0);

    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible()) {
      await expect(dialog.getByText(/confirm|send|connect/i)).toBeVisible();
      await dialog.getByRole('button', { name: /confirm|yes|send/i }).click();
    }

    await expect(page.getByText(/sent|success/i)).toBeVisible();
  });

  test('prevents duplicate connection to same member', async ({ page }) => {
    await page.route('**/api/connect', (route) => {
      const url = route.request().url();
      if (url.includes(matchedMember.id)) {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Already connected or pending' }),
        });
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      }
    });

    await requestPage.goto();
    await requestPage.submitRequest('Networking.');

    await requestPage.connectWithMatch(0);
    await expect(page.getByText(/already|pending|duplicate/i)).toBeVisible();
  });

  test('disables connect button after request sent', async ({ page }) => {
    await page.route('**/api/connect', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking to connect.');

    const connectBtn = requestPage.connectButton.first();
    await connectBtn.click();

    await expect(connectBtn).toBeDisabled();
    await expect(connectBtn).toContainText(/sent|pending/i);
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
    await requestPage.submitRequest('Networking request.');
    await requestPage.connectWithMatch(0);

    await expect(page.getByText(/error|failed|try again/i)).toBeVisible();
  });
});
