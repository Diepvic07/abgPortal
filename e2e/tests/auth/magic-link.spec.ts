import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { clearCapturedEmails } from '../../mocks/resend.mock';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Magic Link Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    clearCapturedEmails();
    await setupAllMocks(page, {
      members: [createTestMember()],
      resend: { captureEmails: true },
    });
  });

  test('requests magic link for valid email', async ({ page }) => {
    const testEmail = 'user@abgalumni.org';

    await page.route('**/api/auth/check-email', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true, status: 'approved' }),
      });
    });

    await loginPage.goto();
    await loginPage.requestMagicLink(testEmail);

    await expect(page).toHaveURL('/auth/verify-request');
    await expect(page.getByText(/check your email|magic link sent/i)).toBeVisible();
  });

  test('shows error for unregistered email', async ({ page }) => {
    await page.route('**/api/auth/check-email', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: false, message: 'Email not found' }),
      });
    });

    await loginPage.goto();
    await loginPage.requestMagicLink('unknown@example.com');

    await expect(page.getByText(/not found|not registered/i)).toBeVisible();
  });

  test('shows pending status for unapproved user', async ({ page }) => {
    await page.route('**/api/auth/check-email', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true, status: 'pending' }),
      });
    });

    await loginPage.goto();
    await loginPage.requestMagicLink('pending@abgalumni.org');

    await expect(page).toHaveURL('/auth/pending');
  });

  test('validates email format', async ({ page }) => {
    await loginPage.goto();
    await loginPage.requestMagicLink('invalid-email');

    await expect(page.getByText(/invalid|valid email/i)).toBeVisible();
  });

  test('magic link callback creates session', async ({ page }) => {
    const member = createTestMember();

    await page.route('**/api/auth/callback/email**', (route) => {
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
          user: { id: member.id, email: member.email },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto('/api/auth/callback/email?token=mock-token&email=test@abgalumni.org');
    await expect(page).toHaveURL('/request');
  });

  test('expired magic link shows error', async ({ page }) => {
    await page.route('**/api/auth/callback/email**', (route) => {
      route.fulfill({
        status: 302,
        headers: { Location: '/auth/error?error=Verification' },
      });
    });

    await page.goto('/api/auth/callback/email?token=expired-token');
    await expect(page).toHaveURL('/auth/error');
  });
});
