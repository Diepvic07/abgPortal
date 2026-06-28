import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { getPublicEvents } from '@/lib/supabase-events';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const upcoming = searchParams.get('upcoming') === 'true' ? true : undefined;
    const past = searchParams.get('past') === 'true' ? true : undefined;

    const result = await getPublicEvents({ page, limit, upcoming, past });
    // Strip community group fields — never expose publicly.
    const events = result.events.map((e) => {
      const copy = { ...e };
      delete copy.community_group_url;
      delete copy.community_group_label;
      return copy;
    });
    return successResponse({ events, total: result.total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}
