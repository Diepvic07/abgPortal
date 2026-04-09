import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock web-push
const mockSendNotification = vi.fn();
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}));

// Mock Supabase
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockNeq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({
    from: (table: string) => {
      mockFrom(table);
      return {
        select: (...args: unknown[]) => {
          mockSelect(...args);
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs);
              return { data: mockSelectData, error: null };
            },
            neq: (...neqArgs: unknown[]) => {
              mockNeq(...neqArgs);
              return { data: mockSelectData, error: null };
            },
          };
        },
        update: (...args: unknown[]) => {
          mockUpdate(...args);
          return { eq: () => ({ error: null }) };
        },
        delete: () => {
          mockDelete();
          return { eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return { error: null };
          }};
        },
      };
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

let mockSelectData: unknown[] | null = null;

// Set VAPID env vars for tests
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'test-public-key');
  vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key');
  vi.stubEnv('VAPID_SUBJECT', 'mailto:test@test.com');
  mockSendNotification.mockReset();
  mockFrom.mockReset();
  mockSelect.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockEq.mockReset();
  mockNeq.mockReset();
  mockSelectData = null;
});

describe('getPushMessage', () => {
  it('generates connection_request message in English', async () => {
    // Need to import after mocks are set up
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

describe('isNotificationEnabled (via sendPushToMember behavior)', () => {
  it('sends push when preferences are all enabled', async () => {
    mockSelectData = [{
      id: 'sub-1',
      member_id: 'member-1',
      endpoint: 'https://push.example.com/1',
      p256dh: 'key1',
      auth: 'auth1',
      notification_preferences: { connection_request: true, new_event: true, new_proposal: true },
      members: { locale: 'en' },
    }];

    mockSendNotification.mockResolvedValue({});

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'connection_request', {
      title: 'Test',
      body: 'Test body',
    });

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it('skips push when preference is disabled', async () => {
    mockSelectData = [{
      id: 'sub-1',
      member_id: 'member-1',
      endpoint: 'https://push.example.com/1',
      p256dh: 'key1',
      auth: 'auth1',
      notification_preferences: { connection_request: false, new_event: true, new_proposal: true },
      members: { locale: 'en' },
    }];

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'connection_request', {
      title: 'Test',
      body: 'Test body',
    });

    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('treats missing preferences row as all enabled', async () => {
    mockSelectData = [{
      id: 'sub-1',
      member_id: 'member-1',
      endpoint: 'https://push.example.com/1',
      p256dh: 'key1',
      auth: 'auth1',
      notification_preferences: null,
      members: { locale: 'en' },
    }];

    mockSendNotification.mockResolvedValue({});

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'new_event', {
      title: 'Test',
      body: 'Test body',
    });

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });
});

describe('stale subscription cleanup', () => {
  it('deletes subscription on 410 Gone', async () => {
    mockSelectData = [{
      id: 'sub-1',
      member_id: 'member-1',
      endpoint: 'https://push.example.com/expired',
      p256dh: 'key1',
      auth: 'auth1',
      notification_preferences: null,
      members: { locale: 'en' },
    }];

    mockSendNotification.mockRejectedValue({ statusCode: 410 });

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'connection_request', {
      title: 'Test',
      body: 'Test body',
    });

    expect(mockDelete).toHaveBeenCalled();
  });
});

describe('sendPushToMember', () => {
  it('returns silently when no subscriptions exist', async () => {
    mockSelectData = [];

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'connection_request', {
      title: 'Test',
      body: 'Test body',
    });

    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('sends to multiple devices', async () => {
    mockSelectData = [
      {
        id: 'sub-1', member_id: 'member-1', endpoint: 'https://push.example.com/1',
        p256dh: 'key1', auth: 'auth1',
        notification_preferences: null, members: { locale: 'en' },
      },
      {
        id: 'sub-2', member_id: 'member-1', endpoint: 'https://push.example.com/2',
        p256dh: 'key2', auth: 'auth2',
        notification_preferences: null, members: { locale: 'en' },
      },
    ];

    mockSendNotification.mockResolvedValue({});

    const { sendPushToMember } = await import('@/lib/push-notification');
    await sendPushToMember('member-1', 'connection_request', {
      title: 'Test',
      body: 'Test body',
    });

    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  });
});
