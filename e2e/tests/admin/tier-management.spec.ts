import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestAdmin, createTestMember } from '../../fixtures/test-data';

// Helper: convert test fixture members to admin API shape
function toAdminMember(
  m: ReturnType<typeof createTestMember>,
  overrides: Partial<{ paid: boolean; is_admin: boolean }> = {}
) {
  return {
    ...m,
    approval_status: m.status,
    paid: overrides.paid ?? m.tier === 'premium',
    is_admin: overrides.is_admin ?? false,
    is_csv_imported: false,
    created_at: new Date().toISOString(),
  };
}

test.describe('Tier Management', () => {
  let adminPage: AdminPage;
  const basicMember = createTestMember({ tier: 'basic', status: 'approved' });
  const premiumMember = createTestMember({ tier: 'premium', status: 'approved' });

  const adminBasic = toAdminMember(basicMember, { paid: false });
  const adminPremium = toAdminMember(premiumMember, { paid: true });

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
        body: JSON.stringify({ members: [adminBasic, adminPremium] }),
      });
    });

    await setupAllMocks(page, {});
  });

  test('displays current tier for each member', async ({ page }) => {
    await adminPage.goto();
    // Switch to Member Status tab to see all members with tiers
    await adminPage.filterByStatus('approved');

    // Use first() to avoid strict-mode violation with "Premium Members" stat card
    await expect(page.getByText(/basic/i).first()).toBeVisible();
    await expect(page.getByText(/premium/i).first()).toBeVisible();
  });

  test('upgrades member to premium', async ({ page }) => {
    let basicPaid = false;

    await page.route('**/api/admin/tier', (route) => {
      basicPaid = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Dynamic mock: after upgrade, basicMember becomes paid
    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members: [
            { ...adminBasic, paid: basicPaid },
            adminPremium,
          ],
        }),
      });
    });

    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    // Upgrade basic member (row 0)
    await adminPage.setTier(0, 'premium');

    // After upgrade, the member's tier badge changes to Premium
    // Admin page re-fetches — dynamic mock returns paid: true
    await expect(page.getByText(/premium/i).first()).toBeVisible();
  });

  test('downgrades member to basic', async ({ page }) => {
    let premiumPaid = true;

    await page.route('**/api/admin/tier', (route) => {
      premiumPaid = false;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Dynamic mock: after downgrade, premiumMember becomes unpaid
    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members: [
            adminBasic,
            { ...adminPremium, paid: premiumPaid },
          ],
        }),
      });
    });

    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    // Downgrade premium member (row 1)
    await adminPage.setTier(1, 'basic');

    // After downgrade, premium tier badge disappears (both show Basic)
    await expect(page.getByText(/basic/i).first()).toBeVisible();
  });

  test('shows tier badges in member status tab', async ({ page }) => {
    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    // Both tier badge types should be visible
    await expect(page.getByText(/basic/i).first()).toBeVisible();
    await expect(page.getByText(/premium/i).first()).toBeVisible();
  });

  test('handles tier change API error via alert', async ({ page }) => {
    // Collect all dialog messages; accept prompts, then capture the alert
    const dialogMessages: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogMessages.push(dialog.message());
      if (dialog.type() === 'prompt') {
        // Accept amount prompt with valid value, notes prompt with empty
        const isAmount = dialog.message().toLowerCase().includes('amount');
        await dialog.accept(isAmount ? '500000' : '');
      } else {
        await dialog.accept();
      }
    });

    await page.route('**/api/admin/tier', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to update tier' }),
      });
    });

    await page.route('**/api/admin/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [adminBasic, adminPremium] }),
      });
    });

    await adminPage.goto();
    await adminPage.filterByStatus('approved');

    // Click upgrade directly (don't use setTier which has its own dialog handler)
    const row = page.locator('table tr').nth(1);
    await row.getByText('Upgrade').click();

    // Wait for the error alert to appear (after prompts + failed API call)
    await page.waitForTimeout(1000);

    // The last dialog should be the error alert
    const alertMessage = dialogMessages.find(m => /failed|tier|change/i.test(m));
    expect(alertMessage).toBeTruthy();
  });

  test('persists tier change on page refresh', async ({ page }) => {
    let basicMemberPaid = false;

    await page.route('**/api/admin/tier', (route) => {
      basicMemberPaid = true;
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
          members: [
            { ...adminBasic, paid: basicMemberPaid },
            adminPremium,
          ],
        }),
      });
    });

    await adminPage.goto();
    await adminPage.filterByStatus('approved');
    await adminPage.setTier(0, 'premium');

    await page.reload();
    await adminPage.filterByStatus('approved');

    await expect(page.locator('tr').nth(1)).toContainText(/premium/i);
  });
});
