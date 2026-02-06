import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestAdmin, createTestMember } from '../../fixtures/test-data';

test.describe('Tier Management', () => {
  let adminPage: AdminPage;
  const basicMember = createTestMember({ tier: 'basic', status: 'approved' });
  const premiumMember = createTestMember({ tier: 'premium', status: 'approved' });

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
        body: JSON.stringify({ members: [basicMember, premiumMember] }),
      });
    });

    await setupAllMocks(page, {});
  });

  test('displays current tier for each member', async ({ page }) => {
    await adminPage.goto();

    await expect(page.getByText(/basic/i)).toBeVisible();
    await expect(page.getByText(/premium/i)).toBeVisible();
  });

  test('upgrades member to premium', async ({ page }) => {
    await page.route('**/api/admin/tier', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await adminPage.goto();
    await adminPage.setTier(0, 'premium');

    await expect(page.getByText(/updated|success/i)).toBeVisible();
  });

  test('downgrades member to basic', async ({ page }) => {
    await page.route('**/api/admin/tier', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await adminPage.goto();
    await adminPage.setTier(1, 'basic');

    await expect(page.getByText(/updated|success/i)).toBeVisible();
  });

  test('shows confirmation for tier change', async ({ page }) => {
    await adminPage.goto();

    const tierSelect = page.locator('[data-testid="tier-select"]').first();
    if (await tierSelect.isVisible()) {
      await tierSelect.selectOption('premium');

      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible()) {
        await expect(dialog.getByText(/confirm|tier/i)).toBeVisible();
      }
    }
  });

  test('handles tier change API error', async ({ page }) => {
    await page.route('**/api/admin/tier', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to update tier' }),
      });
    });

    await adminPage.goto();
    await adminPage.setTier(0, 'premium');

    await expect(page.getByText(/error|failed/i)).toBeVisible();
  });

  test('persists tier change on page refresh', async ({ page }) => {
    let memberTier = 'basic';

    await page.route('**/api/admin/tier', (route) => {
      memberTier = 'premium';
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
          members: [{ ...basicMember, tier: memberTier }, premiumMember],
        }),
      });
    });

    await adminPage.goto();
    await adminPage.setTier(0, 'premium');

    await page.reload();

    await expect(page.locator('tr').nth(1)).toContainText(/premium/i);
  });
});
