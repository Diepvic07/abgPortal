import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** GET /api/notifications/unread-count — count of unread notifications */
export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const supabase = createServerSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase.from('in_app_notifications') as any)
      .select('id', { count: 'exact', head: true })
      .eq('member_id', member.id)
      .eq('is_read', false);

    if (error) {
      console.error('[notifications] Unread count error:', error.message);
      return successResponse({ count: 0 });
    }

    return successResponse({ count: count || 0 });
  } catch (error) {
    return handleApiError(error);
  }
}
