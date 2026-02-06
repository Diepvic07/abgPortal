import { Page } from '@playwright/test';
import { setupErrorMock } from './index';
import { v4 as uuid } from 'uuid';

const RESEND_API_PATTERN = '**/api.resend.com/**';

export interface ResendMockConfig {
  captureEmails?: boolean;
}

// Store captured emails for verification
const capturedEmails: Array<{ to: string; subject: string; body: string }> = [];

export async function mockResendAPI(page: Page, config: ResendMockConfig = {}) {
  const { captureEmails = false } = config;

  await page.route(RESEND_API_PATTERN, async (route) => {
    const requestBody = route.request().postDataJSON();

    if (captureEmails && requestBody) {
      capturedEmails.push({
        to: requestBody.to,
        subject: requestBody.subject,
        body: requestBody.html || requestBody.text,
      });
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: `email-${uuid()}`,
        from: requestBody?.from || 'noreply@abgalumni.org',
        to: requestBody?.to || 'test@example.com',
        created_at: new Date().toISOString(),
      }),
    });
  });
}

export function getCapturedEmails() {
  return [...capturedEmails];
}

export function clearCapturedEmails() {
  capturedEmails.length = 0;
}

export function getLastCapturedEmail() {
  return capturedEmails[capturedEmails.length - 1];
}

// Extract magic link from captured email
export function extractMagicLink(emailBody: string): string | null {
  const match = emailBody.match(/href="([^"]*auth\/callback[^"]*)"/);
  return match ? match[1] : null;
}

export async function mockResendRateLimit(page: Page) {
  await setupErrorMock(page, RESEND_API_PATTERN, 429, 'Rate limit exceeded');
}

export async function mockResendInvalidEmail(page: Page) {
  await setupErrorMock(page, RESEND_API_PATTERN, 400, 'Invalid email address');
}
