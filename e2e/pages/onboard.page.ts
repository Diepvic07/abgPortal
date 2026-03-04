import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class OnboardPage extends BasePage {
  readonly nameInput: Locator;
  readonly roleInput: Locator;
  readonly companyInput: Locator;
  readonly expertiseTextarea: Locator;
  readonly canHelpWithTextarea: Locator;
  readonly lookingForTextarea: Locator;
  readonly submitButton: Locator;
  readonly genderSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.locator('input[name="name"]');
    this.roleInput = page.locator('input[name="role"]');
    this.companyInput = page.locator('input[name="company"]');
    this.expertiseTextarea = page.locator('textarea[name="expertise"]');
    this.canHelpWithTextarea = page.locator('textarea[name="can_help_with"]');
    this.lookingForTextarea = page.locator('textarea[name="looking_for"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.genderSelect = page.locator('select[name="gender"]');
  }

  async goto() {
    await this.navigate('/onboard');
    // Wait for form to render and session/membership check to complete
    await expect(this.submitButton).toBeVisible({ timeout: 15000 });
    await expect(this.submitButton).toBeEnabled({ timeout: 15000 });
    // Set gender to a valid enum value - empty string "" fails zod enum validation
    await this.genderSelect.selectOption('Female');
  }

  async fillProfile(data: {
    name?: string;
    role?: string;
    company?: string;
    expertise?: string;
    canHelpWith?: string;
    lookingFor?: string;
    // Legacy params mapped to actual fields
    bio?: string;
    industry?: string;
  }) {
    if (data.name) await this.nameInput.fill(data.name);
    if (data.role || data.industry) await this.roleInput.fill(data.role || data.industry || '');
    if (data.company) await this.companyInput.fill(data.company);
    if (data.expertise || data.bio) {
      await this.expertiseTextarea.fill(data.expertise || data.bio || '');
    }
    if (data.canHelpWith) await this.canHelpWithTextarea.fill(data.canHelpWith);
    if (data.lookingFor) await this.lookingForTextarea.fill(data.lookingFor);
  }

  async complete() {
    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
    await this.submitButton.click();
  }
}
