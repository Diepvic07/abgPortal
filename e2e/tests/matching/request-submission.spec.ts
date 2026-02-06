import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Match Request Submission', () => {
  let requestPage: RequestPage;
  const members = [
    createTestMember({ name: 'Alice Chen', industry: 'Technology' }),
    createTestMember({ name: 'Bob Smith', industry: 'Finance' }),
    createTestMember({ name: 'Carol Davis', industry: 'Healthcare' }),
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

    await setupAllMocks(page, { members });
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
          matches: members.map((m, i) => ({
            id: m.id,
            name: m.name,
            score: 0.95 - i * 0.1,
            reason: `Great match for ${m.industry}`,
          })),
        }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for a mentor in tech leadership.');

    await expect(requestPage.matchResults).toBeVisible();
  });

  test('validates empty purpose field', async ({ page }) => {
    await requestPage.goto();
    await requestPage.submitButton.click();

    await expect(page.getByText(/required|purpose|reason/i)).toBeVisible();
  });

  test('validates minimum purpose length', async ({ page }) => {
    await requestPage.goto();
    await requestPage.purposeTextarea.fill('Hi');
    await requestPage.submitButton.click();

    await expect(page.getByText(/minimum|characters|longer/i)).toBeVisible();
  });

  test('shows loading state during submission', async ({ page }) => {
    await page.route('**/api/request', async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, matches: [] }),
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

    await expect(page.getByText(/error|failed|try again/i)).toBeVisible();
  });
});
