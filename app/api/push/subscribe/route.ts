import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Check if the current member has a push subscription matching the given endpoint.
 * Used by the client to verify browser-server subscription sync.
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const endpoint = request.nextUrl.searchParams.get('endpoint');

    if (!endpoint) {
      return errorResponse('Missing endpoint parameter', 400);
    }

    const supabase = createServerSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('push_subscriptions') as any)
      .select('id')
      .eq('member_id', member.id)
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (error) {
      console.error('[push] Verify subscription error:', error.message);
      return errorResponse('Failed to verify subscription', 500);
    }

    return successResponse({ exists: !!data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const body = await request.json();
    const { endpoint, p256dh, auth } = body;

    if (!endpoint || !p256dh || !auth) {
      return errorResponse('Missing required fields: endpoint, p256dh, auth', 400);
    }

    const supabase = createServerSupabaseClient();

    // Upsert: if same member+endpoint exists, update keys (they may rotate)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('push_subscriptions') as any)
      .upsert(
        {
          member_id: member.id,
          endpoint,
          p256dh,
          auth,
          user_agent: request.headers.get('user-agent') || undefined,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'member_id,endpoint' }
      );

    if (error) {
      console.error('[push] Subscribe error:', error.message);
      return errorResponse('Failed to save subscription', 500);
    }

    return successResponse({ subscribed: true }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
