import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
