import webPush from 'web-push';
import { createServerSupabaseClient } from './supabase/server';
import { getTranslations, interpolate, type Locale } from '@/lib/i18n/utils';

// --- Types ---

export type NotificationType = 'connection_request' | 'new_event' | 'new_proposal';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

interface SubscriptionWithPrefs {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  connection_request: boolean | null;
  new_event: boolean | null;
  new_proposal: boolean | null;
  locale: string | null;
}

// --- VAPID initialization ---

const vapidConfigured = !!(
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT
);

if (vapidConfigured) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

// --- Preference check helper ---

function isNotificationEnabled(row: SubscriptionWithPrefs, type: NotificationType): boolean {
  // null means no preferences row exists — default to enabled
  const value = row[type];
  return value === null || value === true;
}

// --- Core send functions ---

/**
 * Send push notification to a specific member (all their devices).
 * Checks notification preferences. Auto-cleans expired subscriptions.
 * Never throws — logs errors and returns silently.
 */
export async function sendPushToMember(
  memberId: string,
  type: NotificationType,
  payload: PushPayload
): Promise<void> {
  if (!vapidConfigured) {
    console.warn('[push] VAPID keys not configured, skipping push notification');
    return;
  }

  try {
    const supabase = createServerSupabaseClient();

    // Single JOIN query: subscriptions + preferences + member locale
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (supabase.from('push_subscriptions') as any)
      .select(`
        id,
        member_id,
        endpoint,
        p256dh,
        auth,
        notification_preferences!left(connection_request, new_event, new_proposal),
        members!inner(locale)
      `)
      .eq('member_id', memberId);

    if (error || !rows || rows.length === 0) {
      if (error) console.error('[push] Error fetching subscriptions:', error.message);
      return;
    }

    // Flatten the joined data
    const subscriptions: SubscriptionWithPrefs[] = rows.map((row: Record<string, unknown>) => {
      const prefs = row.notification_preferences as Record<string, unknown> | null;
      const member = row.members as Record<string, unknown> | null;
      return {
        id: row.id as string,
        member_id: row.member_id as string,
        endpoint: row.endpoint as string,
        p256dh: row.p256dh as string,
        auth: row.auth as string,
        connection_request: prefs?.connection_request as boolean | null ?? null,
        new_event: prefs?.new_event as boolean | null ?? null,
        new_proposal: prefs?.new_proposal as boolean | null ?? null,
        locale: member?.locale as string | null ?? null,
      };
    });

    // Check preferences (first row has the same prefs for all devices)
    if (!isNotificationEnabled(subscriptions[0], type)) {
      return;
    }

    // Send to all devices
    const sendPromises = subscriptions.map((sub) => sendToEndpoint(sub, payload, supabase));
    await Promise.allSettled(sendPromises);
  } catch (err) {
    console.error('[push] sendPushToMember error:', err);
  }
}

/**
 * Send push notification to all subscribed members (broadcast).
 * Filters by notification preferences. Excludes specified member.
 * Never throws — logs errors and returns silently.
 */
export async function sendPushToAllMembers(
  type: NotificationType,
  payload: PushPayload,
  excludeMemberId?: string
): Promise<void> {
  if (!vapidConfigured) {
    console.warn('[push] VAPID keys not configured, skipping broadcast push');
    return;
  }

  try {
    const supabase = createServerSupabaseClient();

    // Single JOIN query: all subscriptions + preferences + member locale
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('push_subscriptions') as any)
      .select(`
        id,
        member_id,
        endpoint,
        p256dh,
        auth,
        notification_preferences!left(connection_request, new_event, new_proposal),
        members!inner(locale)
      `);

    if (excludeMemberId) {
      query = query.neq('member_id', excludeMemberId);
    }

    const { data: rows, error } = await query;

    if (error || !rows || rows.length === 0) {
      if (error) console.error('[push] Error fetching subscriptions for broadcast:', error.message);
      return;
    }

    // Flatten and filter by preferences
    const subscriptions: SubscriptionWithPrefs[] = rows
      .map((row: Record<string, unknown>) => {
        const prefs = row.notification_preferences as Record<string, unknown> | null;
        const member = row.members as Record<string, unknown> | null;
        return {
          id: row.id as string,
          member_id: row.member_id as string,
          endpoint: row.endpoint as string,
          p256dh: row.p256dh as string,
          auth: row.auth as string,
          connection_request: prefs?.connection_request as boolean | null ?? null,
          new_event: prefs?.new_event as boolean | null ?? null,
          new_proposal: prefs?.new_proposal as boolean | null ?? null,
          locale: member?.locale as string | null ?? null,
        };
      })
      .filter((sub: SubscriptionWithPrefs) => isNotificationEnabled(sub, type));

    if (subscriptions.length === 0) return;

    // Send to all in parallel
    const sendPromises = subscriptions.map((sub) => {
      // Generate locale-aware payload for each member
      const localizedPayload = sub.locale
        ? { ...payload, ...getPushMessage(type, extractMessageData(payload), sub.locale as Locale) }
        : payload;
      return sendToEndpoint(sub, localizedPayload, supabase);
    });

    await Promise.allSettled(sendPromises);
  } catch (err) {
    console.error('[push] sendPushToAllMembers error:', err);
  }
}

// --- Send to a single endpoint ---

async function sendToEndpoint(
  sub: SubscriptionWithPrefs,
  payload: PushPayload,
  supabase: ReturnType<typeof createServerSupabaseClient>
): Promise<void> {
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    await webPush.sendNotification(pushSubscription, JSON.stringify(payload));

    // Update last_used_at on success
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('push_subscriptions') as any)
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', sub.id);
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;

    if (statusCode === 410 || statusCode === 404) {
      // Subscription expired — clean up
      console.log(`[push] Removing expired subscription ${sub.id} (${statusCode})`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('push_subscriptions') as any).delete().eq('id', sub.id);
    } else {
      console.error(`[push] Failed to send to endpoint ${sub.endpoint.slice(0, 50)}...`, statusCode || err);
    }
  }
}

// --- Locale-aware message generation ---

function extractMessageData(payload: PushPayload): Record<string, string> {
  return { title: payload.title, body: payload.body };
}

export function getPushMessage(
  type: NotificationType,
  data: Record<string, string>,
  locale: Locale
): Pick<PushPayload, 'title' | 'body'> {
  const t = getTranslations(locale);

  switch (type) {
    case 'connection_request':
      return {
        title: t.push.connectionRequestTitle,
        body: interpolate(t.push.connectionRequestBody, data),
      };
    case 'new_event':
      return {
        title: interpolate(t.push.newEventTitle, data),
        body: t.push.newEventBody,
      };
    case 'new_proposal':
      return {
        title: interpolate(t.push.newProposalTitle, data),
        body: interpolate(t.push.newProposalBody, data),
      };
    default:
      return { title: data.title || 'ABG Alumni Connect', body: data.body || '' };
  }
}
