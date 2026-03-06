import { test, expect } from '@playwright/test';
import { MembersPage } from '../../pages/members.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

const basicResults = [
  { id: 'mem-1', name: 'Alice Nguyen', avatar_url: null },
  { id: 'mem-2', name: 'Bob Tran', avatar_url: null },
];

const proResults = [
  { id: 'mem-1', name: 'Alice Nguyen', avatar_url: null, role: 'Engineer', company: 'TechCo', expertise: 'React, Node', bio: 'Passionate developer.' },
  { id: 'mem-2', name: 'Bob Tran', avatar_url: null, role: 'Designer', company: 'DesignCo', expertise: 'Figma, UX', bio: 'Creative designer.' },
];

test.describe('Member Search', () => {
  let membersPage: MembersPage;

  test.describe('basic tier viewer', () => {
    const viewer = createTestMember({ tier: 'basic' });

    test.beforeEach(async ({ page, context }) => {
      membersPage = new MembersPage(page);
      await setupE2EAuth(page, context, { id: viewer.id, email: viewer.email, tier: 'basic' });
      await setupAllMocks(page, {});
    });

    test('renders search form with all filter fields', async ({ page }) => {
      await page.route('**/api/search/members', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: [], total: 0, tier: 'basic', search_quota: { remaining: 10, limit: 10 } }),
        });
      });

      await membersPage.goto();
      await expect(membersPage.searchInput).toBeVisible({ timeout: 10000 });
      await expect(membersPage.filterName).toBeVisible();
      await expect(membersPage.filterCompany).toBeVisible();
      await expect(membersPage.filterExpertise).toBeVisible();
      await expect(membersPage.filterClass).toBeVisible();
      await expect(membersPage.searchButton).toBeVisible();
    });

    test('searches by query and displays results', async ({ page }) => {
      let capturedBody: Record<string, unknown> | null = null;

      await page.route('**/api/search/members', async (route) => {
        const request = route.request();
        capturedBody = request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: basicResults, total: 2, tier: 'basic', search_quota: { remaining: 9, limit: 10 } }),
        });
      });

      await membersPage.goto();
      await membersPage.search('Alice');

      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Bob Tran')).toBeVisible();
      expect(capturedBody).toMatchObject({ query: 'Alice' });
    });

    test('shows name only for basic tier viewer', async ({ page }) => {
      await page.route('**/api/search/members', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: basicResults, total: 2, tier: 'basic', search_quota: { remaining: 9, limit: 10 } }),
        });
      });

      await membersPage.goto();
      await membersPage.search('test');

      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      // Basic results don't include role/company info
      await expect(page.getByText(/upgrade to pro to see full profile/i).first()).toBeVisible();
    });

    test('shows upgrade CTA instead of contact for basic users', async ({ page }) => {
      await page.route('**/api/search/members', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: basicResults, total: 2, tier: 'basic', search_quota: { remaining: 9, limit: 10 } }),
        });
      });

      await membersPage.goto();
      await membersPage.search('test');

      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      await expect(membersPage.upgradeCTA.first()).toBeVisible();
      await expect(membersPage.contactButton).toHaveCount(0);
    });

    test('displays search quota for basic tier', async ({ page }) => {
      await page.route('**/api/search/members', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: basicResults, total: 2, tier: 'basic', search_quota: { remaining: 8, limit: 10 } }),
        });
      });

      await membersPage.goto();
      await membersPage.search('test');

      await expect(page.getByText(/8.*searches remaining/i)).toBeVisible({ timeout: 10000 });
    });

    test('shows empty state when no results', async ({ page }) => {
      await page.route('**/api/search/members', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: [], total: 0, tier: 'basic', search_quota: { remaining: 9, limit: 10 } }),
        });
      });

      await membersPage.goto();
      await membersPage.search('nonexistent');

      await expect(membersPage.noResults).toBeVisible({ timeout: 10000 });
    });

    test('handles search API error gracefully', async ({ page }) => {
      await page.route('**/api/search/members', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Search failed' }),
        });
      });

      await membersPage.goto();
      await membersPage.search('test');

      await expect(membersPage.errorMessage).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('premium tier viewer', () => {
    const viewer = createTestMember({ tier: 'premium' });

    test.beforeEach(async ({ page, context }) => {
      membersPage = new MembersPage(page);
      await setupE2EAuth(page, context, { id: viewer.id, email: viewer.email, tier: 'premium' });
      await setupAllMocks(page, {});
    });

    test('shows full profile for premium tier viewer', async ({ page }) => {
      await page.route('**/api/search/members', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: proResults, total: 2, tier: 'premium', search_quota: { remaining: null, limit: null } }),
        });
      });

      await membersPage.goto();
      await membersPage.search('test');

      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('TechCo')).toBeVisible();
      await expect(page.getByText('React, Node')).toBeVisible();
    });

    test('never shows phone/email in search results', async ({ page }) => {
      await page.route('**/api/search/members', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: proResults, total: 2, tier: 'premium', search_quota: { remaining: null, limit: null } }),
        });
      });

      await membersPage.goto();
      await membersPage.search('test');

      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      // No phone or email should appear in results
      const cardTexts = await membersPage.resultCards.allTextContents();
      for (const text of cardTexts) {
        expect(text).not.toMatch(/@.*\.(com|org|test)/);
        expect(text).not.toMatch(/\+?\d{8,}/);
      }
    });

    test('shows Contact Member button for pro users', async ({ page }) => {
      await page.route('**/api/search/members', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: proResults, total: 2, tier: 'premium', search_quota: { remaining: null, limit: null } }),
        });
      });

      await membersPage.goto();
      await membersPage.search('test');

      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      await expect(membersPage.contactButton.first()).toBeVisible();
    });
  });
});
