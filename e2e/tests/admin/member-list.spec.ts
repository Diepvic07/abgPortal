import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createTestAdmin, createPendingMember } from '../../fixtures/test-data';

// Helper: convert test fixture members to admin API shape
function toAdminMember(m: ReturnType<typeof createTestMember>) {
  return {
    ...m,
    approval_status: m.status,
    paid: m.tier === 'premium',
    is_admin: false,
    is_csv_imported: false,
    created_at: new Date().toISOString(),
  };
}

test.describe('Admin Member List', () => {
  let adminPage: AdminPage;
  const pendingMember = createPendingMember();
  const approvedMember = createTestMember({ status: 'approved', name: 'Approved User' });
  const rejectedMember = createTestMember({ status: 'rejected', name: 'Rejected User' });
  const members = [pendingMember, approvedMember, rejectedMember];
  const adminMembers = members.map(toAdminMember);

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
        body: JSON.stringify({ members: adminMembers }),
      });
    });

    await setupAllMocks(page, {});
  });

  test('displays member table', async ({ page }) => {
    await adminPage.goto();

    await expect(adminPage.memberTable).toBeVisible();
    // Default tab is "pending" — shows only pending members (1 row) + header
    const rows = adminPage.memberTable.locator('tr');
    await expect(rows).toHaveCount(2); // 1 header + 1 pending member
  });

  test('shows member details in pending tab', async ({ page }) => {
    await adminPage.goto();

    // Default pending tab shows the pending member
    await expect(page.getByText(pendingMember.name)).toBeVisible();
    await expect(page.getByText(pendingMember.email)).toBeVisible();
  });

  test('filters by pending status (default tab)', async ({ page }) => {
    await adminPage.goto();

    // The page loads with pending tab active by default
    await expect(page.getByText(pendingMember.name)).toBeVisible();
  });

  test('filters by member status tab shows all members', async ({ page }) => {
    await adminPage.goto();
    // Click "Member Status" tab to see all members
    await adminPage.filterByStatus('approved');

    await expect(page.getByText('Approved User')).toBeVisible();
  });

  test('searches members by name', async ({ page }) => {
    await adminPage.goto();
    // Switch to Member Status tab first (shows all members)
    await adminPage.filterByStatus('approved');
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
    await expect(page.getByText(/no pending applications|no members|empty/i)).toBeVisible();
  });
});
