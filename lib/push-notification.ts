import webPush from 'web-push';
import { createServerSupabaseClient } from './supabase/server';
import { getTranslations, interpolate, type Locale } from '@/lib/i18n/utils';
import { sendPushFallbackEmail } from './resend';

// --- Types ---

export type NotificationType = 'connection_request' | 'new_event' | 'new_proposal' | 'proposal_comment' | 'discussion_meeting' | 'news_comment' | 'news_tagged';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  /** Original interpolation data for locale-aware re-generation */
  _data?: Record<string, string>;
}

interface SubscriptionWithPrefs {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  fail_count: number;
  connection_request: boolean | null;
  new_event: boolean | null;
  new_proposal: boolean | null;
  proposal_comment: boolean | null;
  discussion_meeting: boolean | null;
  news_comment: boolean | null;
  news_tagged: boolean | null;
  locale: string | null;
}

// Subscriptions with fail_count >= this are skipped (likely dead endpoint).
// Auto-repair in PushNotificationProvider resets fail_count when user reopens the app.
const SKIP_AFTER_FAILURES = 3;

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

    // Fetch subscriptions for this member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subs, error: subErr } = await (supabase.from('push_subscriptions') as any)
      .select('id, member_id, endpoint, p256dh, auth, fail_count')
      .eq('member_id', memberId);

    if (subErr || !subs || subs.length === 0) {
      if (subErr) console.error('[push] Error fetching subscriptions:', subErr.message);
      return;
    }

    // Fetch preferences (separate query — no FK between these tables)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prefs } = await (supabase.from('notification_preferences') as any)
      .select('connection_request, new_event, new_proposal, proposal_comment, discussion_meeting, news_comment, news_tagged')
      .eq('member_id', memberId)
      .single();

    // Fetch member locale and email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (supabase.from('members') as any)
      .select('locale, email, full_name')
      .eq('id', memberId)
      .single();

    // Build subscription objects with prefs
    const subscriptions: SubscriptionWithPrefs[] = subs.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      member_id: row.member_id as string,
      endpoint: row.endpoint as string,
      p256dh: row.p256dh as string,
      auth: row.auth as string,
      fail_count: (row.fail_count as number) || 0,
      connection_request: prefs?.connection_request ?? null,
      new_event: prefs?.new_event ?? null,
      new_proposal: prefs?.new_proposal ?? null,
      proposal_comment: prefs?.proposal_comment ?? null,
      discussion_meeting: prefs?.discussion_meeting ?? null,
      news_comment: prefs?.news_comment ?? null,
      news_tagged: prefs?.news_tagged ?? null,
      locale: member?.locale ?? null,
    }));

    // Check preferences (same for all devices of this member)
    if (!isNotificationEnabled(subscriptions[0], type)) {
      return;
    }

    // If ALL subscriptions are dead, send email fallback instead of push
    const allDead = subscriptions.every((sub) => sub.fail_count >= SKIP_AFTER_FAILURES);
    if (allDead && member?.email) {
      const locale = (member.locale as Locale) || 'vi';
      const localizedPayload = { ...payload, ...getPushMessage(type, extractMessageData(payload), locale) };
      console.log(`[push] All subscriptions dead for member ${memberId}, sending email fallback to ${member.email}`);
      await sendPushFallbackEmail(member.email, member.full_name || '', localizedPayload.title, localizedPayload.body, localizedPayload.url, locale);
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

    // Fetch all subscriptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('push_subscriptions') as any)
      .select('id, member_id, endpoint, p256dh, auth, fail_count');

    if (excludeMemberId) {
      query = query.neq('member_id', excludeMemberId);
    }

    const { data: subs, error: subErr } = await query;

    if (subErr || !subs || subs.length === 0) {
      if (subErr) console.error('[push] Error fetching subscriptions for broadcast:', subErr.message);
      else console.log(`[push] No subscriptions found for broadcast type=${type} (excludeMemberId=${excludeMemberId || 'none'})`);
      return;
    }

    console.log(`[push] Broadcast type=${type}: found ${subs.length} subscription(s) for ${[...new Set(subs.map((s: Record<string, unknown>) => s.member_id))].length} member(s)`);

    // Get unique member IDs from subscriptions
    const memberIds = [...new Set(subs.map((s: Record<string, unknown>) => s.member_id as string))];

    // Fetch all preferences for these members in one query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allPrefs } = await (supabase.from('notification_preferences') as any)
      .select('member_id, connection_request, new_event, new_proposal, proposal_comment, discussion_meeting, news_comment, news_tagged')
      .in('member_id', memberIds);

    // Fetch member locales and emails
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: members } = await (supabase.from('members') as any)
      .select('id, locale, email, full_name')
      .in('id', memberIds);

    // Build lookup maps
    const prefsMap = new Map((allPrefs || []).map((p: Record<string, unknown>) => [p.member_id, p]));
    const localeMap = new Map((members || []).map((m: Record<string, unknown>) => [m.id, m.locale]));
    const memberMap = new Map((members || []).map((m: Record<string, unknown>) => [m.id, m]));

    // Build subscription objects and filter by preferences
    const subscriptions: SubscriptionWithPrefs[] = subs
      .map((row: Record<string, unknown>) => {
        const prefs = prefsMap.get(row.member_id as string) as Record<string, unknown> | undefined;
        return {
          id: row.id as string,
          member_id: row.member_id as string,
          endpoint: row.endpoint as string,
          p256dh: row.p256dh as string,
          auth: row.auth as string,
          fail_count: (row.fail_count as number) || 0,
          connection_request: prefs?.connection_request as boolean | null ?? null,
          new_event: prefs?.new_event as boolean | null ?? null,
          new_proposal: prefs?.new_proposal as boolean | null ?? null,
          proposal_comment: prefs?.proposal_comment as boolean | null ?? null,
          discussion_meeting: prefs?.discussion_meeting as boolean | null ?? null,
          news_comment: prefs?.news_comment as boolean | null ?? null,
          news_tagged: prefs?.news_tagged as boolean | null ?? null,
          locale: (localeMap.get(row.member_id as string) as string) ?? null,
        };
      })
      .filter((sub: SubscriptionWithPrefs) => isNotificationEnabled(sub, type));

    if (subscriptions.length === 0) {
      console.log(`[push] Broadcast type=${type}: all ${subs.length} subscription(s) filtered out by preferences`);
      return;
    }

    console.log(`[push] Broadcast type=${type}: sending to ${subscriptions.length} subscription(s) after preference filter`);

    // Group subscriptions by member to detect members with all-dead endpoints
    const subsByMember = new Map<string, SubscriptionWithPrefs[]>();
    for (const sub of subscriptions) {
      const existing = subsByMember.get(sub.member_id) || [];
      existing.push(sub);
      subsByMember.set(sub.member_id, existing);
    }

    // Send push to members with live endpoints, email fallback to members with all-dead endpoints
    const sendPromises: Promise<void>[] = [];
    for (const [mid, memberSubs] of subsByMember) {
      const allDead = memberSubs.every((s) => s.fail_count >= SKIP_AFTER_FAILURES);
      if (allDead) {
        const m = memberMap.get(mid) as Record<string, unknown> | undefined;
        if (m?.email) {
          const locale = (m.locale as Locale) || 'vi';
          const localizedPayload = { ...payload, ...getPushMessage(type, extractMessageData(payload), locale) };
          console.log(`[push] Broadcast: all subscriptions dead for member ${mid}, sending email fallback`);
          sendPromises.push(sendPushFallbackEmail(m.email as string, (m.full_name as string) || '', localizedPayload.title, localizedPayload.body, localizedPayload.url, locale));
        }
      } else {
        for (const sub of memberSubs) {
          const localizedPayload = sub.locale
            ? { ...payload, ...getPushMessage(type, extractMessageData(payload), sub.locale as Locale) }
            : payload;
          sendPromises.push(sendToEndpoint(sub, localizedPayload, supabase));
        }
      }
    }

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
  // Skip subscriptions that have failed too many times (likely dead endpoint).
  // We keep them in the DB so auto-repair can resurrect them when the user
  // reopens the app — but don't waste push calls on them in the meantime.
  if (sub.fail_count >= SKIP_AFTER_FAILURES) {
    return;
  }

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    // Strip internal _data before sending to browser
    const { _data: _, ...sendPayload } = payload;
    await webPush.sendNotification(pushSubscription, JSON.stringify(sendPayload));

    // Update last_used_at on success, reset fail_count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('push_subscriptions') as any)
      .update({ last_used_at: new Date().toISOString(), fail_count: 0 })
      .eq('id', sub.id);
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;

    if (statusCode === 410 || statusCode === 404) {
      // Increment fail_count but NEVER delete. iOS kills PWAs aggressively and
      // Apple's push service returns 410, but the subscription can recover when
      // the user reopens the app. The auto-repair in PushNotificationProvider
      // resets fail_count to 0 on next app open. Subscriptions with high
      // fail_count are skipped in sendToEndpoint to avoid wasting push calls.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: current } = await (supabase.from('push_subscriptions') as any)
        .select('fail_count')
        .eq('id', sub.id)
        .single();

      const newFailCount = ((current?.fail_count as number) || 0) + 1;
      console.log(`[push] Subscription ${sub.id} failed (${statusCode}), fail_count=${newFailCount}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('push_subscriptions') as any)
        .update({ fail_count: newFailCount })
        .eq('id', sub.id);
    } else {
      console.error(`[push] Failed to send to endpoint ${sub.endpoint.slice(0, 50)}...`, statusCode || err);
    }
  }
}

// --- Locale-aware message generation ---

function extractMessageData(payload: PushPayload): Record<string, string> {
  // Use original interpolation data if available, fall back to title/body
  return payload._data || { title: payload.title, body: payload.body };
}

export function getPushMessage(
  type: NotificationType,
  data: Record<string, string>,
  locale: Locale
): Pick<PushPayload, 'title' | 'body'> & { _data: Record<string, string> } {
  const t = getTranslations(locale);

  switch (type) {
    case 'connection_request':
      return {
        title: t.push.connectionRequestTitle,
        body: interpolate(t.push.connectionRequestBody, data),
        _data: data,
      };
    case 'new_event':
      return {
        title: interpolate(t.push.newEventTitle, data),
        body: t.push.newEventBody,
        _data: data,
      };
    case 'new_proposal':
      return {
        title: interpolate(t.push.newProposalTitle, data),
        body: interpolate(t.push.newProposalBody, data),
        _data: data,
      };
    case 'proposal_comment':
      return {
        title: interpolate(t.push.proposalCommentTitle, data),
        body: interpolate(t.push.proposalCommentBody, data),
        _data: data,
      };
    case 'news_comment':
      return {
        title: interpolate(t.push.newsCommentTitle, data),
        body: interpolate(t.push.newsCommentBody, data),
        _data: data,
      };
    case 'news_tagged':
      return {
        title: interpolate(t.push.newsTaggedTitle, data),
        body: interpolate(t.push.newsTaggedBody, data),
        _data: data,
      };
    case 'discussion_meeting': {
      const isReminder = data.isReminder === 'true';
      if (isReminder) {
        return {
          title: locale === 'vi' ? 'Nhắc nhở thảo luận' : 'Discussion Reminder',
          body: locale === 'vi'
            ? `Buổi thảo luận "${data.proposalTitle}" sẽ bắt đầu trong 10 phút!`
            : `Discussion "${data.proposalTitle}" starts in 10 minutes!`,
          _data: data,
        };
      }
      return {
        title: locale === 'vi' ? 'Lời mời thảo luận' : 'Discussion Invitation',
        body: locale === 'vi'
          ? `Bạn được mời tham gia thảo luận cho "${data.proposalTitle}"`
          : `You're invited to discuss "${data.proposalTitle}"`,
        _data: data,
      };
    }
    default:
      return { title: data.title || 'ABG Alumni Connect', body: data.body || '', _data: data };
  }
}
