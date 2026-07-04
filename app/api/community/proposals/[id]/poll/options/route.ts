import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_OPTIONS = 20;
const MAX_OPTION_LENGTH = 200;

// POST: Any signed-in member can suggest a new option while poll is open
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
    const { id } = await params;

    const body = await request.json();
    const raw = typeof body?.option === 'string' ? body.option : '';
    const option = raw.trim().slice(0, MAX_OPTION_LENGTH);
    if (!option) return errorResponse('Option text is required', 400);

    const supabase = createServerSupabaseClient();
    const { data: poll } = await (supabase.from('proposal_polls') as any)
      .select('*')
      .eq('proposal_id', id)
      .single();

    if (!poll) return errorResponse('Poll not found', 404);
    if (poll.status !== 'open') return errorResponse('Poll is closed', 400);

    const existing = ((poll.options as string[]) || []).map(o => String(o));
    if (existing.length >= MAX_OPTIONS) {
      return errorResponse(`Poll cannot have more than ${MAX_OPTIONS} options`, 400);
    }

    const lowered = option.toLowerCase();
    if (existing.some(o => o.toLowerCase() === lowered)) {
      return errorResponse('This option already exists', 409);
    }

    const nextOptions = [...existing, option];
    const now = formatDate();

    const { error: updateErr } = await (supabase.from('proposal_polls') as any)
      .update({ options: nextOptions, updated_at: now })
      .eq('id', poll.id);

    if (updateErr) {
      return errorResponse(`Failed to add option: ${updateErr.message || updateErr.code}`, 500);
    }

    return successResponse({ option, options: nextOptions }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
