import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

test.describe('Request Categories', () => {
  let requestPage: RequestPage;

  test.beforeEach(async ({ page, context }) => {
    requestPage = new RequestPage(page);
    const currentUser = createTestMember({ tier: 'premium' });

    await setupE2EAuth(page, context, {
      id: currentUser.id,
      email: currentUser.email,
      tier: 'premium',
    });

    await setupAllMocks(page, {});
  });

  // Helper: get category button by unique description text (avoids strict mode issues)
  function getCategoryButton(page: import('@playwright/test').Page, descText: RegExp) {
    return page.locator('button[type="button"]').filter({ hasText: descText });
  }

  test('shows 4 category cards', async ({ page }) => {
    await requestPage.goto();

    // Wait for session to resolve and form to render
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible();

    // Category buttons — use unique description text from each button to avoid ambiguity
    await expect(getCategoryButton(page, /romantic partner/i)).toBeVisible();
    await expect(getCategoryButton(page, /open roles/i)).toBeVisible();
    await expect(getCategoryButton(page, /Find talent/i)).toBeVisible();
    await expect(getCategoryButton(page, /business partnerships/i)).toBeVisible();
  });

  test('selects category and submits with correct category in request body', async ({ page }) => {
    let capturedBody: Record<string, unknown> = {};

    await page.route('**/api/request', (route) => {
      capturedBody = route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, request_id: 'req-1', matches: [] }),
      });
    });

    await requestPage.goto();
    await getCategoryButton(page, /open roles/i).click();
    await requestPage.submitRequest('Looking for a job in tech industry with great culture.');

    expect(capturedBody.category).toBe('job');
  });

  test('love category button shows pink theme styling', async ({ page }) => {
    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: { name: 'Test User', gender: 'Male', relationship_status: 'Single' } }),
      });
    });

    await requestPage.goto();

    // Wait for form to be stable
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible();

    const loveButton = getCategoryButton(page, /romantic partner/i);
    await loveButton.click();

    // When selected, the love button gets pink border/bg styling
    await expect(loveButton).toHaveClass(/pink/);
  });

  test('job category sends correct category in request body', async ({ page }) => {
    let capturedBody: Record<string, unknown> = {};

    await page.route('**/api/request', (route) => {
      capturedBody = route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, request_id: 'req-1', matches: [] }),
      });
    });

    await requestPage.goto();
    await getCategoryButton(page, /open roles/i).click();
    await requestPage.submitRequest('Seeking job opportunities in finance sector today.');

    expect(capturedBody.category).toBe('job');
  });

  test('hiring category sends correct category in request body', async ({ page }) => {
    let capturedBody: Record<string, unknown> = {};

    await page.route('**/api/request', (route) => {
      capturedBody = route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, request_id: 'req-1', matches: [] }),
      });
    });

    await requestPage.goto();
    await getCategoryButton(page, /Find talent/i).click();
    await requestPage.submitRequest('Looking for qualified candidates for engineering roles.');

    expect(capturedBody.category).toBe('hiring');
  });
});
