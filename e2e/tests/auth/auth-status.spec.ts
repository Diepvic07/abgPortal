import { test, expect } from '@playwright/test';

test.describe('Auth Status Pages', () => {
  test('pending page shows approval message', async ({ page }) => {
    await page.goto('/auth/pending');

    const main = page.locator('.min-h-screen');
    await expect(main.locator('h1')).toContainText('Application Under Review');
    await expect(main.getByText(/email notification|email/i)).toBeVisible();
  });

  test('rejected page shows rejection message', async ({ page }) => {
    await page.goto('/auth/rejected');

    const main = page.locator('.min-h-screen');
    await expect(main.locator('h1')).toContainText('Application Not Approved');
    await expect(main.getByText(/contact/i).first()).toBeVisible();
  });

  test('suspended page shows suspension message', async ({ page }) => {
    await page.goto('/auth/suspended');

    const main = page.locator('.min-h-screen');
    await expect(main.locator('h1')).toContainText('Account Suspended');
    await expect(main.getByText(/contact/i).first()).toBeVisible();
  });

  test('error page shows error message', async ({ page }) => {
    await page.goto('/auth/error?error=Configuration');

    const main = page.locator('.min-h-screen');
    await expect(main.locator('h1')).toContainText('Server Configuration Error');
  });

  test('verify-request page shows email sent message', async ({ page }) => {
    await page.goto('/auth/verify-request');

    const main = page.locator('.min-h-screen');
    await expect(main.locator('h1')).toContainText('Check your email');
    await expect(main.getByText(/magic link/i)).toBeVisible();
  });
});
