import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return errorResponse('Missing required field: endpoint', 400);
    }

    const supabase = createServerSupabaseClient();

    // Delete subscription (idempotent — no error if not found)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('push_subscriptions') as any)
      .delete()
      .eq('member_id', member.id)
      .eq('endpoint', endpoint);

    return successResponse({ unsubscribed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
