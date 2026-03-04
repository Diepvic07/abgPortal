import { Page } from '@playwright/test';
import { setupErrorMock } from './index';
import { TestMember, TestNewsArticle, TestLoveMatchRequest } from '../fixtures/test-data';

const SUPABASE_API_PATTERN = '**/rest/v1/**';

export interface SupabaseMockConfig {
  members?: TestMember[];
  requests?: object[];
  newsArticles?: TestNewsArticle[];
  loveMatchRequests?: TestLoveMatchRequest[];
  empty?: boolean;
}

/** Convert TestMember to Supabase row format (native types, not Google Sheets strings) */
function memberToRow(m: TestMember) {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role || '',
    company: m.company || '',
    expertise: m.industry || '',
    can_help_with: '',
    looking_for: '',
    bio: m.bio,
    avatar_url: null,
    status: 'active',
    paid: m.paid ?? (m.tier === 'premium'),
    free_requests_used: m.free_requests_used ?? 0,
    created_at: new Date().toISOString(),
    country: m.country || null,
    gender: m.gender || null,
    relationship_status: m.relationship_status || null,
    account_status: m.status === 'suspended' ? 'suspended' : 'active',
    approval_status: m.status === 'pending' ? 'pending' : m.status === 'rejected' ? 'rejected' : 'approved',
    is_admin: m.email === 'admin@abgalumni.test',
    is_csv_imported: false,
    nickname: m.nickname || null,
    abg_class: m.chapter || null,
    self_description: m.self_description || null,
    interests: m.interests || null,
    core_values: m.core_values || null,
    ideal_day: m.ideal_day || null,
    dating_profile_complete: m.dating_profile_complete ?? false,
    requests_this_month: m.requests_this_month ?? 0,
    requests_today: m.requests_today ?? 0,
    month_reset_date: m.month_reset_date || null,
    total_requests_count: 0,
    open_to_work: false,
    hiring: false,
    display_nickname_in_search: false,
    display_nickname_in_match: false,
    display_nickname_in_email: false,
    payment_status: 'unpaid',
    updated_at: new Date().toISOString(),
  };
}

export async function mockSupabaseDb(page: Page, config: SupabaseMockConfig = {}) {
  const { members = [], newsArticles = [], loveMatchRequests = [], empty = false } = config;

  // Mock Supabase REST API (select/insert/update/delete)
  await page.route(SUPABASE_API_PATTERN, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (empty) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }

    // GET requests (select)
    if (method === 'GET') {
      if (url.includes('/members')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(members.map(memberToRow)),
        });
      }
      if (url.includes('/news')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(newsArticles),
        });
      }
      if (url.includes('/love_match_requests')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(loveMatchRequests),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }

    // POST (insert), PATCH (update), DELETE
    if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }

    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

export async function mockSupabaseUnavailable(page: Page) {
  await setupErrorMock(page, SUPABASE_API_PATTERN, 503, 'Service unavailable');
}

export async function mockSupabaseAuthError(page: Page) {
  await setupErrorMock(page, SUPABASE_API_PATTERN, 401, 'Invalid API key');
}
