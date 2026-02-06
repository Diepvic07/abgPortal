import { test, expect } from '@playwright/test';

test.describe('Auth Status Pages', () => {
  test('pending page shows approval message', async ({ page }) => {
    await page.goto('/auth/pending');

    await expect(page.getByText(/pending|review|approval/i)).toBeVisible();
    await expect(page.getByText(/email|notify/i)).toBeVisible();
  });

  test('rejected page shows rejection message', async ({ page }) => {
    await page.goto('/auth/rejected');

    await expect(page.getByText(/rejected|denied/i)).toBeVisible();
    await expect(page.getByText(/contact|support/i)).toBeVisible();
  });

  test('suspended page shows suspension message', async ({ page }) => {
    await page.goto('/auth/suspended');

    await expect(page.getByText(/suspended|disabled/i)).toBeVisible();
    await expect(page.getByText(/contact|support/i)).toBeVisible();
  });

  test('error page shows error message', async ({ page }) => {
    await page.goto('/auth/error?error=Configuration');

    await expect(page.getByText(/error|something went wrong/i)).toBeVisible();
  });

  test('verify-request page shows email sent message', async ({ page }) => {
    await page.goto('/auth/verify-request');

    await expect(page.getByText(/check your email|magic link|sent/i)).toBeVisible();
  });
});
