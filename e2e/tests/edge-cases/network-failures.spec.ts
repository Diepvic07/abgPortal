import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Network Failures', () => {
  const member = createTestMember();

  test.beforeEach(async ({ page, context }) => {
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
          user: { id: member.id, email: member.email },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });
  });

  test('handles complete network failure', async ({ page }) => {
    await page.route('**/api/request', (route) => route.abort('failed'));

    await page.goto('/request');
    await page.getByLabel(/purpose/i).fill('Test request');
    await page.getByRole('button', { name: /find|match/i }).click();

    await expect(page.getByText(/network|connection|offline|try again/i)).toBeVisible();
  });

  test('handles timeout', async ({ page }) => {
    await page.route('**/api/request', async (route) => {
      await new Promise((r) => setTimeout(r, 60000));
      route.abort('timedout');
    });

    page.setDefaultTimeout(5000);

    await page.goto('/request');
    await page.getByLabel(/purpose/i).fill('Test request');
    await page.getByRole('button', { name: /find|match/i }).click();

    await expect(page.getByText(/timeout|taking too long|try again/i)).toBeVisible();
  });

  test('handles intermittent connection', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/profile', (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.abort('failed');
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(member),
        });
      }
    });

    await setupAllMocks(page, {});
    await page.goto('/profile');

    await expect(page.getByText(/error|retry/i)).toBeVisible();

    const retryButton = page.getByRole('button', { name: /retry|reload/i });
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await expect(page.getByText(member.name)).toBeVisible();
    }
  });

  test('handles Google Sheets API unavailable', async ({ page }) => {
    await page.route('**/sheets.googleapis.com/**', (route) => route.abort('failed'));
    await setupAllMocks(page, {});

    await page.goto('/profile');
    await expect(page.getByText(/service unavailable|error|try again/i)).toBeVisible();
  });

  test('handles Gemini API unavailable', async ({ page }) => {
    await page.route('**/generativelanguage.googleapis.com/**', (route) => route.abort('failed'));
    await setupAllMocks(page, {});

    await page.goto('/request');
    await page.getByLabel(/purpose/i).fill('Valid request');
    await page.getByRole('button', { name: /find|match/i }).click();

    await expect(page.getByText(/ai.*unavailable|matching.*error|try again/i)).toBeVisible();
  });

  test('no console errors on network failure', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.route('**/api/request', (route) => route.abort('failed'));
    await setupAllMocks(page, {});

    await page.goto('/request');
    await page.getByLabel(/purpose/i).fill('Test');
    await page.getByRole('button', { name: /find/i }).click();

    await page.waitForTimeout(1000);

    const unexpectedErrors = consoleErrors.filter(
      (e) => !e.includes('net::ERR') && !e.includes('NetworkError')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });
});
