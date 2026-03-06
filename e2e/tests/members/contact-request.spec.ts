import { test, expect } from '@playwright/test';
import { MembersPage } from '../../pages/members.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

const proResults = [
  { id: 'target-1', name: 'Alice Nguyen', avatar_url: null, role: 'Engineer', company: 'TechCo', expertise: 'React', bio: 'Dev.' },
];

test.describe('Contact Request Flow', () => {
  let membersPage: MembersPage;

  test.describe('premium user', () => {
    const viewer = createTestMember({ tier: 'premium' });

    test.beforeEach(async ({ page, context }) => {
      membersPage = new MembersPage(page);
      await setupE2EAuth(page, context, { id: viewer.id, email: viewer.email, tier: 'premium' });
      await setupAllMocks(page, {});

      await page.route('**/api/search/members', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: proResults, total: 1, tier: 'premium', search_quota: { remaining: null, limit: null } }),
        });
      });
    });

    test('opens contact modal with default Vietnamese message', async ({ page }) => {
      await page.route('**/api/contact/request', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, requestId: 'req-1' }) });
      });

      await membersPage.goto();
      await membersPage.search('Alice');
      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      await membersPage.clickContact(0);

      // Modal should appear with default message in textarea
      await expect(page.locator('textarea[placeholder="Write a message..."]')).toBeVisible({ timeout: 5000 });
      const messageValue = await page.locator('textarea[placeholder="Write a message..."]').inputValue();
      expect(messageValue).toContain('Xin ch');
    });

    test('allows editing the message', async ({ page }) => {
      await membersPage.goto();
      await membersPage.search('Alice');
      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      await membersPage.clickContact(0);

      const textarea = page.locator('textarea[placeholder="Write a message..."]');
      await expect(textarea).toBeVisible({ timeout: 5000 });
      await textarea.fill('Custom message for Alice');
      await expect(textarea).toHaveValue('Custom message for Alice');
    });

    test('sends contact request via POST /api/contact/request', async ({ page }) => {
      let capturedBody: Record<string, unknown> | null = null;

      await page.route('**/api/contact/request', async (route) => {
        capturedBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, requestId: 'req-1' }),
        });
      });

      await membersPage.goto();
      await membersPage.search('Alice');
      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      await membersPage.clickContact(0);

      await expect(page.locator('textarea[placeholder="Write a message..."]')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /send request/i }).click();

      // Verify API was called with correct body
      await expect(() => {
        expect(capturedBody).toMatchObject({ targetId: 'target-1' });
      }).toPass({ timeout: 5000 });
    });

    test('shows success confirmation after sending', async ({ page }) => {
      await page.route('**/api/contact/request', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, requestId: 'req-1' }),
        });
      });

      await membersPage.goto();
      await membersPage.search('Alice');
      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      await membersPage.clickContact(0);

      await expect(page.locator('textarea[placeholder="Write a message..."]')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /send request/i }).click();

      await expect(page.getByText(/request sent/i)).toBeVisible({ timeout: 10000 });
    });

    test('handles duplicate request error', async ({ page }) => {
      await page.route('**/api/contact/request', (route) => {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'You already have a pending request to this member' }),
        });
      });

      await membersPage.goto();
      await membersPage.search('Alice');
      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      await membersPage.clickContact(0);

      await expect(page.locator('textarea[placeholder="Write a message..."]')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /send request/i }).click();

      await expect(page.getByText(/already.*pending/i)).toBeVisible({ timeout: 10000 });
    });

    test('handles daily limit exceeded (10/day)', async ({ page }) => {
      await page.route('**/api/contact/request', (route) => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Daily contact request limit reached (10/day)' }),
        });
      });

      await membersPage.goto();
      await membersPage.search('Alice');
      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      await membersPage.clickContact(0);

      await expect(page.locator('textarea[placeholder="Write a message..."]')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /send request/i }).click();

      await expect(page.getByText(/daily.*limit|10\/day/i)).toBeVisible({ timeout: 10000 });
    });

    test('handles API error on send', async ({ page }) => {
      await page.route('**/api/contact/request', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to send contact request' }),
        });
      });

      await membersPage.goto();
      await membersPage.search('Alice');
      await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
      await membersPage.clickContact(0);

      await expect(page.locator('textarea[placeholder="Write a message..."]')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /send request/i }).click();

      await expect(page.locator('div.bg-red-50')).toBeVisible({ timeout: 10000 });
    });
  });

  test('blocks basic tier from sending contact requests', async ({ page, context }) => {
    const basicUser = createTestMember({ tier: 'basic' });
    membersPage = new MembersPage(page);
    await setupE2EAuth(page, context, { id: basicUser.id, email: basicUser.email, tier: 'basic' });
    await setupAllMocks(page, {});

    await page.route('**/api/search/members', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ id: 'target-1', name: 'Alice Nguyen', avatar_url: null }],
          total: 1,
          tier: 'basic',
          search_quota: { remaining: 9, limit: 10 },
        }),
      });
    });

    await membersPage.goto();
    await membersPage.search('Alice');
    await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });

    // Basic users see upgrade CTA instead of contact button
    await expect(page.getByText(/upgrade to pro to contact/i)).toBeVisible();
    await expect(membersPage.contactButton).not.toBeVisible();
  });
});
