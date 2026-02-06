import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class OnboardPage extends BasePage {
  readonly bioTextarea: Locator;
  readonly industrySelect: Locator;
  readonly voiceUploadButton: Locator;
  readonly generateBioButton: Locator;
  readonly submitButton: Locator;
  readonly generatedBio: Locator;

  constructor(page: Page) {
    super(page);
    this.bioTextarea = page.getByLabel(/bio/i);
    this.industrySelect = page.getByLabel(/industry/i);
    this.voiceUploadButton = page.getByRole('button', { name: /upload|record/i });
    this.generateBioButton = page.getByRole('button', { name: /generate/i });
    this.submitButton = page.getByRole('button', { name: /complete|submit|save/i });
    this.generatedBio = page.locator('[data-testid="generated-bio"]');
  }

  async goto() {
    await this.navigate('/onboard');
  }

  async fillProfile(data: { bio?: string; industry?: string }) {
    if (data.bio) await this.bioTextarea.fill(data.bio);
    if (data.industry) await this.industrySelect.selectOption(data.industry);
  }

  async generateAIBio() {
    await this.generateBioButton.click();
  }

  async complete() {
    await this.submitButton.click();
  }
}
