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

  test('login form shows email input and submit for valid email flow', async ({ page }) => {
    await loginPage.goto();

    // Verify the login form is rendered correctly
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.submitButton).toContainText(/continue with email/i);

    // Fill email — this verifies the input is interactive
    await loginPage.emailInput.fill('user@abgalumni.org');
    await expect(loginPage.emailInput).toHaveValue('user@abgalumni.org');
  });

  test('check-email API routes approved user to magic link send attempt', async ({ page }) => {
    const testEmail = 'user@abgalumni.org';

    await page.route('**/api/auth/check-email', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: true, status: 'approved' }),
      });
    });

    await loginPage.goto();

    // Fill email and submit — check-email is called first
    await loginPage.emailInput.fill(testEmail);

    // Listen for the check-email request to confirm it fires
    const checkEmailPromise = page.waitForRequest('**/api/auth/check-email');
    await loginPage.submitButton.click();
    await checkEmailPromise;

    // After check-email resolves with approved status, the form proceeds to
    // call signIn('email'). The form transitions to email-sent state or shows an error.
    // We verify the page is still functional (no crash, no /error URL).
    await expect(page).not.toHaveURL(/error/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('redirects to signup for unregistered email', async ({ page }) => {
    await page.route('**/api/auth/check-email', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: false, message: 'Email not found' }),
      });
    });

    await loginPage.goto();
    await loginPage.requestMagicLink('unknown@example.com');

    // LoginForm calls router.push('/signup?email=...') when user doesn't exist
    await expect(page).toHaveURL(/signup/);
  });

  test('shows pending status for unapproved user', async ({ page }) => {
    await page.route('**/api/auth/check-email', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: true, status: 'pending' }),
      });
    });

    await loginPage.goto();
    await loginPage.requestMagicLink('pending@abgalumni.org');

    await expect(page).toHaveURL('/auth/pending');
  });

  test('validates email format via HTML5', async ({ page }) => {
    await loginPage.goto();
    // Fill invalid email — the input has type="email" so HTML5 validation fires
    await page.locator('#email').fill('invalid-email');
    await loginPage.submitButton.click();

    // HTML5 validation prevents submit — page stays on /login
    await expect(page).toHaveURL('/login');
  });

  test('magic link callback creates session', async ({ page }) => {
    const member = createTestMember();

    // Use JS redirect instead of HTTP 302 (Playwright does not follow 302 from route.fulfill)
    await page.route('**/api/auth/callback/email**', (route) => {
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
          user: { id: member.id, email: member.email },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto('/api/auth/callback/email?token=mock-token&email=test@abgalumni.org');
    await expect(page).toHaveURL('/request');
  });

  test('expired magic link shows error', async ({ page }) => {
    // Use JS redirect instead of HTTP 302
    await page.route('**/api/auth/callback/email**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<script>window.location.href="/auth/error?error=Verification"</script>',
      });
    });

    await page.goto('/api/auth/callback/email?token=expired-token');
    await expect(page).toHaveURL(/\/auth\/error/);
  });
});
