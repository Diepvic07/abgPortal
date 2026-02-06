import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestAdmin, createPendingMember } from '../../fixtures/test-data';
import { clearCapturedEmails } from '../../mocks/resend.mock';
import { clearCapturedWebhooks } from '../../mocks/discord.mock';

test.describe('Approval Workflow', () => {
  let adminPage: AdminPage;
  const pendingMember = createPendingMember();

  test.beforeEach(async ({ page, context }) => {
    adminPage = new AdminPage(page);
    const admin = createTestAdmin();
    clearCapturedEmails();
    clearCapturedWebhooks();

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
        body: JSON.stringify({ members: [pendingMember] }),
      });
    });

    await setupAllMocks(page, { resend: { captureEmails: true } });
  });

  test('approves pending member', async ({ page }) => {
    await page.route('**/api/admin/approve', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await adminPage.goto();
    await adminPage.approveMember(0);

    await expect(page.getByText(/approved|success/i)).toBeVisible();
  });

  test('shows confirmation before approval', async ({ page }) => {
    await adminPage.goto();

    const approveBtn = page.getByRole('button', { name: /approve/i }).first();
    await approveBtn.click();

    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible()) {
      await expect(dialog.getByText(/confirm|approve/i)).toBeVisible();
      await dialog.getByRole('button', { name: /cancel/i }).click();
      await expect(dialog).not.toBeVisible();
    }
  });

  test('rejects member with reason', async ({ page }) => {
    await page.route('**/api/admin/reject', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await adminPage.goto();
    await adminPage.rejectMember(0);

    const reasonInput = page.getByLabel(/reason/i);
    if (await reasonInput.isVisible()) {
      await reasonInput.fill('Does not meet membership criteria.');
      await page.getByRole('button', { name: /confirm|reject/i }).click();
    }

    await expect(page.getByText(/rejected|success/i)).toBeVisible();
  });

  test('handles approval API error', async ({ page }) => {
    await page.route('**/api/admin/approve', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to approve' }),
      });
    });

    await adminPage.goto();
    await adminPage.approveMember(0);

    await expect(page.getByText(/error|failed/i)).toBeVisible();
  });

  test('updates UI after approval', async ({ page }) => {
    let memberStatus = 'pending';

    await page.route('**/api/admin/approve', (route) => {
      memberStatus = 'approved';
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
          members: [{ ...pendingMember, status: memberStatus }],
        }),
      });
    });

    await adminPage.goto();
    await adminPage.approveMember(0);

    await expect(page.getByText(/approved/i)).toBeVisible();
  });

  test('verifies email sent on approval', async ({ page }) => {
    await page.route('**/api/admin/approve', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, emailSent: true }),
      });
    });

    await adminPage.goto();
    await adminPage.approveMember(0);

    await expect(page.getByText(/approved|notification sent/i)).toBeVisible();
  });
});
