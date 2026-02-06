import { Page } from '@playwright/test';
import { v4 as uuid } from 'uuid';

const BLOB_PATTERN = '**/blob.vercel-storage.com/**';

export async function mockVercelBlob(page: Page) {
  // Mock upload
  await page.route('**/api/upload**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: `https://mock-blob.vercel-storage.com/${uuid()}.wav`,
        downloadUrl: `https://mock-blob.vercel-storage.com/${uuid()}.wav`,
        pathname: `uploads/${uuid()}.wav`,
      }),
    });
  });

  // Mock blob read
  await page.route(BLOB_PATTERN, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'audio/wav',
      body: Buffer.from([]), // Empty audio placeholder
    });
  });
}
