import { test, expect } from '@playwright/test';
import { MembersPage } from '../../pages/members.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

test.describe('Search Rate Limiting', () => {
  let membersPage: MembersPage;

  test('allows search within rate limit', async ({ page, context }) => {
    const member = createTestMember({ tier: 'basic' });
    membersPage = new MembersPage(page);
    await setupE2EAuth(page, context, { id: member.id, email: member.email, tier: 'basic' });
    await setupAllMocks(page, {});

    await page.route('**/api/search/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [], total: 0, tier: 'basic', search_quota: { remaining: 9, limit: 10 } }),
      });
    });

    await membersPage.goto();
    await membersPage.search('test');

    // No error - search completes normally
    await expect(membersPage.errorMessage).not.toBeVisible({ timeout: 5000 });
  });

  test('blocks search when rate limited (429)', async ({ page, context }) => {
    const member = createTestMember({ tier: 'basic' });
    membersPage = new MembersPage(page);
    await setupE2EAuth(page, context, { id: member.id, email: member.email, tier: 'basic' });
    await setupAllMocks(page, {});

    await page.route('**/api/search/members', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Too many searches. Please wait a moment.' }),
      });
    });

    await membersPage.goto();
    await membersPage.search('test');

    await expect(page.getByText(/too many searches|wait/i)).toBeVisible({ timeout: 10000 });
  });

  test('blocks basic tier when monthly quota exceeded (403)', async ({ page, context }) => {
    const member = createTestMember({ tier: 'basic' });
    membersPage = new MembersPage(page);
    await setupE2EAuth(page, context, { id: member.id, email: member.email, tier: 'basic' });
    await setupAllMocks(page, {});

    await page.route('**/api/search/members', (route) => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Monthly search limit reached (10/month). Upgrade to Pro for unlimited searches.',
          remaining: 0,
        }),
      });
    });

    await membersPage.goto();
    await membersPage.search('test');

    await expect(page.getByText(/monthly search limit/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('premium tier has no monthly quota limit', async ({ page, context }) => {
    const member = createTestMember({ tier: 'premium' });
    membersPage = new MembersPage(page);
    await setupE2EAuth(page, context, { id: member.id, email: member.email, tier: 'premium' });
    await setupAllMocks(page, {});

    await page.route('**/api/search/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ id: 'mem-1', name: 'Alice', avatar_url: null, role: 'Eng', company: 'Co', expertise: 'JS', bio: 'Hi' }],
          total: 1,
          tier: 'premium',
          search_quota: { remaining: null, limit: null },
        }),
      });
    });

    await membersPage.goto();
    await membersPage.search('test');

    await expect(page.getByText('Alice')).toBeVisible({ timeout: 10000 });
    // Premium users should not see quota display
    await expect(page.getByText(/searches remaining/i)).not.toBeVisible();
  });
});
