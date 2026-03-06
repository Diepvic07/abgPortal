import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestAdmin, createTestMember } from '../../fixtures/test-data';

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

const paymentRecords = [
  {
    id: 'pay-1',
    member_id: 'mem-1',
    amount_vnd: 500000,
    admin_id: 'admin@abgalumni.test',
    notes: 'Annual membership',
    created_at: '2026-02-01T10:00:00Z',
    member_name: 'Alice Nguyen',
    member_email: 'alice@test.com',
  },
  {
    id: 'pay-2',
    member_id: 'mem-2',
    amount_vnd: 300000,
    admin_id: 'admin@abgalumni.test',
    notes: null,
    created_at: '2026-01-15T14:00:00Z',
    member_name: 'Bob Tran',
    member_email: 'bob@test.com',
  },
];

test.describe('Payment Tracking', () => {
  let adminPage: AdminPage;
  const basicMember = createTestMember({ tier: 'basic', status: 'approved' });
  const adminBasic = toAdminMember(basicMember, { paid: false });

  test.beforeEach(async ({ page, context }) => {
    adminPage = new AdminPage(page);
    const admin = createTestAdmin();

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
  });

  test('shows Payments tab in admin dashboard', async ({ page }) => {
    await adminPage.goto();
    await expect(page.getByRole('button', { name: /payments/i })).toBeVisible({ timeout: 10000 });
  });

  test('displays payment records table', async ({ page }) => {
    await page.route('**/api/admin/payments', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: paymentRecords, total_cash_in: 800000, count: 2 }),
      });
    });

    await adminPage.goto();
    await page.getByRole('button', { name: /payments/i }).click();

    await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Bob Tran')).toBeVisible();
    // Table headers
    await expect(page.getByText('Amount (VND)')).toBeVisible();
  });

  test('shows total cash-in summary', async ({ page }) => {
    await page.route('**/api/admin/payments', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: paymentRecords, total_cash_in: 800000, count: 2 }),
      });
    });

    await adminPage.goto();
    await page.getByRole('button', { name: /payments/i }).click();

    await expect(page.getByText(/total cash-in/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/800.*000/)).toBeVisible();
  });

  test('upgrade prompts for payment amount', async ({ page }) => {
    const promptMessages: string[] = [];
    page.on('dialog', async (dialog) => {
      promptMessages.push(dialog.message());
      if (dialog.type() === 'prompt') {
        const isAmount = dialog.message().toLowerCase().includes('amount');
        await dialog.accept(isAmount ? '500000' : 'Test notes');
      } else {
        await dialog.accept();
      }
    });

    await page.route('**/api/admin/tier', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    const row = page.locator('table tr').nth(1);
    await row.getByText('Upgrade').click();

    await page.waitForTimeout(1000);
    const amountPrompt = promptMessages.find(m => m.toLowerCase().includes('amount'));
    expect(amountPrompt).toBeTruthy();
  });

  test('requires amount on new upgrade', async ({ page }) => {
    const dialogMessages: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogMessages.push(dialog.message());
      if (dialog.type() === 'prompt') {
        // Cancel the amount prompt (empty)
        await dialog.dismiss();
      } else {
        await dialog.accept();
      }
    });

    let tierApiCalled = false;
    await page.route('**/api/admin/tier', (route) => {
      tierApiCalled = true;
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    const row = page.locator('table tr').nth(1);
    await row.getByText('Upgrade').click();

    await page.waitForTimeout(500);
    // API should NOT have been called because user cancelled the prompt
    expect(tierApiCalled).toBe(false);
  });

  test('records payment on successful upgrade', async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null;

    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        const isAmount = dialog.message().toLowerCase().includes('amount');
        await dialog.accept(isAmount ? '500000' : 'Test upgrade notes');
      } else {
        await dialog.accept();
      }
    });

    await page.route('**/api/admin/tier', async (route) => {
      capturedBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    const row = page.locator('table tr').nth(1);
    await row.getByText('Upgrade').click();

    await expect(() => {
      expect(capturedBody).toMatchObject({ tier: 'premium', amount_vnd: 500000 });
    }).toPass({ timeout: 5000 });
  });

  test('payment report loads from API', async ({ page }) => {
    await page.route('**/api/admin/payments', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: paymentRecords, total_cash_in: 800000, count: 2 }),
      });
    });

    await adminPage.goto();
    await page.getByRole('button', { name: /payments/i }).click();

    await expect(page.getByText(/payment report/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Alice Nguyen')).toBeVisible();
    await expect(page.getByText('Bob Tran')).toBeVisible();
    await expect(page.getByText(/payment count/i)).toBeVisible();
  });
});
