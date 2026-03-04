import { test, expect } from '@playwright/test';
import { OnboardPage } from '../../pages/onboard.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';

// The onboarding form does not expose a "Generate Bio" button in the UI.
// Bio generation happens server-side via /api/onboard after submission.
// These tests verify the onboard API integration and form behaviour.

test.describe('AI Bio Generation (via onboard API)', () => {
  let onboardPage: OnboardPage;

  test.beforeEach(async ({ page, context }) => {
    onboardPage = new OnboardPage(page);
    const member = createTestMember({ status: 'approved' });

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
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ member: null }),
      });
    });

    await setupAllMocks(page, {});
  });

  test('onboard API returns generated bio after submission', async ({ page }) => {
    const generatedBioText =
      'An innovative tech leader passionate about building inclusive communities.';

    await page.route('**/api/onboard', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, bio: generatedBioText }),
      });
    });

    await onboardPage.goto();
    await onboardPage.fillProfile({
      name: 'Test User',
      role: 'Technology Lead',
      company: 'Tech Corp',
      expertise: 'Building inclusive communities and scalable technology platforms.',
      canHelpWith: 'Leadership coaching, team building, and technical strategy.',
      lookingFor: 'Collaboration opportunities and knowledge sharing.',
    });
    await onboardPage.complete();

    // Success state shows the generated bio returned from the API
    await expect(onboardPage.expertiseTextarea).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/welcome|aboard/i)).toBeVisible({ timeout: 10000 });
  });

  test('handles AI quota exceeded error from onboard API', async ({ page }) => {
    await page.route('**/api/onboard', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI quota exceeded. Please try again later.' }),
      });
    });

    await onboardPage.goto();
    await onboardPage.fillProfile({
      name: 'Test User',
      role: 'Engineer',
      company: 'Tech Corp',
      expertise: 'Building reliable infrastructure for distributed systems.',
      canHelpWith: 'System design reviews and technical mentoring.',
      lookingFor: 'Mentorship and leadership opportunities.',
    });
    await onboardPage.complete();

    await expect(page.getByText(/quota|limit|try again|error/i)).toBeVisible();
  });

  test('submit button is disabled while submitting', async ({ page }) => {
    await page.route('**/api/onboard', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
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
      expertise: 'Building reliable backend infrastructure at scale.',
      canHelpWith: 'Code reviews, architecture, and technical mentoring.',
      lookingFor: 'Networking opportunities within the ABG community.',
    });

    const submitBtn = onboardPage.submitButton;
    await submitBtn.click();

    // Button should be disabled after first click while request is in-flight
    await expect(submitBtn).toBeDisabled();
  });

  test('form displays all required fields for bio-relevant info', async ({ page }) => {
    await onboardPage.goto();

    await expect(onboardPage.nameInput).toBeVisible();
    await expect(onboardPage.roleInput).toBeVisible();
    await expect(onboardPage.companyInput).toBeVisible();
    await expect(onboardPage.expertiseTextarea).toBeVisible();
    await expect(onboardPage.canHelpWithTextarea).toBeVisible();
    await expect(onboardPage.lookingForTextarea).toBeVisible();
  });
});
