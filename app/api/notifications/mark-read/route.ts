import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** POST /api/notifications/mark-read — mark notifications as read */
export async function POST(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const body = await request.json();
    const { ids, all } = body;

    const supabase = createServerSupabaseClient();

    if (all) {
      // Mark all as read
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('in_app_notifications') as any)
        .update({ is_read: true })
        .eq('member_id', member.id)
        .eq('is_read', false);

      if (error) {
        console.error('[notifications] Mark all read error:', error.message);
        return errorResponse('Failed to mark notifications as read', 500);
      }
    } else if (Array.isArray(ids) && ids.length > 0) {
      // Mark specific IDs as read
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('in_app_notifications') as any)
        .update({ is_read: true })
        .eq('member_id', member.id)
        .in('id', ids);

      if (error) {
        console.error('[notifications] Mark read error:', error.message);
        return errorResponse('Failed to mark notifications as read', 500);
      }
    } else {
      return errorResponse('Provide "ids" array or "all: true"', 400);
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
