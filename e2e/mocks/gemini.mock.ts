import { Page } from '@playwright/test';
import { setupErrorMock } from './index';
import { TestMember, mockGeminiResponses } from '../fixtures/test-data';

const GEMINI_API_PATTERN = '**/generativelanguage.googleapis.com/**';

export interface GeminiMockConfig {
  bioText?: string;
  matchMembers?: TestMember[];
  streamResponse?: boolean;
}

export async function mockGeminiAPI(page: Page, config: GeminiMockConfig = {}) {
  const {
    bioText = 'A dynamic professional with expertise in building scalable systems.',
    matchMembers = [],
  } = config;

  await page.route(GEMINI_API_PATTERN, async (route) => {
    const requestBody = route.request().postDataJSON();
    const prompt = requestBody?.contents?.[0]?.parts?.[0]?.text || '';

    // Detect request type from prompt content
    if (prompt.toLowerCase().includes('bio') || prompt.toLowerCase().includes('profile')) {
      // Bio generation request
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: bioText }],
              },
            },
          ],
        }),
      });
    }

    if (prompt.toLowerCase().includes('match') || prompt.toLowerCase().includes('connect')) {
      // Matching request
      const matchResult = matchMembers.slice(0, 3).map((m, i) => ({
        id: m.id,
        name: m.name,
        score: 0.95 - i * 0.05,
        reason: `Strong match based on ${m.industry} experience.`,
      }));

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(matchResult) }],
              },
            },
          ],
        }),
      });
    }

    // Default response
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockGeminiResponses.generatedBio),
    });
  });
}

export async function mockGeminiQuotaExceeded(page: Page) {
  await setupErrorMock(page, GEMINI_API_PATTERN, 429, 'Quota exceeded');
}

export async function mockGeminiTimeout(page: Page) {
  await page.route(GEMINI_API_PATTERN, async (route) => {
    await new Promise((r) => setTimeout(r, 30000)); // 30s delay
    route.abort('timedout');
  });
}

export async function mockGeminiInvalidResponse(page: Page) {
  await page.route(GEMINI_API_PATTERN, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ invalid: 'response structure' }),
    });
  });
}
