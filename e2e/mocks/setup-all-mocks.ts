import { Page } from '@playwright/test';
import { mockSupabaseDb, SupabaseMockConfig } from './supabase-db.mock';
import { mockGeminiAPI, GeminiMockConfig } from './gemini.mock';
import { mockResendAPI, ResendMockConfig } from './resend.mock';
import { mockDiscordWebhooks } from './discord.mock';
import { mockVercelBlob } from './blob.mock';
import { TestMember } from '../fixtures/test-data';

export interface AllMocksConfig {
  supabase?: SupabaseMockConfig;
  gemini?: GeminiMockConfig;
  resend?: ResendMockConfig;
  members?: TestMember[];
}

export async function setupAllMocks(page: Page, config: AllMocksConfig = {}) {
  const { members = [] } = config;

  await Promise.all([
    mockSupabaseDb(page, { members, ...config.supabase }),
    mockGeminiAPI(page, { matchMembers: members, ...config.gemini }),
    mockResendAPI(page, config.resend),
    mockDiscordWebhooks(page),
    mockVercelBlob(page),
  ]);
}

// Convenience function for common test setup
export async function setupTestEnvironment(page: Page, members: TestMember[]) {
  await setupAllMocks(page, {
    members,
    resend: { captureEmails: true },
  });
}
