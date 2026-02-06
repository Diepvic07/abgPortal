import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ProfilePage extends BasePage {
  readonly nameDisplay: Locator;
  readonly emailDisplay: Locator;
  readonly bioDisplay: Locator;
  readonly editButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly nameInput: Locator;
  readonly bioInput: Locator;
  readonly tierBadge: Locator;

  constructor(page: Page) {
    super(page);
    this.nameDisplay = page.locator('[data-testid="profile-name"]');
    this.emailDisplay = page.locator('[data-testid="profile-email"]');
    this.bioDisplay = page.locator('[data-testid="profile-bio"]');
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.saveButton = page.getByRole('button', { name: /save/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.nameInput = page.getByLabel(/name/i);
    this.bioInput = page.getByLabel(/bio/i);
    this.tierBadge = page.locator('[data-testid="tier-badge"]');
  }

  async goto() {
    await this.navigate('/profile');
  }

  async enterEditMode() {
    await this.editButton.click();
  }

  async saveChanges() {
    await this.saveButton.click();
  }

  async cancelEdit() {
    await this.cancelButton.click();
  }

  async updateProfile(data: { name?: string; bio?: string }) {
    if (data.name) await this.nameInput.fill(data.name);
    if (data.bio) await this.bioInput.fill(data.bio);
  }
}
