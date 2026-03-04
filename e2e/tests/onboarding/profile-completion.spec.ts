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

    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
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
      name: 'Test User',
      role: 'Engineer',
      company: 'Tech Corp',
      expertise: 'Building scalable systems and mentoring teams.',
      canHelpWith: 'Technical interviews and career guidance.',
      lookingFor: 'Networking opportunities and mentorship.',
    });
    await onboardPage.complete();

    // Wait for form to be replaced by success state (form disappears)
    await expect(onboardPage.expertiseTextarea).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/welcome|aboard/i)).toBeVisible({ timeout: 10000 });
  });

  test('validates required expertise field', async ({ page }) => {
    await onboardPage.goto();
    await onboardPage.fillProfile({
      name: 'Test User',
      role: 'Engineer',
      company: 'Tech Corp',
      // expertise intentionally omitted
    });
    await onboardPage.complete();

    // Validation errors appear as .text-error elements
    await expect(page.locator('.text-error').first()).toBeVisible({ timeout: 5000 });
  });

  test('validates minimum expertise length', async ({ page }) => {
    await onboardPage.goto();
    await onboardPage.fillProfile({
      name: 'Test User',
      role: 'Engineer',
      company: 'Tech Corp',
      expertise: 'Short',
    });
    await onboardPage.complete();

    // The expertise min-length error should appear
    await expect(page.locator('.text-error').first()).toBeVisible({ timeout: 5000 });
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
      name: 'Test User',
      role: 'Software Engineer',
      company: 'Tech Corp',
      expertise: 'Building scalable backend systems for enterprise clients.',
      canHelpWith: 'Technical interviews, code review, and system design.',
      lookingFor: 'Mentorship opportunities and professional networking.',
    });
    await onboardPage.complete();

    // Wait for form to disappear and success message to appear
    await expect(onboardPage.expertiseTextarea).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/welcome|aboard/i)).toBeVisible({ timeout: 10000 });
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
      name: 'Test User',
      role: 'Engineer',
      company: 'Tech Corp',
      expertise: 'Valid expertise content that should work fine.',
      canHelpWith: 'Helping with technical challenges and mentoring.',
      lookingFor: 'Networking and collaboration opportunities.',
    });
    await onboardPage.complete();

    // Error shown in red error div at top of form
    await expect(page.locator('.text-error, [class*="bg-red"]').first()).toBeVisible({ timeout: 8000 });
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
      name: 'Test User',
      role: 'Engineer',
      company: 'Tech Corp',
      expertise: 'Valid expertise for testing double submission prevention.',
      canHelpWith: 'Technical guidance and mentoring for junior engineers.',
      lookingFor: 'Networking and collaboration with other professionals.',
    });

    await onboardPage.complete(); // first click - waits for enabled state
    await onboardPage.submitButton.click({ force: true }); // rapid second click
    await onboardPage.submitButton.click({ force: true }); // rapid third click

    await page.waitForTimeout(2000);

    expect(submitCount).toBe(1);
  });
});
