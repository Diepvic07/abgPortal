import { test, expect } from '@playwright/test';
import { OnboardPage } from '../../pages/onboard.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { clearCapturedEmails } from '../../mocks/resend.mock';

test.describe('Profile Completion', () => {
  let onboardPage: OnboardPage;

  test.beforeEach(async ({ page, context }) => {
    onboardPage = new OnboardPage(page);
    const member = createTestMember();
    clearCapturedEmails();

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

    await setupAllMocks(page, { resend: { captureEmails: true } });
  });

  test('completes profile with all fields', async ({ page }) => {
    await page.route('**/api/onboard', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await onboardPage.goto();
    await onboardPage.fillProfile({
      bio: 'I am a passionate professional seeking meaningful connections.',
      industry: 'Technology',
    });
    await onboardPage.complete();

    await expect(page).toHaveURL(/request|profile|dashboard/);
  });

  test('validates required bio field', async ({ page }) => {
    await onboardPage.goto();
    await onboardPage.fillProfile({ industry: 'Technology' });
    await onboardPage.bioTextarea.fill('');
    await onboardPage.complete();

    await expect(page.getByText(/bio.*required/i)).toBeVisible();
  });

  test('validates minimum bio length', async ({ page }) => {
    await onboardPage.goto();
    await onboardPage.fillProfile({
      bio: 'Too short',
      industry: 'Technology',
    });
    await onboardPage.complete();

    await expect(page.getByText(/minimum|characters|longer/i)).toBeVisible();
  });

  test('shows success message after completion', async ({ page }) => {
    await page.route('**/api/onboard', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await onboardPage.goto();
    await onboardPage.fillProfile({
      bio: 'A comprehensive bio that meets the minimum length requirement for the platform.',
      industry: 'Finance',
    });
    await onboardPage.complete();

    await expect(page.getByText(/success|complete|welcome/i)).toBeVisible();
  });

  test('handles API error gracefully', async ({ page }) => {
    await page.route('**/api/onboard', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await onboardPage.goto();
    await onboardPage.fillProfile({
      bio: 'Valid bio content that should work fine.',
      industry: 'Healthcare',
    });
    await onboardPage.complete();

    await expect(page.getByText(/error|failed|try again/i)).toBeVisible();
  });

  test('prevents double submission', async ({ page }) => {
    let submitCount = 0;

    await page.route('**/api/onboard', async (route) => {
      submitCount++;
      await new Promise((r) => setTimeout(r, 1000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await onboardPage.goto();
    await onboardPage.fillProfile({
      bio: 'Valid bio for testing double submission prevention.',
      industry: 'Education',
    });

    await onboardPage.submitButton.click();
    await onboardPage.submitButton.click();
    await onboardPage.submitButton.click();

    await page.waitForURL(/request|profile/, { timeout: 5000 });

    expect(submitCount).toBe(1);
  });
});
