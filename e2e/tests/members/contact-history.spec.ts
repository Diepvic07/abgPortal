import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

const contactRequests = [
  {
    id: 'cr-1',
    requester_id: 'self',
    target_id: 'mem-1',
    message: 'Hi, would like to connect!',
    status: 'pending',
    token: 'tok-1',
    created_at: '2026-02-10T10:00:00Z',
    direction: 'sent',
    other_name: 'Alice Nguyen',
    other_avatar: null,
  },
  {
    id: 'cr-2',
    requester_id: 'self',
    target_id: 'mem-2',
    message: 'Interested in collaboration.',
    status: 'accepted',
    token: 'tok-2',
    created_at: '2026-02-08T14:00:00Z',
    responded_at: '2026-02-09T09:00:00Z',
    direction: 'sent',
    other_name: 'Bob Tran',
    other_avatar: null,
  },
  {
    id: 'cr-3',
    requester_id: 'mem-3',
    target_id: 'self',
    message: 'Xin chao! Toi muon ket noi.',
    status: 'declined',
    token: 'tok-3',
    created_at: '2026-02-05T08:00:00Z',
    responded_at: '2026-02-06T11:00:00Z',
    direction: 'received',
    other_name: 'Carol Le',
    other_avatar: null,
  },
];

test.describe('Contact History', () => {
  const member = createTestMember({ tier: 'premium' });

  test.beforeEach(async ({ page, context }) => {
    await setupE2EAuth(page, context, { id: member.id, email: member.email, name: member.name, tier: 'premium' });

    await page.route('**/api/history**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, requests: [], love_matches: [] }),
      });
    });

    await page.route('**/api/contact/list', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ requests: contactRequests }),
      });
    });

    await setupAllMocks(page, {});
  });

  test('shows Contacts tab in history navigation', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByRole('button', { name: /contacts/i })).toBeVisible({ timeout: 10000 });
  });

  test('displays sent contact requests with status badges', async ({ page }) => {
    await page.goto('/history');
    await page.getByRole('button', { name: /contacts/i }).click();

    await expect(page.getByText('Alice Nguyen')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Bob Tran')).toBeVisible();
    // Status badges
    await expect(page.getByText(/pending/i).first()).toBeVisible();
    await expect(page.getByText(/accepted/i).first()).toBeVisible();
  });

  test('displays received contact requests', async ({ page }) => {
    await page.goto('/history');
    await page.getByRole('button', { name: /contacts/i }).click();

    await expect(page.getByText('Carol Le')).toBeVisible({ timeout: 10000 });
  });

  test('shows empty state when no contact requests', async ({ page }) => {
    await page.route('**/api/contact/list', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ requests: [] }),
      });
    });

    await page.goto('/history');
    await page.getByRole('button', { name: /contacts/i }).click();

    await expect(page.getByText(/no contact requests/i)).toBeVisible({ timeout: 10000 });
  });

  test('shows accepted request with member details', async ({ page }) => {
    await page.goto('/history');
    await page.getByRole('button', { name: /contacts/i }).click();

    await expect(page.getByText('Bob Tran')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/accepted/i).first()).toBeVisible();
  });
});
