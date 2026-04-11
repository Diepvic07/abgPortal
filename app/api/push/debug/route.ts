import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** GET /api/push/debug — diagnostic endpoint to check push subscription state */
export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const supabase = createServerSupabaseClient();

    // Get push subscriptions for this member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subs, error: subErr } = await (supabase.from('push_subscriptions') as any)
      .select('id, endpoint, user_agent, created_at, last_used_at')
      .eq('member_id', member.id);

    // Get notification preferences
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prefs, error: prefErr } = await (supabase.from('notification_preferences') as any)
      .select('connection_request, new_event, new_proposal, updated_at')
      .eq('member_id', member.id)
      .maybeSingle();

    // Count total subscriptions across all members
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: totalSubs } = await (supabase.from('push_subscriptions') as any)
      .select('id', { count: 'exact', head: true });

    return successResponse({
      member_id: member.id,
      member_name: member.name,
      subscriptions: subs || [],
      subscription_count: subs?.length || 0,
      total_subscriptions_all_members: totalSubs || 0,
      preferences: prefs || { connection_request: true, new_event: true, new_proposal: true, note: 'no row = defaults all enabled' },
      errors: {
        subscriptions: subErr?.message || null,
        preferences: prefErr?.message || null,
      },
      vapid_configured: !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
