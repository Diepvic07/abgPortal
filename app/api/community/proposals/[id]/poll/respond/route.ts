import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateId, formatDate } from '@/lib/utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST: Submit or update a member's poll vote
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const supabase = createServerSupabaseClient();

    // Get the poll
    const { data: poll } = await (supabase.from('proposal_polls') as any)
      .select('*')
      .eq('proposal_id', id)
      .single();

    if (!poll) return errorResponse('Poll not found', 404);
    if (poll.status !== 'open') return errorResponse('Poll is closed', 400);

    const body = await request.json();
    const { selected_options } = body;

    if (!Array.isArray(selected_options) || selected_options.length === 0) {
      return errorResponse('At least one option must be selected', 400);
    }

    // Validate options exist in poll
    const validOptions = (poll.options as string[]) || [];
    const filtered = selected_options.filter((o: string) => validOptions.includes(o));
    if (filtered.length === 0) {
      return errorResponse('No valid options selected', 400);
    }

    // If not allow_multiple, only keep first option
    const finalOptions = poll.allow_multiple ? filtered : [filtered[0]];

    const now = formatDate();

    // Check if response exists
    const { data: existing } = await (supabase.from('proposal_poll_responses') as any)
      .select('id')
      .eq('poll_id', poll.id)
      .eq('member_id', member.id)
      .maybeSingle();

    if (existing) {
      await (supabase.from('proposal_poll_responses') as any)
        .update({ selected_options: finalOptions, updated_at: now })
        .eq('id', existing.id);
    } else {
      await (supabase.from('proposal_poll_responses') as any)
        .insert({
          id: generateId(),
          poll_id: poll.id,
          member_id: member.id,
          selected_options: finalOptions,
          created_at: now,
          updated_at: now,
        });
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
