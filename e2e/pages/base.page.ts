import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly spinner: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.spinner = page.locator('[data-testid="spinner"]');
    this.toast = page.locator('[role="alert"]');
  }

  async navigate(path: string) {
    await this.page.goto(path);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async expectToastMessage(text: string) {
    await expect(this.toast).toContainText(text);
  }

  async expectSpinnerHidden() {
    await expect(this.spinner).toBeHidden();
  }

  async expectUrl(path: string) {
    await expect(this.page).toHaveURL(new RegExp(path));
  }
}
