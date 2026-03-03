import { test, expect } from '@playwright/test';
import { RequestPage } from '../../pages/request.page';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createTestMember } from '../../fixtures/test-data';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

const MATCH_RESPONSE = {
  success: true,
  request_id: 'req-123',
  matches: [
    {
      id: 'm1',
      reason: 'Great match for tech',
      match_score: 95,
      member: {
        id: 'm1',
        name: 'Alice Chen',
        role: 'Engineer',
        company: 'TechCo',
        bio: 'Experienced engineer',
        expertise: 'JS,React',
      },
    },
  ],
};

test.describe('Custom Intro Text', () => {
  let requestPage: RequestPage;

  test.beforeEach(async ({ page, context }) => {
    requestPage = new RequestPage(page);
    const currentUser = createTestMember({ tier: 'premium' });

    await setupE2EAuth(page, context, {
      id: currentUser.id,
      email: currentUser.email,
      tier: 'premium',
    });

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MATCH_RESPONSE),
      });
    });

    await setupAllMocks(page, {});
  });

  test('shows custom intro textarea on connect', async ({ page }) => {
    await requestPage.goto();
    await requestPage.submitRequest('Looking for a tech mentor in engineering leadership.');

    // Click on the first match card to select it
    const matchCard = page.locator('[class*="cursor-pointer"]').first();
    await matchCard.click();

    // The "Add a personal introduction message" link should appear
    const introLink = page.getByText('Add a personal introduction message (optional)');
    await expect(introLink).toBeVisible();

    // Click the link to reveal the textarea
    await introLink.click();

    // Textarea with the expected placeholder should be visible
    const textarea = page.getByPlaceholder('Write a personal message to introduce yourself...');
    await expect(textarea).toBeVisible();
  });

  test('sends custom intro text with connect', async ({ page }) => {
    let capturedBody: Record<string, unknown> = {};

    await page.route('**/api/connect', async (route) => {
      const request = route.request();
      capturedBody = JSON.parse(request.postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Connection request sent' }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for a tech mentor in engineering leadership.');

    // Select match card
    const matchCard = page.locator('[class*="cursor-pointer"]').first();
    await matchCard.click();

    // Open intro textarea
    await page.getByText('Add a personal introduction message (optional)').click();

    // Type intro message
    const introMessage = "Hello! I'd love to connect and discuss tech opportunities.";
    await page.getByPlaceholder('Write a personal message to introduce yourself...').fill(introMessage);

    // Click the connect button (first button in action row, not "Run Again")
    const connectButton = page.locator('.flex.gap-3 > button').first();
    await connectButton.click();

    // Verify custom_intro_text was included in the request body
    await expect.poll(() => capturedBody.custom_intro_text).toBe(introMessage);
  });

  test('skips custom intro when not entered', async ({ page }) => {
    let capturedBody: Record<string, unknown> = {};

    await page.route('**/api/connect', async (route) => {
      const request = route.request();
      capturedBody = JSON.parse(request.postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Connection request sent' }),
      });
    });

    await requestPage.goto();
    await requestPage.submitRequest('Looking for a tech mentor in engineering leadership.');

    // Select match card without opening intro textarea
    const matchCard = page.locator('[class*="cursor-pointer"]').first();
    await matchCard.click();

    // Click the connect button without adding any intro
    const connectButton = page.locator('.flex.gap-3 > button').first();
    await connectButton.click();

    // custom_intro_text should be undefined (not present in body)
    await expect.poll(() => capturedBody.custom_intro_text).toBeUndefined();
  });

  test('enforces 500 character limit on intro text', async ({ page }) => {
    await requestPage.goto();
    await requestPage.submitRequest('Looking for a tech mentor in engineering leadership.');

    // Select match card
    const matchCard = page.locator('[class*="cursor-pointer"]').first();
    await matchCard.click();

    // Open intro textarea
    await page.getByText('Add a personal introduction message (optional)').click();

    const textarea = page.getByPlaceholder('Write a personal message to introduce yourself...');

    // Type 600 characters (exceeds the 500 char limit)
    const longText = 'A'.repeat(600);
    await textarea.fill(longText);

    // The counter should show "500/500" because value is sliced at 500
    const counter = page.locator('p.text-xs.text-right');
    await expect(counter).toHaveText('500/500');
  });
});
