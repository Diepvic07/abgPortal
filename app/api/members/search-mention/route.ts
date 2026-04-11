import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** GET /api/members/search-mention?q=name — lightweight member search for @mentions */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const q = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase();

    if (q.length < 1) {
      return successResponse({ members: [] });
    }

    const supabase = createServerSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('members') as any)
      .select('id, name, avatar_url, abg_class')
      .eq('approval_status', 'approved')
      .not('account_status', 'in', '("suspended","banned")')
      .ilike('name', `%${q}%`)
      .limit(8);

    if (error) {
      console.error('[mention-search] Error:', error.message);
      return successResponse({ members: [] });
    }

    return successResponse({
      members: (data || []).map((m: { id: string; name: string; avatar_url: string | null; abg_class: string | null }) => ({
        id: m.id,
        name: m.name,
        avatar_url: m.avatar_url,
        abg_class: m.abg_class,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
