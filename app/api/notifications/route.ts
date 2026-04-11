import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** GET /api/notifications — list recent notifications for the current member */
export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const supabase = createServerSupabaseClient();

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20'), 50);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('in_app_notifications') as any)
      .select('id, type, title, body, url, is_read, created_at')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[notifications] List error:', error.message);
      return successResponse({ notifications: [] });
    }

    return successResponse({ notifications: data || [] });
  } catch (error) {
    return handleApiError(error);
  }
}
