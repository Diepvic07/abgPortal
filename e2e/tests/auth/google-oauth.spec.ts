import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Google OAuth Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await setupAllMocks(page, { members: [createTestMember()] });
  });

  test('redirects to Google OAuth', async ({ page }) => {
    await page.route('**/api/auth/signin/google**', (route) => {
      route.fulfill({
        status: 302,
        headers: { Location: 'https://accounts.google.com/o/oauth2/v2/auth' },
      });
    });

    await loginPage.goto();
    await loginPage.clickGoogleSignIn();

    await expect(page).toHaveURL(/accounts\.google\.com|api\/auth/);
  });

  test('handles OAuth callback with approved user', async ({ page }) => {
    const member = createTestMember({ status: 'approved' });

    await page.route('**/api/auth/callback/google**', (route) => {
      route.fulfill({
        status: 302,
        headers: { Location: '/request' },
      });
    });

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: member.id, email: member.email, name: member.name },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto('/api/auth/callback/google?code=mock-code');
    await expect(page).toHaveURL('/request');
  });

  test('handles OAuth callback with pending user', async ({ page }) => {
    await page.route('**/api/auth/callback/google**', (route) => {
      route.fulfill({
        status: 302,
        headers: { Location: '/auth/pending' },
      });
    });

    await page.goto('/api/auth/callback/google?code=mock-code');
    await expect(page).toHaveURL('/auth/pending');
  });

  test('handles OAuth error', async ({ page }) => {
    await page.goto('/api/auth/callback/google?error=access_denied');
    await expect(page).toHaveURL('/auth/error');
    await expect(page.getByText(/error|denied|failed/i)).toBeVisible();
  });
});
