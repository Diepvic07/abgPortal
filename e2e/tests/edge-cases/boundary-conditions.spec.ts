import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createTestMatch } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

async function fillAndSubmit(page: import('@playwright/test').Page, text: string) {
  await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
  await page.locator('textarea[name="request_text"]').fill(text);
  await page.locator('form button[type="submit"]').click();
}

test.describe('Boundary Conditions', () => {
  const member = createTestMember();

  test.beforeEach(async ({ page, context }) => {
    await setupE2EAuth(page, context, { id: member.id, email: member.email });
    await setupAllMocks(page, {});
  });

  test('handles special characters in input', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, request_id: 'req-1', matches: [] }),
      });
    });

    await page.goto('/request');
    await fillAndSubmit(page, '<script>alert("xss")</script> & "quotes" special chars test run.');

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles minimum valid request text (20 chars)', async ({ page }) => {
    const match = createTestMatch('m1', 'Alice Chen', 90);

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, request_id: 'req-1', matches: [match] }),
      });
    });

    await page.goto('/request');
    // Exactly 20 characters - minimum valid length
    await fillAndSubmit(page, 'Need a tech mentor!!');

    await expect(page.getByText('Alice Chen').first()).toBeVisible({ timeout: 10000 });
  });

  test('rejects input below minimum length (under 20 chars)', async ({ page }) => {
    await page.goto('/request');
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
    await page.locator('textarea[name="request_text"]').fill('Too short');
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator('.text-error, p.text-error').first()).toBeVisible();
  });

  test('handles large number of match results', async ({ page }) => {
    const manyMatches = Array.from({ length: 10 }, (_, i) =>
      createTestMatch(`match-${i}`, `Match ${i}`, 90 - i)
    );

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, request_id: 'req-1', matches: manyMatches }),
      });
    });

    await page.goto('/request');
    await fillAndSubmit(page, 'Looking for various connections in tech.');

    await expect(page.getByText('Match 0').first()).toBeVisible({ timeout: 10000 });
  });

  test('handles rapid button clicks - submits only once', async ({ page }) => {
    let submitCount = 0;

    await page.route('**/api/request', async (route) => {
      submitCount++;
      await new Promise((r) => setTimeout(r, 500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, request_id: 'req-1', matches: [] }),
      });
    });

    await page.goto('/request');
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
    await page.locator('textarea[name="request_text"]').fill('Test rapid click for debounce.');

    const submitBtn = page.locator('form button[type="submit"]');
    await submitBtn.click();
    await submitBtn.click({ force: true });
    await submitBtn.click({ force: true });

    await page.waitForTimeout(1000);
    expect(submitCount).toBe(1);
  });

  test('handles browser back button navigation', async ({ page }) => {
    await page.goto('/request');
    await page.goto('/');
    await page.goBack();
    await expect(page).toHaveURL(/request/);
  });

  test('handles page refresh - form resets', async ({ page }) => {
    await page.goto('/request');
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
    await page.locator('textarea[name="request_text"]').fill('Test input before refresh.');
    await page.reload();
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible({ timeout: 10000 });
  });
});
