import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { getPublicEvents } from '@/lib/supabase-events';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await getPublicEvents({ page, limit });
    return successResponse({ events: result.events, total: result.total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}
