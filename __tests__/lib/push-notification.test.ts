import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock web-push
const mockSendNotification = vi.fn();
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}));

// Mock data holders
let mockSubsData: unknown[] | null = null;
let mockPrefsData: unknown | null = null;
let mockMemberData: unknown | null = null;
let mockDeleteCalled = false;

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'push_subscriptions') {
        return {
          select: () => ({
            eq: () => ({ data: mockSubsData, error: null }),
            neq: () => ({ data: mockSubsData, error: null }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          update: () => ({ eq: () => ({ error: null }) }),
          delete: () => {
            mockDeleteCalled = true;
            return { eq: () => ({ error: null }) };
          },
        };
      }
      if (table === 'notification_preferences') {
        return {
          select: () => ({
            eq: () => ({
              single: () => ({ data: mockPrefsData, error: mockPrefsData ? null : { code: 'PGRST116' } }),
            }),
            in: () => ({ data: mockPrefsData ? [mockPrefsData] : [], error: null }),
          }),
        };
      }
      if (table === 'members') {
        return {
          select: () => ({
            eq: () => ({
              single: () => ({ data: mockMemberData, error: null }),
            }),
            in: () => ({ data: mockMemberData ? [mockMemberData] : [], error: null }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ data: null, error: null }) }) };
    },
  }),
}));

// Mock i18n
vi.mock('@/lib/i18n/utils', () => ({
  getTranslations: (locale: string) => ({
    push: {
      connectionRequestTitle: locale === 'vi' ? 'Yeu cau ket noi moi' : 'New connection request',
      connectionRequestBody: '{requesterName} wants to connect',
      newEventTitle: 'New event: {eventTitle}',
      newEventBody: 'A new event has been published',
      newProposalTitle: 'New proposal: {proposalTitle}',
      newProposalBody: '{proposerName} created a new proposal',
    },
  }),
  interpolate: (template: string, values: Record<string, string>) => {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || `{${key}}`);
  },
}));

// Set VAPID env vars for tests
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'test-public-key');
  vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key');
  vi.stubEnv('VAPID_SUBJECT', 'mailto:test@test.com');
  mockSendNotification.mockReset();
  mockSubsData = null;
  mockPrefsData = null;
  mockMemberData = null;
  mockDeleteCalled = false;
});

describe('getPushMessage', () => {
  it('generates connection_request message in English', async () => {
    const { getPushMessage } = await import('@/lib/push-notification');
    const msg = getPushMessage('connection_request', { requesterName: 'John' }, 'en');
    expect(msg.title).toBe('New connection request');
    expect(msg.body).toBe('John wants to connect');
  });

  it('generates connection_request message in Vietnamese', async () => {
    const { getPushMessage } = await import('@/lib/push-notification');
    const msg = getPushMessage('connection_request', { requesterName: 'Nguyen' }, 'vi');
    expect(msg.title).toBe('Yeu cau ket noi moi');
    expect(msg.body).toBe('Nguyen wants to connect');
  });

  it('generates new_event message', async () => {
    const { getPushMessage } = await import('@/lib/push-notification');
    const msg = getPushMessage('new_event', { eventTitle: 'Networking Night' }, 'en');
    expect(msg.title).toBe('New event: Networking Night');
    expect(msg.body).toBe('A new event has been published');
  });

  it('generates new_proposal message', async () => {
    const { getPushMessage } = await import('@/lib/push-notification');
    const msg = getPushMessage('new_proposal', { proposalTitle: 'Charity Run', proposerName: 'Alice' }, 'en');
    expect(msg.title).toBe('New proposal: Charity Run');
    expect(msg.body).toBe('Alice created a new proposal');
  });
});

describe('sendPushToMember', () => {
  it('sends push when preferences are all enabled', async () => {
    mockSubsData = [
      { id: 'sub-1', member_id: 'member-1', endpoint: 'https://push.example.com/1', p256dh: 'key1', auth: 'auth1' },
    ];
    mockPrefsData = { member_id: 'member-1', connection_request: true, new_event: true, new_proposal: true };
    mockMemberData = { id: 'member-1', locale: 'en' };
    mockSendNotification.mockResolvedValue({});

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'connection_request', { title: 'Test', body: 'Test body' });

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it('skips push when preference is disabled', async () => {
    mockSubsData = [
      { id: 'sub-1', member_id: 'member-1', endpoint: 'https://push.example.com/1', p256dh: 'key1', auth: 'auth1' },
    ];
    mockPrefsData = { member_id: 'member-1', connection_request: false, new_event: true, new_proposal: true };
    mockMemberData = { id: 'member-1', locale: 'en' };

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'connection_request', { title: 'Test', body: 'Test body' });

    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('treats missing preferences row as all enabled', async () => {
    mockSubsData = [
      { id: 'sub-1', member_id: 'member-1', endpoint: 'https://push.example.com/1', p256dh: 'key1', auth: 'auth1' },
    ];
    mockPrefsData = null; // No preferences row
    mockMemberData = { id: 'member-1', locale: 'en' };
    mockSendNotification.mockResolvedValue({});

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'new_event', { title: 'Test', body: 'Test body' });

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it('returns silently when no subscriptions exist', async () => {
    mockSubsData = [];

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'connection_request', { title: 'Test', body: 'Test body' });

    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('sends to multiple devices', async () => {
    mockSubsData = [
      { id: 'sub-1', member_id: 'member-1', endpoint: 'https://push.example.com/1', p256dh: 'key1', auth: 'auth1' },
      { id: 'sub-2', member_id: 'member-1', endpoint: 'https://push.example.com/2', p256dh: 'key2', auth: 'auth2' },
    ];
    mockPrefsData = null;
    mockMemberData = { id: 'member-1', locale: 'en' };
    mockSendNotification.mockResolvedValue({});

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'connection_request', { title: 'Test', body: 'Test body' });

    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  });
});

describe('stale subscription cleanup', () => {
  it('deletes subscription on 410 Gone', async () => {
    mockSubsData = [
      { id: 'sub-1', member_id: 'member-1', endpoint: 'https://push.example.com/expired', p256dh: 'key1', auth: 'auth1' },
    ];
    mockPrefsData = null;
    mockMemberData = { id: 'member-1', locale: 'en' };
    mockSendNotification.mockRejectedValue({ statusCode: 410 });

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'connection_request', { title: 'Test', body: 'Test body' });

    expect(mockDeleteCalled).toBe(true);
  });
});
