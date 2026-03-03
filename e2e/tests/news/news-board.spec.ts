import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

test.describe('News Board', () => {
  const member = createTestMember();

  test.beforeEach(async ({ page, context }) => {
    await setupE2EAuth(page, context, {
      id: member.id,
      email: member.email,
      name: member.name,
    });

    await setupAllMocks(page, {});
  });

  test('shows empty state when no articles exist', async ({ page }) => {
    await page.goto('/news');
    await expect(page.getByText(/no articles found/i)).toBeVisible();
  });

  test('displays category filter buttons', async ({ page }) => {
    await page.goto('/news');
    const categories = ['All', 'Edu', 'Business', 'Event', 'Course', 'Announcement'];
    for (const cat of categories) {
      await expect(page.getByRole('button', { name: cat, exact: true })).toBeVisible();
    }
  });

  test('category filter updates URL', async ({ page }) => {
    await page.goto('/news');
    await page.getByRole('button', { name: 'Business', exact: true }).click();
    await expect(page).toHaveURL(/category=Business/);
  });

  test('All filter removes category from URL', async ({ page }) => {
    await page.goto('/news?category=Edu');
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(page).toHaveURL(/\/news$/);
  });

  test('news page renders hero heading', async ({ page }) => {
    await page.goto('/news');
    // NewsHeroSection renders an h1 with "News & Announcements"
    await expect(page.getByRole('heading', { name: /news & announcements/i })).toBeVisible();
  });

  test('article detail page handles non-existent slug', async ({ page }) => {
    const response = await page.goto('/news/non-existent-article-slug');
    const status = response?.status() ?? 0;
    if (status === 404) {
      expect(status).toBe(404);
    } else {
      // In dev mode, Next.js renders a not-found page — use heading to avoid strict mode
      await expect(page.getByRole('heading', { name: /404|not found/i })).toBeVisible();
    }
  });
});
