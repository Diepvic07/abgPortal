import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ABG/i);
  });

  test('login page accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('signup page accessible', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
