import { Page } from '@playwright/test';

const DISCORD_WEBHOOK_PATTERN = '**/discord.com/api/webhooks/**';

const capturedWebhooks: Array<{ content: string; embeds?: object[] }> = [];

export async function mockDiscordWebhooks(page: Page) {
  await page.route(DISCORD_WEBHOOK_PATTERN, async (route) => {
    const requestBody = route.request().postDataJSON();

    capturedWebhooks.push({
      content: requestBody?.content,
      embeds: requestBody?.embeds,
    });

    route.fulfill({
      status: 204,
      body: '',
    });
  });
}

export function getCapturedWebhooks() {
  return [...capturedWebhooks];
}

export function clearCapturedWebhooks() {
  capturedWebhooks.length = 0;
}
