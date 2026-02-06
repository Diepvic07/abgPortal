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
    await expect(signupPage.emailInput).toBeVisible();
    await expect(signupPage.chapterSelect).toBeVisible();
    await expect(signupPage.submitButton).toBeVisible();
  });

  test('validates required name field', async ({ page }) => {
    await signupPage.goto();
    await signupPage.emailInput.fill('test@example.com');
    await signupPage.submit();

    await expect(page.getByText(/name.*required/i)).toBeVisible();
  });

  test('validates required email field', async ({ page }) => {
    await signupPage.goto();
    await signupPage.nameInput.fill('Test User');
    await signupPage.submit();

    await expect(page.getByText(/email.*required/i)).toBeVisible();
  });

  test('validates email format', async ({ page }) => {
    await signupPage.goto();
    await signupPage.fillSignupForm({
      name: 'Test User',
      email: 'invalid-email',
    });
    await signupPage.submit();

    await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
  });

  test('submits valid form successfully', async ({ page }) => {
    await page.route('**/api/signup', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'new-member-123' }),
      });
    });

    await signupPage.goto();
    await signupPage.fillSignupForm({
      name: 'New Member',
      email: 'newmember@abgalumni.org',
      chapter: 'San Francisco',
    });
    await signupPage.submit();

    await expect(page).toHaveURL(/pending|verify/);
  });

  test('shows error for duplicate email', async ({ page }) => {
    await page.route('**/api/signup', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Email already registered' }),
      });
    });

    await signupPage.goto();
    await signupPage.fillSignupForm({
      name: 'Duplicate User',
      email: 'existing@abgalumni.org',
    });
    await signupPage.submit();

    await expect(page.getByText(/already registered|exists/i)).toBeVisible();
  });

  test('chapter dropdown contains valid options', async ({ page }) => {
    await signupPage.goto();

    const options = await signupPage.chapterSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(1);
  });
});
