import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createTestAdmin, createPendingMember } from '../../fixtures/test-data';

test.describe('Admin Member List', () => {
  let adminPage: AdminPage;
  const members = [
    createPendingMember(),
    createTestMember({ status: 'approved', name: 'Approved User' }),
    createTestMember({ status: 'rejected', name: 'Rejected User' }),
  ];

  test.beforeEach(async ({ page, context }) => {
    adminPage = new AdminPage(page);
    const admin = createTestAdmin();

    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'admin-token',
        domain: '127.0.0.1',
        path: '/',
      },
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
        body: JSON.stringify({ members }),
      });
    });

    await setupAllMocks(page, {});
  });

  test('displays member table', async ({ page }) => {
    await adminPage.goto();

    await expect(adminPage.memberTable).toBeVisible();
    const rows = adminPage.memberTable.locator('tr');
    await expect(rows).toHaveCount(members.length + 1);
  });

  test('shows member details', async ({ page }) => {
    await adminPage.goto();

    for (const member of members) {
      await expect(page.getByText(member.name)).toBeVisible();
      await expect(page.getByText(member.email)).toBeVisible();
    }
  });

  test('filters by pending status', async ({ page }) => {
    await page.route('**/api/admin/members?status=pending', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: members.filter((m) => m.status === 'pending') }),
      });
    });

    await adminPage.goto();
    await adminPage.filterByStatus('pending');

    await expect(page.getByText('Pending')).toBeVisible();
  });

  test('filters by approved status', async ({ page }) => {
    await page.route('**/api/admin/members?status=approved', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: members.filter((m) => m.status === 'approved') }),
      });
    });

    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    await expect(page.getByText('Approved User')).toBeVisible();
  });

  test('searches members by name', async ({ page }) => {
    await page.route('**/api/admin/members?search=Approved', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: members.filter((m) => m.name.includes('Approved')) }),
      });
    });

    await adminPage.goto();
    await adminPage.searchMembers('Approved');

    await expect(page.getByText('Approved User')).toBeVisible();
  });

  test('shows empty state when no members', async ({ page }) => {
    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [] }),
      });
    });

    await adminPage.goto();
    await expect(page.getByText(/no members|empty/i)).toBeVisible();
  });
});
