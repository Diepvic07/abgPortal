import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class MembersPage extends BasePage {
  readonly searchInput: Locator;
  readonly filterName: Locator;
  readonly filterCompany: Locator;
  readonly filterExpertise: Locator;
  readonly filterClass: Locator;
  readonly searchButton: Locator;
  readonly resultCards: Locator;
  readonly contactButton: Locator;
  readonly upgradeCTA: Locator;
  readonly quotaDisplay: Locator;
  readonly noResults: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('input[placeholder="Search members..."]');
    this.filterName = page.locator('input[placeholder="Name"]');
    this.filterCompany = page.locator('input[placeholder="Company"]');
    this.filterExpertise = page.locator('input[placeholder="Expertise"]');
    this.filterClass = page.locator('input[placeholder="ABG Class"]');
    this.searchButton = page.getByRole('button', { name: /search/i });
    this.resultCards = page.locator('div.border.border-gray-200.rounded-xl.p-4');
    this.contactButton = page.getByRole('button', { name: 'Contact Member' });
    this.upgradeCTA = page.getByText(/upgrade to pro/i);
    this.quotaDisplay = page.getByText(/searches remaining|search limit/i);
    this.noResults = page.getByText('No members found');
    this.errorMessage = page.locator('div.bg-red-50');
  }

  async goto() {
    await this.navigate('/members');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
  }

  async applyFilters(filters: {
    name?: string;
    company?: string;
    expertise?: string;
    abgClass?: string;
  }) {
    if (filters.name) await this.filterName.fill(filters.name);
    if (filters.company) await this.filterCompany.fill(filters.company);
    if (filters.expertise) await this.filterExpertise.fill(filters.expertise);
    if (filters.abgClass) await this.filterClass.fill(filters.abgClass);
    await this.searchButton.click();
  }

  async clickContact(index: number = 0) {
    await this.resultCards.nth(index).getByText('Contact Member').click();
  }

  async getResultCount() {
    return this.resultCards.count();
  }
}
