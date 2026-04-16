import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** GET /api/members/by-ids?ids=id1,id2 — fetch minimal member info for hydrating chips. */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const raw = request.nextUrl.searchParams.get('ids') || '';
    const ids = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 100);

    if (ids.length === 0) {
      return successResponse({ members: [] });
    }

    const supabase = createServerSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('members') as any)
      .select('id, name, avatar_url, abg_class')
      .in('id', ids);

    if (error) {
      console.error('[members/by-ids] Error:', error.message);
      return successResponse({ members: [] });
    }

    return successResponse({ members: data || [] });
  } catch (error) {
    return handleApiError(error);
  }
}
