import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember, createPendingMember } from '../../fixtures/test-data';

test.describe('Complete User Journeys', () => {
  test.describe('Returning Member Journey', () => {
    test('login -> request -> view matches -> connect -> history', async ({ page, context }) => {
      const member = createTestMember();
      const matches = [
        createTestMember({ id: 'match-1', name: 'Match Alice' }),
        createTestMember({ id: 'match-2', name: 'Match Bob' }),
      ];

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
            user: { id: member.id, email: member.email, tier: 'premium' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });

      await setupAllMocks(page, { members: matches });

      // Step 1: Go to request page (already logged in)
      await page.goto('/request');
      await expect(page).toHaveURL(/request/);

      // Step 2: Submit request
      await page.route('**/api/request', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            matches: matches.map((m, i) => ({
              id: m.id,
              name: m.name,
              score: 0.95 - i * 0.1,
            })),
          }),
        });
      });

      await page.getByLabel(/purpose|reason/i).fill('Looking for mentorship.');
      await page.getByRole('button', { name: /find|match/i }).click();

      // Step 3: View matches
      await expect(page.getByText('Match Alice')).toBeVisible();
      await expect(page.getByText('Match Bob')).toBeVisible();

      // Step 4: Connect with match
      await page.route('**/api/connect', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await page.getByRole('button', { name: /connect/i }).first().click();
      await expect(page.getByText(/sent|success/i)).toBeVisible();

      // Step 5: View history
      await page.route('**/api/history', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            requests: [
              {
                id: '1',
                purpose: 'Looking for mentorship.',
                status: 'pending',
                createdAt: new Date().toISOString(),
                matchedMember: { name: 'Match Alice' },
              },
            ],
          }),
        });
      });

      await page.goto('/history');
      await expect(page.getByText('Looking for mentorship')).toBeVisible();
      await expect(page.getByText('Match Alice')).toBeVisible();
    });
  });

  test.describe('Profile Update Journey', () => {
    test('profile -> edit -> save -> verify changes', async ({ page, context }) => {
      const member = createTestMember({ bio: 'Original bio' });
      let currentBio = member.bio;

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
            user: { id: member.id, email: member.email },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });

      await page.route('**/api/profile', (route) => {
        if (route.request().method() === 'PATCH') {
          const body = route.request().postDataJSON();
          currentBio = body.bio || currentBio;
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ...member, bio: currentBio }),
          });
        }
      });

      await setupAllMocks(page, {});

      // Step 1: View profile
      await page.goto('/profile');
      await expect(page.getByText('Original bio')).toBeVisible();

      // Step 2: Edit profile
      await page.getByRole('button', { name: /edit/i }).click();
      await page.getByLabel(/bio/i).fill('Updated professional bio.');
      await page.getByRole('button', { name: /save/i }).click();

      // Step 3: Verify changes persist
      await expect(page.getByText(/saved|success/i)).toBeVisible();
      await page.reload();
      await expect(page.getByText('Updated professional bio')).toBeVisible();
    });
  });
});
