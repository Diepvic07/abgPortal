import { test, expect } from '@playwright/test';
import { SignupPage } from '../../pages/signup.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';

test.describe('Signup Form', () => {
  let signupPage: SignupPage;

  test.beforeEach(async ({ page }) => {
    signupPage = new SignupPage(page);
    await setupAllMocks(page, {});
  });

  test('displays all required fields', async ({ page }) => {
    await signupPage.goto();

    await expect(signupPage.nameInput).toBeVisible();
    await expect(signupPage.roleInput).toBeVisible();
    await expect(signupPage.companyInput).toBeVisible();
    await expect(signupPage.submitButton).toBeVisible();
  });

  test('validates required name field', async ({ page }) => {
    await signupPage.goto();
    await signupPage.roleInput.fill('Engineer');
    await signupPage.companyInput.fill('Test Co');
    await signupPage.submit();

    await expect(page.getByText(/name.*required|required/i)).toBeVisible();
  });

  test('validates required role field', async ({ page }) => {
    await signupPage.goto();
    await signupPage.nameInput.fill('Test User');
    await signupPage.companyInput.fill('Test Co');
    await signupPage.submit();

    await expect(page.getByText(/role.*required|required/i)).toBeVisible();
  });

  test('submits valid form successfully', async ({ page }) => {
    await page.route('**/api/onboard', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'new-member-123' }),
      });
    });

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '123', email: 'newmember@abgalumni.org', name: 'New Member' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await signupPage.goto();
    await signupPage.fillSignupForm({
      name: 'New Member',
      role: 'Engineer',
      company: 'Tech Corp',
      expertise: 'Building scalable systems for enterprise clients.',
    });
    await signupPage.submit();

    // After successful submit the form shows success or redirects
    await expect(page.getByText(/success|welcome|aboard|pending|check your email|review/i)).toBeVisible();
  });

  test('shows error for duplicate email', async ({ page }) => {
    await page.route('**/api/onboard', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Email already registered' }),
      });
    });

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '123', email: 'existing@abgalumni.org', name: 'Existing User' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await signupPage.goto();
    await signupPage.fillSignupForm({
      name: 'Duplicate User',
      role: 'Engineer',
      company: 'Tech Corp',
      expertise: 'Building scalable systems for enterprise clients and teams.',
    });
    // Also fill required textareas not in fillSignupForm
    await page.locator('textarea[name="can_help_with"]').fill('Technical mentoring and code review for engineering teams.');
    await page.locator('textarea[name="looking_for"]').fill('Networking opportunities and professional connections.');
    await signupPage.submit();

    await expect(page.getByText(/already registered|exists|error/i)).toBeVisible({ timeout: 8000 });
  });
});
