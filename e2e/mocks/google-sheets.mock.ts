import { Page } from '@playwright/test';
import { setupErrorMock } from './index';
import { TestMember, TestNewsArticle, TestLoveMatchRequest, mockSheetResponses } from '../fixtures/test-data';

const SHEETS_API_PATTERN = '**/sheets.googleapis.com/**';

export interface SheetsMockConfig {
  members?: TestMember[];
  requests?: object[];
  newsArticles?: TestNewsArticle[];
  loveMatchRequests?: TestLoveMatchRequest[];
  emptySheet?: boolean;
}

export async function mockGoogleSheets(page: Page, config: SheetsMockConfig = {}) {
  const { members = [], newsArticles = [], loveMatchRequests = [], emptySheet = false } = config;

  // Mock spreadsheets.values.get (read operations)
  await page.route('**/sheets.googleapis.com/**/values/**', async (route) => {
    const url = route.request().url();

    if (emptySheet) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSheetResponses.emptySheet),
      });
    }

    if (url.includes('Members')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSheetResponses.memberList(members)),
      });
    }

    if (url.includes('News')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          values: newsArticles.map((a) => [
            a.id, a.title, a.slug, a.category, a.excerpt, a.content,
            a.image_url || '', a.author_name, a.published_date,
            a.is_published ? 'TRUE' : 'FALSE', a.is_featured ? 'TRUE' : 'FALSE',
            a.created_at,
          ]),
        }),
      });
    }

    if (url.includes('LoveMatch')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          values: loveMatchRequests.map((lm) => [
            lm.id, lm.request_id, lm.from_id, lm.to_id, lm.status,
            lm.from_profile_shared, lm.to_profile_shared || '',
            lm.viewed_at || '', lm.resolved_at || '', lm.created_at,
          ]),
        }),
      });
    }

    // Default empty response
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ values: [] }),
    });
  });

  // Mock spreadsheets.values.append (create operations)
  await page.route('**/sheets.googleapis.com/**/values/**:append', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        spreadsheetId: 'mock-sheet-id',
        updatedRange: 'Sheet1!A1:Z1',
        updatedRows: 1,
      }),
    });
  });

  // Mock spreadsheets.values.update (update operations)
  await page.route('**/sheets.googleapis.com/**/values/**:update', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        spreadsheetId: 'mock-sheet-id',
        updatedCells: 10,
      }),
    });
  });
}

export async function mockSheetsRateLimit(page: Page) {
  await setupErrorMock(page, SHEETS_API_PATTERN, 429, 'Rate limit exceeded');
}

export async function mockSheetsUnavailable(page: Page) {
  await setupErrorMock(page, SHEETS_API_PATTERN, 503, 'Service unavailable');
}

export async function mockSheetsAuthError(page: Page) {
  await setupErrorMock(page, SHEETS_API_PATTERN, 401, 'Invalid credentials');
}
