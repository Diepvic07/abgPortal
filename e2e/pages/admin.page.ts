import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class AdminPage extends BasePage {
  readonly memberTable: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly searchInput: Locator;
  readonly pendingTab: Locator;
  readonly approvedTab: Locator;

  constructor(page: Page) {
    super(page);
    this.memberTable = page.locator('table');
    this.approveButton = page.getByText('Approve');
    this.rejectButton = page.getByText('Reject');
    this.searchInput = page.getByPlaceholder(/search/i);
    this.pendingTab = page.getByRole('button', { name: /pending/i });
    this.approvedTab = page.getByRole('button', { name: /member status/i });
  }

  async goto() {
    await this.navigate('/admin');
  }

  async approveMember(rowIndex: number = 0) {
    await this.memberTable
      .locator('tr')
      .nth(rowIndex + 1)
      .getByText('Approve')
      .click();
  }

  async rejectMember(rowIndex: number = 0) {
    await this.memberTable
      .locator('tr')
      .nth(rowIndex + 1)
      .getByText('Reject')
      .click();
  }

  async setTier(rowIndex: number, tier: 'basic' | 'premium') {
    const row = this.memberTable.locator('tr').nth(rowIndex + 1);
    if (tier === 'premium') {
      // Upgrading triggers two sequential window.prompt() dialogs
      // Set up a handler that auto-accepts both prompts
      const dialogHandler = async (dialog: import('@playwright/test').Dialog) => {
        if (dialog.type() === 'prompt') {
          const isAmount = dialog.message().toLowerCase().includes('amount');
          await dialog.accept(isAmount ? '500000' : 'Test upgrade');
        } else {
          await dialog.accept();
        }
      };
      this.page.on('dialog', dialogHandler);
      await row.getByText('Upgrade').click();
      // Wait for API call to complete and page to refresh
      await this.page.waitForTimeout(500);
      this.page.removeListener('dialog', dialogHandler);
    } else {
      await row.getByText('Downgrade').click();
    }
  }

  async searchMembers(query: string) {
    await this.searchInput.fill(query);
  }

  async filterByStatus(status: 'pending' | 'approved') {
    if (status === 'pending') await this.pendingTab.click();
    else await this.approvedTab.click();
  }
}
