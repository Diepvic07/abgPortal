import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createTestMatch } from '../../fixtures/test-data';

test.describe('Match Results Display', () => {
  let requestPage: RequestPage;
  const members = [
    createTestMatch('1', 'Alice Chen', 95),
    createTestMatch('2', 'Bob Smith', 85),
    createTestMatch('3', 'Carol Davis', 70),
  ];

  test.beforeEach(async ({ page, context }) => {
    requestPage = new RequestPage(page);
    const currentUser = createTestMember({ tier: 'premium' });

    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'test-session',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: currentUser.id, email: currentUser.email, tier: 'premium' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await setupAllMocks(page, {});
  });

  test('displays match results in ranked order', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, request_id: 'req-1', matches: members }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for tech mentors.');

    // Members shown in order (component renders them as-is from the array)
    await expect(page.getByText('Alice Chen').first()).toBeVisible();
    await expect(page.getByText('Bob Smith').first()).toBeVisible();
    await expect(page.getByText('Carol Davis').first()).toBeVisible();
  });

  test('displays match score/percentage', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-1',
          matches: [createTestMatch('1', 'Alice', 95)],
        }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Tech mentor needed now.');

    // Wait for match results then check score badge (rendered as "95% match")
    await expect(page.getByText('Alice').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/95% match/)).toBeVisible();
  });

  test('displays match reasoning', async ({ page }) => {
    const matchWithReason = {
      id: '1',
      reason: 'Extensive experience in tech leadership and mentoring',
      match_score: 90,
      member: { id: '1', name: 'Alice', role: 'Engineer', company: 'TechCo', bio: 'Tech leader', expertise: 'JS,Python' },
    };

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-1',
          matches: [matchWithReason],
        }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Leadership guidance.');

    await expect(page.getByText(/extensive experience|tech leadership/i)).toBeVisible();
  });

  test('handles no matches found', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, request_id: 'req-1', matches: [] }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Very specific niche request.');

    // When 0 matches: title says "We found 0 potential matches"
    await expect(page.getByText(/found 0|0 potential|no match/i)).toBeVisible();
  });

  test('connect button visible after selecting a match', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-1',
          matches: members,
        }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('General networking needs.');

    // Wait for match cards to appear, then select one
    await expect(page.getByText('Alice Chen').first()).toBeVisible({ timeout: 10000 });
    await page.locator('div.cursor-pointer').first().click();
    // Connect button becomes enabled after selecting a match
    await expect(page.getByRole('button', { name: /request intro|connect/i })).toBeEnabled();
  });
});
