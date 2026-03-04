import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

// NOTE: /news is server-rendered and reads articles from Supabase DB directly.
// In test environment without DB data, news page renders with empty articles.

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
    // In test env without DB, no articles → shows "No articles found in this category."
    await expect(page.getByText(/no articles found/i)).toBeVisible({ timeout: 10000 });
  });

  test('displays category filter buttons with translated labels', async ({ page }) => {
    await page.goto('/news');
    // Category buttons use translation labels: All→"All News", others keep their names
    await expect(page.getByRole('button', { name: 'All News' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Edu' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Business' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Event' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Course' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Announcement' })).toBeVisible();
  });

  test('category filter updates URL', async ({ page }) => {
    await page.goto('/news');
    await page.getByRole('button', { name: 'Business' }).click();
    await expect(page).toHaveURL(/category=Business/);
  });

  test('All News filter removes category from URL', async ({ page }) => {
    await page.goto('/news?category=Edu');
    await page.getByRole('button', { name: 'All News' }).click();
    await expect(page).toHaveURL(/\/news$/);
  });

  test('news page renders hero heading', async ({ page }) => {
    await page.goto('/news');
    // Hero section shows "Community News & Updates" (from t.news.pageTitle)
    await expect(page.getByRole('heading', { name: /community news|news.*updates/i })).toBeVisible({ timeout: 10000 });
  });

  test('article detail page handles non-existent slug', async ({ page }) => {
    // notFound() is called in the article page when slug doesn't exist
    // Next.js App Router either returns 404 status or renders a not-found UI
    const response = await page.goto('/news/non-existent-article-slug');
    const status = response?.status() ?? 0;

    // The page should not return a 500 server error
    expect(status).not.toBe(500);

    // Should either be 404 or render something (not crash)
    await expect(page.locator('body')).toBeVisible();
  });
});
