import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import webPush from 'web-push';

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

/** GET /api/push/test — send a test push notification to the current member */
export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);

    if (!vapidConfigured) {
      return errorResponse('VAPID not configured', 500);
    }

    const supabase = createServerSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subs, error: subErr } = await (supabase.from('push_subscriptions') as any)
      .select('id, endpoint, p256dh, auth')
      .eq('member_id', member.id);

    if (subErr || !subs || subs.length === 0) {
      return errorResponse(`No subscriptions found: ${subErr?.message || 'empty'}`, 404);
    }

    const results = [];

    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        const sendResult = await webPush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title: 'Test Push Notification',
            body: `This is a test for ${member.name}`,
            url: '/profile/notifications',
          })
        );
        results.push({
          id: sub.id,
          endpoint: sub.endpoint.slice(0, 60) + '...',
          status: 'success',
          statusCode: sendResult.statusCode,
        });
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        const errBody = (err as { body?: string })?.body;
        results.push({
          id: sub.id,
          endpoint: sub.endpoint.slice(0, 60) + '...',
          status: 'error',
          statusCode,
          error: errBody || String(err),
        });
      }
    }

    return successResponse({ member_id: member.id, results });
  } catch (error) {
    return handleApiError(error);
  }
}
