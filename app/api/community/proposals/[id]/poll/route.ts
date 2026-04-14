import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getProposalById } from '@/lib/supabase-community';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateId, formatDate } from '@/lib/utils';
import { ProposalPoll, PollResponse } from '@/types';

function mapRowToPoll(row: Record<string, unknown>): ProposalPoll {
  return {
    id: row.id as string,
    proposal_id: row.proposal_id as string,
    title: (row.title as string) || '',
    description: (row.description as string) || undefined,
    options: (row.options as string[]) || [],
    allow_multiple: (row.allow_multiple as boolean) || false,
    status: (row.status as ProposalPoll['status']) || 'open',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapRowToResponse(row: Record<string, unknown>): PollResponse {
  return {
    id: row.id as string,
    poll_id: row.poll_id as string,
    member_id: row.member_id as string,
    selected_options: (row.selected_options as string[]) || [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    member_name: (row.member_name as string) || undefined,
    member_avatar_url: (row.member_avatar_url as string) || undefined,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET: Fetch poll + responses for a proposal
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: poll } = await (supabase.from('proposal_polls') as any)
      .select('*')
      .eq('proposal_id', id)
      .single();

    if (!poll) {
      return successResponse({ poll: null, responses: [] });
    }

    // Fetch responses with member info via join
    const { data: respData } = await (supabase.from('proposal_poll_responses') as any)
      .select('*, members:member_id(name, avatar_url)')
      .eq('poll_id', poll.id)
      .order('created_at', { ascending: true });

    let responses: PollResponse[] = [];
    if (respData && respData.length > 0) {
      responses = respData.map((r: any) => {
        const member = r.members as Record<string, unknown> | null;
        return mapRowToResponse({
          ...r,
          member_name: member?.name || r.member_name,
          member_avatar_url: member?.avatar_url || r.member_avatar_url,
        });
      });
    }

    return successResponse({ poll: mapRowToPoll(poll), responses });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Create a new freestyle poll (proposal creator only)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) return errorResponse('Proposal not found', 404);
    if (proposal.created_by_member_id !== member.id && !member.is_admin) {
      return errorResponse('Only the proposal creator can create a poll', 403);
    }

    const body = await request.json();
    const { title, description, options, allow_multiple } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return errorResponse('Poll title is required', 400);
    }
    if (!Array.isArray(options) || options.length < 2 || options.length > 20) {
      return errorResponse('Poll must have 2-20 options', 400);
    }

    const supabase = createServerSupabaseClient();
    const now = formatDate();

    // Check if poll already exists
    const { data: existing } = await (supabase.from('proposal_polls') as any)
      .select('id')
      .eq('proposal_id', id)
      .maybeSingle();

    if (existing) {
      return errorResponse('This proposal already has a freestyle poll', 409);
    }

    const pollId = generateId();
    const cleanOptions = options
      .filter((o: unknown) => typeof o === 'string' && o.trim())
      .map((o: string) => o.trim())
      .slice(0, 20);

    const { error: insertErr } = await (supabase.from('proposal_polls') as any)
      .insert({
        id: pollId,
        proposal_id: id,
        title: title.trim().slice(0, 200),
        description: description ? String(description).trim().slice(0, 1000) : null,
        options: cleanOptions,
        allow_multiple: !!allow_multiple,
        status: 'open',
        created_at: now,
        updated_at: now,
      });

    if (insertErr) {
      return errorResponse(`Failed to create poll: ${insertErr.message || insertErr.code}`, 500);
    }

    // Set has_poll flag
    await (supabase.from('community_proposals') as any)
      .update({ has_poll: true, updated_at: now })
      .eq('id', id);

    return successResponse({ poll: { id: pollId } }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: Update poll (title, description, options, status)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) return errorResponse('Proposal not found', 404);
    if (proposal.created_by_member_id !== member.id && !member.is_admin) {
      return errorResponse('Only the proposal creator can update this poll', 403);
    }

    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const now = formatDate();

    const { data: poll } = await (supabase.from('proposal_polls') as any)
      .select('*')
      .eq('proposal_id', id)
      .single();

    if (!poll) return errorResponse('Poll not found', 404);

    const updates: Record<string, unknown> = { updated_at: now };

    if (body.title !== undefined) {
      updates.title = String(body.title).trim().slice(0, 200);
    }
    if (body.description !== undefined) {
      updates.description = body.description ? String(body.description).trim().slice(0, 1000) : null;
    }
    if (body.status !== undefined) {
      if (!['open', 'closed'].includes(body.status)) return errorResponse('Invalid status', 400);
      updates.status = body.status;
    }
    if (body.allow_multiple !== undefined) {
      updates.allow_multiple = !!body.allow_multiple;
    }

    // If options are being updated, clear all votes
    if (body.options !== undefined) {
      if (!Array.isArray(body.options) || body.options.length < 2 || body.options.length > 20) {
        return errorResponse('Poll must have 2-20 options', 400);
      }
      updates.options = body.options
        .filter((o: unknown) => typeof o === 'string' && o.trim())
        .map((o: string) => o.trim())
        .slice(0, 20);

      // Clear existing votes
      await (supabase.from('proposal_poll_responses') as any)
        .delete()
        .eq('poll_id', poll.id);
    }

    await (supabase.from('proposal_polls') as any)
      .update(updates)
      .eq('id', poll.id);

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
