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
    this.purposeTextarea = page.getByLabel(/purpose|reason|looking for/i);
    this.submitButton = page.getByRole('button', { name: /find|match|submit/i });
    this.matchResults = page.locator('[data-testid="match-results"]');
    this.connectButton = page.getByRole('button', { name: /connect/i });
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
