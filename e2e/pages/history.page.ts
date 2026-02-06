import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class HistoryPage extends BasePage {
  readonly historyItems: Locator;
  readonly emptyState: Locator;
  readonly newRequestLink: Locator;

  constructor(page: Page) {
    super(page);
    this.historyItems = page.locator('[data-testid="history-item"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');
    this.newRequestLink = page.getByRole('link', { name: /new request|get started/i });
  }

  async goto() {
    await this.navigate('/history');
  }

  async getItemCount() {
    return this.historyItems.count();
  }

  async expandDetails(index: number = 0) {
    const expandButton = this.historyItems.nth(index).locator('[data-testid="expand-details"]');
    if (await expandButton.isVisible()) {
      await expandButton.click();
    }
  }
}
