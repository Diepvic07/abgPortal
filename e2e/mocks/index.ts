import { Page, Route } from '@playwright/test';

export interface MockOptions {
  delay?: number;
  status?: number;
}

export async function setupMock(
  page: Page,
  pattern: string | RegExp,
  response: object | string,
  options: MockOptions = {}
) {
  const { delay = 0, status = 200 } = options;

  await page.route(pattern, async (route: Route) => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: typeof response === 'string' ? response : JSON.stringify(response),
    });
  });
}

export async function setupErrorMock(
  page: Page,
  pattern: string | RegExp,
  status: number,
  errorMessage: string
) {
  await page.route(pattern, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: errorMessage }),
    });
  });
}

export async function setupNetworkFailure(page: Page, pattern: string | RegExp) {
  await page.route(pattern, (route) => route.abort('failed'));
}

export async function clearMocks(page: Page) {
  await page.unrouteAll();
}
