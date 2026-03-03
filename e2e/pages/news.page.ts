import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class NewsPage extends BasePage {
  readonly grid: Locator;
  readonly articleCards: Locator;
  readonly categoryButtons: Locator;
  readonly emptyState: Locator;
  readonly loadMoreButton: Locator;

  constructor(page: Page) {
    super(page);
    this.grid = page.locator('.grid');
    this.articleCards = page.locator('a[href^="/news/"]');
    this.categoryButtons = page.locator('button').filter({ hasText: /All|Edu|Business|Event|Course|Announcement/ });
    this.emptyState = page.getByText('No articles found');
    this.loadMoreButton = page.getByRole('button', { name: /load more/i });
  }

  async goto(category?: string) {
    const path = category ? `/news?category=${category}` : '/news';
    await this.navigate(path);
  }

  async filterByCategory(category: string) {
    await this.page.getByRole('button', { name: category, exact: true }).click();
  }

  async clickArticle(index: number = 0) {
    await this.articleCards.nth(index).click();
  }
}
