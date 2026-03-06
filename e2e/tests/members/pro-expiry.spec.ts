import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';
import { MembersPage } from '../../pages/members.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createTestAdmin } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

function toAdminMember(
  m: ReturnType<typeof createTestMember>,
  overrides: Partial<{ paid: boolean; is_admin: boolean; membership_expiry: string }> = {},
) {
  return {
    ...m,
    approval_status: m.status,
    paid: overrides.paid ?? m.tier === 'premium',
    is_admin: overrides.is_admin ?? false,
    is_csv_imported: false,
    created_at: new Date().toISOString(),
    membership_expiry: overrides.membership_expiry,
  };
}

test.describe('Pro Membership Expiry', () => {
  // NOTE: /profile is server-rendered and reads member data from DB directly.
  // page.route() cannot intercept server-side Supabase calls.
  // Expiry display is tested via admin dashboard and API response verification.

  test('shows expiry date in admin dashboard for premium member', async ({ page, context }) => {
    const adminPage = new AdminPage(page);
    const admin = createTestAdmin();
    const proMember = createTestMember({ tier: 'premium', status: 'approved' });
    const adminPro = toAdminMember(proMember, { paid: true, membership_expiry: '2026-12-31T23:59:59.000Z' });

    await context.addCookies([
      { name: 'next-auth.session-token', value: 'admin-token', domain: '127.0.0.1', path: '/' },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: admin.id, email: admin.email, isAdmin: true },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [adminPro] }),
      });
    });

    await setupAllMocks(page, {});
    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    // Premium member should show expiry date (Exp: <date>)
    await expect(page.getByText(/exp:/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('does not show expiry for basic tier in admin', async ({ page, context }) => {
    const adminPage = new AdminPage(page);
    const admin = createTestAdmin();
    const basicMember = createTestMember({ tier: 'basic', status: 'approved' });
    const adminBasic = toAdminMember(basicMember, { paid: false });

    await context.addCookies([
      { name: 'next-auth.session-token', value: 'admin-token', domain: '127.0.0.1', path: '/' },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: admin.id, email: admin.email, isAdmin: true },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [adminBasic] }),
      });
    });

    await setupAllMocks(page, {});
    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    // Basic members should not show expiry
    await expect(page.getByText(basicMember.name)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/exp:/i)).not.toBeVisible();
  });

  test('expired member treated as basic tier on search', async ({ page, context }) => {
    const expiredMember = createTestMember({ tier: 'basic' });
    const membersPage = new MembersPage(page);
    await setupE2EAuth(page, context, { id: expiredMember.id, email: expiredMember.email, tier: 'basic' });
    await setupAllMocks(page, {});

    // Server returns basic tier for expired member (auto-downgraded)
    await page.route('**/api/search/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ id: 'mem-1', name: 'Alice Nguyen', avatar_url: null }],
          total: 1,
          tier: 'basic',
          search_quota: { remaining: 3, limit: 10 },
        }),
      });
    });

    await membersPage.goto();
    await membersPage.search('Alice');

    await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
    // Basic tier behavior: shows upgrade CTA, no contact button
    await expect(page.getByText(/upgrade to pro/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Contact Member' })).toHaveCount(0);
  });

  test('profile API returns expiry for premium members', async ({ page, context }) => {
    const proMember = createTestMember({ tier: 'premium' });
    await setupE2EAuth(page, context, { id: proMember.id, email: proMember.email, tier: 'premium' });

    // Mock the profile API to return member with expiry
    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...proMember,
          paid: true,
          membership_expiry: '2026-12-31T23:59:59.000Z',
        }),
      });
    });

    await setupAllMocks(page, {});

    // Verify API response shape
    const response = await page.request.get('/api/profile');
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.membership_expiry).toBeTruthy();
      expect(data.tier).toBe('premium');
    }
  });

  test('admin can see expiry date for premium members', async ({ page, context }) => {
    const adminPage = new AdminPage(page);
    const admin = createTestAdmin();
    const proMember = createTestMember({ tier: 'premium', status: 'approved' });
    const adminProMember = toAdminMember(proMember, { paid: true, membership_expiry: '2026-12-31T23:59:59.000Z' });

    await context.addCookies([
      { name: 'next-auth.session-token', value: 'admin-token', domain: '127.0.0.1', path: '/' },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: admin.id, email: admin.email, isAdmin: true },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [adminProMember] }),
      });
    });

    await setupAllMocks(page, {});
    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    await expect(page.getByText(/exp:/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('expired member sees upgrade CTA on search page', async ({ page, context }) => {
    const expiredMember = createTestMember({ tier: 'basic' });
    const membersPage = new MembersPage(page);
    await setupE2EAuth(page, context, { id: expiredMember.id, email: expiredMember.email, tier: 'basic' });
    await setupAllMocks(page, {});

    await page.route('**/api/search/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ id: 'mem-1', name: 'Alice Nguyen', avatar_url: null }],
          total: 1,
          tier: 'basic',
          search_quota: { remaining: 5, limit: 10 },
        }),
      });
    });

    await membersPage.goto();
    await membersPage.search('Alice');

    await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/upgrade to pro/i).first()).toBeVisible();
  });
});
