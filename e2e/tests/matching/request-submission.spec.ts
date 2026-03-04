import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createTestMatch } from '../../fixtures/test-data';

test.describe('Match Request Submission', () => {
  let requestPage: RequestPage;
  const matchedMembers = [
    createTestMatch('1', 'Alice Chen', 95),
    createTestMatch('2', 'Bob Smith', 85),
    createTestMatch('3', 'Carol Davis', 75),
  ];

  test.beforeEach(async ({ page, context }) => {
    requestPage = new RequestPage(page);
    const currentUser = createTestMember({ tier: 'basic' });

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
          user: { id: currentUser.id, email: currentUser.email, tier: currentUser.tier },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await setupAllMocks(page, {});
  });

  test('displays request form', async ({ page }) => {
    await requestPage.goto();

    await expect(requestPage.purposeTextarea).toBeVisible();
    await expect(requestPage.submitButton).toBeVisible();
  });

  test('submits valid request', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-123',
          matches: matchedMembers,
        }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for a mentor in tech leadership.');

    // Match results show member names
    await expect(page.getByText('Alice Chen').first()).toBeVisible();
  });

  test('validates empty purpose field', async ({ page }) => {
    await requestPage.goto();
    await requestPage.submitButton.click();

    // Validation error shown in .text-error paragraph
    await expect(page.locator('.text-error, p.text-error').first()).toBeVisible();
  });

  test('validates minimum purpose length', async ({ page }) => {
    await requestPage.goto();
    await requestPage.purposeTextarea.fill('Hi');
    await requestPage.submitButton.click();

    await expect(page.locator('.text-error, p.text-error').first()).toBeVisible();
  });

  test('shows loading state during submission', async ({ page }) => {
    await page.route('**/api/request', async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, request_id: 'req-123', matches: [] }),
      });
    });

    await requestPage.goto();
    await requestPage.purposeTextarea.fill('Valid purpose for matching.');
    await requestPage.submitButton.click();

    await expect(requestPage.submitButton).toBeDisabled();
  });

  test('handles API error gracefully', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Matching service unavailable' }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for connections in healthcare.');

    await expect(page.getByText(/matching service unavailable|error|failed/i)).toBeVisible();
  });
});
