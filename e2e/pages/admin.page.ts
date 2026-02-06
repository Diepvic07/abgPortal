import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class AdminPage extends BasePage {
  readonly memberTable: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly tierSelect: Locator;
  readonly searchInput: Locator;
  readonly pendingTab: Locator;
  readonly approvedTab: Locator;

  constructor(page: Page) {
    super(page);
    this.memberTable = page.locator('table');
    this.approveButton = page.getByRole('button', { name: /approve/i });
    this.rejectButton = page.getByRole('button', { name: /reject/i });
    this.tierSelect = page.getByLabel(/tier/i);
    this.searchInput = page.getByPlaceholder(/search/i);
    this.pendingTab = page.getByRole('tab', { name: /pending/i });
    this.approvedTab = page.getByRole('tab', { name: /approved/i });
  }

  async goto() {
    await this.navigate('/admin');
  }

  async approveMember(rowIndex: number = 0) {
    await this.memberTable
      .locator('tr')
      .nth(rowIndex + 1)
      .getByRole('button', { name: /approve/i })
      .click();
  }

  async rejectMember(rowIndex: number = 0) {
    await this.memberTable
      .locator('tr')
      .nth(rowIndex + 1)
      .getByRole('button', { name: /reject/i })
      .click();
  }

  async setTier(rowIndex: number, tier: 'basic' | 'premium') {
    await this.memberTable
      .locator('tr')
      .nth(rowIndex + 1)
      .getByLabel(/tier/i)
      .selectOption(tier);
  }

  async searchMembers(query: string) {
    await this.searchInput.fill(query);
  }

  async filterByStatus(status: 'pending' | 'approved') {
    if (status === 'pending') await this.pendingTab.click();
    else await this.approvedTab.click();
  }
}
