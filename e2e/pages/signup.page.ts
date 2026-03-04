import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class SignupPage extends BasePage {
  readonly nameInput: Locator;
  readonly roleInput: Locator;
  readonly companyInput: Locator;
  readonly expertiseTextarea: Locator;
  readonly submitButton: Locator;
  readonly genderSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.locator('input[name="name"]');
    this.roleInput = page.locator('input[name="role"]');
    this.companyInput = page.locator('input[name="company"]');
    this.expertiseTextarea = page.locator('textarea[name="expertise"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.genderSelect = page.locator('select[name="gender"]');
  }

  async goto() {
    await this.navigate('/signup');
    // Wait for form submit button to appear
    await expect(this.submitButton).toBeVisible({ timeout: 15000 });
  }

  async fillSignupForm(data: {
    name: string;
    email?: string;
    chapter?: string;
    role?: string;
    company?: string;
    expertise?: string;
  }) {
    await this.nameInput.fill(data.name);
    if (data.role) await this.roleInput.fill(data.role);
    if (data.company) await this.companyInput.fill(data.company);
    if (data.expertise) await this.expertiseTextarea.fill(data.expertise);

    // If authenticated (Complete Profile button), set gender to valid enum value
    // to avoid zod enum validation failure on the empty string default
    const btnText = await this.submitButton.textContent();
    if (btnText?.includes('Complete') || btnText?.includes('Profile')) {
      await this.genderSelect.selectOption('Female');
    }
  }

  async submit() {
    await this.submitButton.click();
  }
}
