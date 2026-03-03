import { Page, Locator } from '@playwright/test';
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
    this.matchResults = page.locator('[data-testid="match-results"]');
    this.connectButton = page.getByRole('button', { name: /connect|request introduction/i });
    this.tierLimitMessage = page.locator('[data-testid="tier-limit"]');
  }

  async goto() {
    await this.navigate('/request');
  }

  async submitRequest(purpose: string) {
    await this.purposeTextarea.fill(purpose);
    await this.submitButton.click();
  }

  async connectWithMatch(index: number = 0) {
    await this.connectButton.nth(index).click();
  }
}
