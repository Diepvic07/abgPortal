import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Boundary Conditions', () => {
  const member = createTestMember();

  test.beforeEach(async ({ page, context }) => {
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
          user: { id: member.id, email: member.email },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await setupAllMocks(page, {});
  });

  test('handles very long bio text', async ({ page }) => {
    const longBio = 'A'.repeat(5000);

    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...member, bio: longBio }),
      });
    });

    await page.goto('/profile');
    await expect(page.getByText(/truncated|show more|read more/i)).toBeVisible();
  });

  test('handles empty member name', async ({ page }) => {
    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...member, name: '' }),
      });
    });

    await page.goto('/profile');
    await expect(page.locator('[data-testid="profile-name"]')).toBeVisible();
  });

  test('handles special characters in input', async ({ page }) => {
    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, matches: [] }),
      });
    });

    await page.goto('/request');
    await page
      .getByLabel(/purpose/i)
      .fill('<script>alert("xss")</script> & "quotes" \'apostrophe\'');
    await page.getByRole('button', { name: /find/i }).click();

    await expect(page.getByText(/no matches|results/i)).toBeVisible();
  });

  test('handles unicode characters', async ({ page }) => {
    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...member,
          name: '张伟 🎉',
          bio: 'Профессионал 日本語テスト',
        }),
      });
    });

    await page.goto('/profile');
    await expect(page.getByText('张伟')).toBeVisible();
    await expect(page.getByText('日本語テスト')).toBeVisible();
  });

  test('handles large number of match results', async ({ page }) => {
    const manyMatches = Array.from({ length: 100 }, (_, i) =>
      createTestMember({ id: `match-${i}`, name: `Match ${i}` })
    );

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          matches: manyMatches.map((m, i) => ({
            id: m.id,
            name: m.name,
            score: 1 - i * 0.01,
          })),
        }),
      });
    });

    await page.goto('/request');
    await page.getByLabel(/purpose/i).fill('Test');
    await page.getByRole('button', { name: /find/i }).click();

    await expect(page.getByText(/showing|load more|pagination/i)).toBeVisible();
  });

  test('handles rapid button clicks', async ({ page }) => {
    let submitCount = 0;

    await page.route('**/api/request', async (route) => {
      submitCount++;
      await new Promise((r) => setTimeout(r, 500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, matches: [] }),
      });
    });

    await page.goto('/request');
    await page.getByLabel(/purpose/i).fill('Test request');

    const submitBtn = page.getByRole('button', { name: /find/i });

    await submitBtn.click();
    await submitBtn.click();
    await submitBtn.click();

    await page.waitForTimeout(1000);

    expect(submitCount).toBe(1);
  });

  test('handles browser back button', async ({ page }) => {
    await page.goto('/profile');
    await page.goto('/request');
    await page.goto('/history');

    await page.goBack();
    await expect(page).toHaveURL(/request/);

    await page.goBack();
    await expect(page).toHaveURL(/profile/);
  });

  test('handles page refresh during loading', async ({ page }) => {
    await page.route('**/api/request', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, matches: [] }),
      });
    });

    await page.goto('/request');
    await page.getByLabel(/purpose/i).fill('Test');
    await page.getByRole('button', { name: /find/i }).click();

    await page.reload();

    await expect(page.getByLabel(/purpose/i)).toBeVisible();
  });
});
