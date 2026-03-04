import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class RequestPage extends BasePage {
  readonly purposeTextarea: Locator;
  readonly submitButton: Locator;
  readonly matchResults: Locator;
  readonly connectButton: Locator;
  readonly tierLimitMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.purposeTextarea = page.locator('textarea[name="request_text"]');
    this.submitButton = page.locator('form button[type="submit"]');
    // MatchResultsDisplay renders match cards as div.cursor-pointer inside div.space-y-4
    this.matchResults = page.locator('div.space-y-4').filter({ has: page.locator('div.cursor-pointer') });
    // Connect button: "Request Introduction" (non-love) or "Send Love Match Request" (love)
    this.connectButton = page.getByRole('button', { name: /request intro|connect|send love/i });
    // Tier limit message: shown as FakeResultsPaywall when 403 returned
    this.tierLimitMessage = page.getByText(/upgrade to premium|limit reached/i);
  }

  async goto() {
    await this.navigate('/request');
    // Wait for session to resolve: form becomes visible (not loading spinner)
    await expect(this.purposeTextarea).toBeVisible({ timeout: 10000 });
  }

  async submitRequest(purpose: string) {
    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
    await this.purposeTextarea.fill(purpose);
    await this.submitButton.click();
  }

  async connectWithMatch(index: number = 0) {
    await this.connectButton.nth(index).click();
  }
}
