import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const VALID_KEYS = ['connection_request', 'new_event', 'new_proposal'] as const;

export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const supabase = createServerSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('notification_preferences') as any)
      .select('connection_request, new_event, new_proposal')
      .eq('member_id', member.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected for new members)
      console.error('[notifications] Preferences fetch error:', error.message);
      return errorResponse('Failed to fetch preferences', 500);
    }

    // Return preferences or defaults (all enabled)
    const preferences = data || {
      connection_request: true,
      new_event: true,
      new_proposal: true,
    };

    return successResponse({ preferences });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const body = await request.json();

    // Validate: only allow known boolean keys
    const updates: Record<string, boolean> = {};
    for (const key of VALID_KEYS) {
      if (typeof body[key] === 'boolean') {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('No valid preference fields provided', 400);
    }

    const supabase = createServerSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('notification_preferences') as any)
      .upsert(
        {
          member_id: member.id,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'member_id' }
      );

    if (error) {
      console.error('[notifications] Preferences update error:', error.message);
      return errorResponse('Failed to update preferences', 500);
    }

    // Fetch updated preferences to return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('notification_preferences') as any)
      .select('connection_request, new_event, new_proposal')
      .eq('member_id', member.id)
      .single();

    return successResponse({ preferences: data });
  } catch (error) {
    return handleApiError(error);
  }
}
