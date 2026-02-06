import { test, expect } from '@playwright/test';
import { OnboardPage } from '../../pages/onboard.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { mockGeminiAPI, mockGeminiQuotaExceeded } from '../../mocks/gemini.mock';
import { createTestMember } from '../../fixtures/test-data';

test.describe('AI Bio Generation', () => {
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
  });

  test('generates AI bio from text input', async ({ page }) => {
    await mockGeminiAPI(page, {
      bioText: 'An innovative tech leader passionate about building inclusive communities.',
    });
    await setupAllMocks(page, {});

    await onboardPage.goto();
    await onboardPage.fillProfile({ industry: 'Technology' });
    await onboardPage.generateAIBio();

    await expect(onboardPage.generatedBio).toContainText(/innovative|tech|leader/i);
  });

  test('allows editing generated bio', async ({ page }) => {
    await mockGeminiAPI(page, { bioText: 'Generated bio text here.' });
    await setupAllMocks(page, {});

    await onboardPage.goto();
    await onboardPage.generateAIBio();

    await expect(onboardPage.bioTextarea).toHaveValue(/Generated bio/);

    await onboardPage.bioTextarea.fill('My custom edited bio.');
    await expect(onboardPage.bioTextarea).toHaveValue('My custom edited bio.');
  });

  test('handles AI quota exceeded error', async ({ page }) => {
    await mockGeminiQuotaExceeded(page);
    await setupAllMocks(page, {});

    await onboardPage.goto();
    await onboardPage.generateAIBio();

    await expect(page.getByText(/quota|limit|try again/i)).toBeVisible();
  });

  test('disables generate button while loading', async ({ page }) => {
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Bio' }] } }],
        }),
      });
    });

    await setupAllMocks(page, {});
    await onboardPage.goto();

    const generateBtn = onboardPage.generateBioButton;
    await generateBtn.click();

    await expect(generateBtn).toBeDisabled();
  });
});
