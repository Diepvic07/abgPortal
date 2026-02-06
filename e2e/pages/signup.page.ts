import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class SignupPage extends BasePage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly chapterSelect: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.getByLabel(/name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.chapterSelect = page.getByLabel(/chapter/i);
    this.submitButton = page.getByRole('button', { name: /submit|apply|sign up/i });
  }

  async goto() {
    await this.navigate('/signup');
  }

  async fillSignupForm(data: { name: string; email: string; chapter?: string }) {
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    if (data.chapter) {
      await this.chapterSelect.selectOption(data.chapter);
    }
  }

  async submit() {
    await this.submitButton.click();
  }
}
