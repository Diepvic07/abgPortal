import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

test.describe('Profile Management', () => {
  const member = createTestMember({
    name: 'Jane Doe',
    bio: 'Experienced tech leader.',
    industry: 'Technology',
    chapter: 'San Francisco',
  });

  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'test-session',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: member.id, email: member.email, name: member.name },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.route('**/api/profile', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(member),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });

    await setupAllMocks(page, {});
  });

  test('displays profile information', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByText(member.name)).toBeVisible();
    await expect(page.getByText(member.email)).toBeVisible();
    await expect(page.getByText(member.bio)).toBeVisible();
  });

  test('enters edit mode', async ({ page }) => {
    await page.goto('/profile');

    await page.getByRole('button', { name: /edit/i }).click();
    await expect(page.getByLabel(/name/i)).toBeEditable();
    await expect(page.getByLabel(/bio/i)).toBeEditable();
  });

  test('saves profile changes', async ({ page }) => {
    await page.route('**/api/profile', (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(member),
        });
      }
    });

    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();

    await page.getByLabel(/bio/i).fill('Updated bio with new information.');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/saved|updated|success/i)).toBeVisible();
  });

  test('cancels edit without saving', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();

    await page.getByLabel(/bio/i).fill('This change will be cancelled.');
    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(page.getByText(member.bio)).toBeVisible();
  });

  test('validates required fields on save', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();

    await page.getByLabel(/name/i).fill('');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/required|name/i)).toBeVisible();
  });

  test('shows tier badge', async ({ page }) => {
    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...member, tier: 'premium' }),
      });
    });

    await page.goto('/profile');
    await expect(page.getByText(/premium/i)).toBeVisible();
  });
});
