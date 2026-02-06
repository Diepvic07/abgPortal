import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly googleButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel(/email/i);
    this.submitButton = page.getByRole('button', { name: /send|sign in|magic/i });
    this.googleButton = page.getByRole('button', { name: /google/i });
    this.errorMessage = page.locator('[role="alert"]');
  }

  async goto() {
    await this.navigate('/login');
  }

  async requestMagicLink(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async clickGoogleSignIn() {
    await this.googleButton.click();
  }
}
