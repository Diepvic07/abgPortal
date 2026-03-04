import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestAdmin, createPendingMember } from '../../fixtures/test-data';
import { clearCapturedEmails } from '../../mocks/resend.mock';

// Helper: convert test fixture to admin API shape
function toAdminMember(
  m: ReturnType<typeof createPendingMember>,
  approvalStatus: string = m.status
) {
  return {
    ...m,
    approval_status: approvalStatus,
    paid: m.tier === 'premium',
    is_admin: false,
    is_csv_imported: false,
    created_at: new Date().toISOString(),
  };
}

test.describe('Approval Workflow', () => {
  let adminPage: AdminPage;
  const pendingMember = createPendingMember();

  test.beforeEach(async ({ page, context }) => {
    adminPage = new AdminPage(page);
    const admin = createTestAdmin();
    clearCapturedEmails();

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

    await setupAllMocks(page, { resend: { captureEmails: true } });
  });

  test('approves pending member and shows updated status', async ({ page }) => {
    let memberApprovalStatus = 'pending';

    await page.route('**/api/admin/approve', (route) => {
      memberApprovalStatus = 'approved';
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Dynamic mock: returns updated status after approval
    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members: [toAdminMember(pendingMember, memberApprovalStatus)],
        }),
      });
    });

    await adminPage.goto();
    await adminPage.approveMember(0);

    // After approval, re-fetch returns approved status — switch to Member Status tab to see it
    await adminPage.filterByStatus('approved');
    await expect(page.getByText(/approved/i)).toBeVisible();
  });

  test('pending member shows Approve and Reject buttons', async ({ page }) => {
    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [toAdminMember(pendingMember)] }),
      });
    });

    await adminPage.goto();

    // Pending tab is default — Approve and Reject buttons should be visible
    await expect(page.getByText('Approve').first()).toBeVisible();
    await expect(page.getByText('Reject').first()).toBeVisible();
  });

  test('rejects member via confirm dialog', async ({ page }) => {
    let memberApprovalStatus = 'pending';

    await page.route('**/api/admin/reject', (route) => {
      memberApprovalStatus = 'rejected';
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members: [toAdminMember(pendingMember, memberApprovalStatus)],
        }),
      });
    });

    await adminPage.goto();

    // Reject button triggers window.confirm — accept it
    page.on('dialog', (dialog) => dialog.accept());
    await adminPage.rejectMember(0);

    // After rejection, member status changes
    await adminPage.filterByStatus('approved');
    await expect(page.getByText(/rejected/i)).toBeVisible();
  });

  test('handles approval API error via alert', async ({ page }) => {
    // Register dialog handler FIRST before any navigation
    const dialogPromise = new Promise<string>((resolve) => {
      page.on('dialog', async (dialog) => {
        resolve(dialog.message());
        await dialog.accept();
      });
    });

    await page.route('**/api/admin/approve', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to approve' }),
      });
    });

    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [toAdminMember(pendingMember)] }),
      });
    });

    await adminPage.goto();
    await adminPage.approveMember(0);

    // Admin page calls alert("Failed to approve member") on error
    const alertMessage = await dialogPromise;
    expect(alertMessage).toMatch(/failed|approve/i);
  });

  test('updates UI after approval', async ({ page }) => {
    let memberApprovalStatus = 'pending';

    await page.route('**/api/admin/approve', (route) => {
      memberApprovalStatus = 'approved';
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members: [toAdminMember(pendingMember, memberApprovalStatus)],
        }),
      });
    });

    await adminPage.goto();
    await adminPage.approveMember(0);

    // After approval, pending tab shows "No pending applications"
    await expect(page.getByText(/no pending applications/i)).toBeVisible();
  });

  test('verifies approved member appears in Member Status tab', async ({ page }) => {
    await page.route('**/api/admin/approve', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, emailSent: true }),
      });
    });

    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members: [toAdminMember(pendingMember, 'approved')],
        }),
      });
    });

    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    await expect(page.getByText(pendingMember.name)).toBeVisible();
    await expect(page.getByText(/approved/i)).toBeVisible();
  });
});
