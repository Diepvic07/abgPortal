import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateId, formatDate } from '@/lib/utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST: Submit or update a member's response (date votes + question)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id: proposalId } = await params;
    const supabase = createServerSupabaseClient();

    // Get the discussion for this proposal
    const { data: discussion } = await (supabase.from('proposal_discussions') as any)
      .select('id, status, date_options')
      .eq('proposal_id', proposalId)
      .single();

    if (!discussion) return errorResponse('Discussion not found', 404);
    if (discussion.status !== 'open') return errorResponse('Discussion is no longer accepting responses', 400);

    const body = await request.json();
    const { available_dates, question } = body;

    // Validate available_dates is a subset of date_options
    if (available_dates && Array.isArray(available_dates)) {
      const validDates = new Set(discussion.date_options as string[]);
      const invalidDates = available_dates.filter((d: string) => !validDates.has(d));
      if (invalidDates.length > 0) {
        return errorResponse('Some selected dates are not valid options', 400);
      }
    }

    const now = formatDate();

    // Upsert: insert or update response
    const { data: existing } = await (supabase.from('proposal_discussion_responses') as any)
      .select('id')
      .eq('discussion_id', discussion.id)
      .eq('member_id', member.id)
      .single();

    if (existing) {
      const { error } = await (supabase.from('proposal_discussion_responses') as any)
        .update({
          available_dates: available_dates || [],
          question: question || null,
          updated_at: now,
        })
        .eq('id', existing.id);

      if (error) throw new Error('Failed to update response');
    } else {
      const { error } = await (supabase.from('proposal_discussion_responses') as any)
        .insert({
          id: generateId(),
          discussion_id: discussion.id,
          member_id: member.id,
          available_dates: available_dates || [],
          question: question || null,
          created_at: now,
          updated_at: now,
        });

      if (error) throw new Error('Failed to submit response');
    }

    return successResponse({ message: 'Response submitted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
