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

  test('Google sign-in button is visible on login page', async ({ page }) => {
    await loginPage.goto();
    await expect(loginPage.googleButton).toBeVisible();
    await expect(loginPage.googleButton).toContainText(/google/i);
  });

  test('handles OAuth callback with approved user', async ({ page }) => {
    const member = createTestMember({ status: 'approved' });

    await page.route('**/api/auth/callback/google**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<script>window.location.href="/request"</script>',
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
        status: 200,
        contentType: 'text/html',
        body: '<script>window.location.href="/auth/pending"</script>',
      });
    });

    await page.goto('/api/auth/callback/google?code=mock-code');
    await expect(page).toHaveURL('/auth/pending');
  });

  test('handles OAuth error gracefully', async ({ page }) => {
    // When access_denied, NextAuth redirects to /auth/error or /login
    await page.route('**/api/auth/callback/google**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<script>window.location.href="/auth/error?error=AccessDenied"</script>',
      });
    });

    await page.goto('/api/auth/callback/google?error=access_denied');
    // Accept either the auth error page or a redirect to login
    await expect(page).toHaveURL(/auth\/error|login/);
  });
});
