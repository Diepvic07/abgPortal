import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Match Results Display', () => {
  let requestPage: RequestPage;
  const members = [
    createTestMember({ id: '1', name: 'Alice Chen', industry: 'Technology', bio: 'Tech leader' }),
    createTestMember({ id: '2', name: 'Bob Smith', industry: 'Technology', bio: 'Engineer' }),
    createTestMember({ id: '3', name: 'Carol Davis', industry: 'Finance', bio: 'CFO' }),
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

    await setupAllMocks(page, { members });
  });

  test('displays match results in ranked order', async ({ page }) => {
    const rankedMatches = [
      { id: '1', name: 'Alice Chen', score: 0.95, reason: 'Strong tech background' },
      { id: '2', name: 'Bob Smith', score: 0.85, reason: 'Engineering expertise' },
      { id: '3', name: 'Carol Davis', score: 0.7, reason: 'Financial acumen' },
    ];

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, matches: rankedMatches }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for tech mentors.');

    const resultCards = page.locator('[data-testid="match-card"]');
    await expect(resultCards).toHaveCount(3);

    await expect(resultCards.nth(0)).toContainText('Alice Chen');
    await expect(resultCards.nth(1)).toContainText('Bob Smith');
    await expect(resultCards.nth(2)).toContainText('Carol Davis');
  });

  test('displays match score/percentage', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          matches: [{ id: '1', name: 'Alice', score: 0.95, reason: 'Great match' }],
        }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Tech mentor needed.');

    await expect(page.getByText(/95%|0\.95/)).toBeVisible();
  });

  test('displays match reasoning', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          matches: [
            {
              id: '1',
              name: 'Alice',
              score: 0.9,
              reason: 'Extensive experience in tech leadership and mentoring',
            },
          ],
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
        body: JSON.stringify({ success: true, matches: [] }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Very specific niche request.');

    await expect(page.getByText(/no matches|try different|broaden/i)).toBeVisible();
  });

  test('connect button visible for each match', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          matches: members.map((m, i) => ({ id: m.id, name: m.name, score: 0.9 - i * 0.1 })),
        }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('General networking.');

    const connectButtons = page.getByRole('button', { name: /connect/i });
    await expect(connectButtons).toHaveCount(3);
  });
});
