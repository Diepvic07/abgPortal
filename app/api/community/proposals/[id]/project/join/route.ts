import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getProposalById } from '@/lib/supabase-community';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { PROJECT_STATUSES } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST: join the project (open, no approval).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) return errorResponse('Proposal not found', 404);

    if (!(PROJECT_STATUSES as readonly string[]).includes(proposal.status)) {
      return errorResponse('This proposal is not currently a project', 400);
    }

    const supabase = createServerSupabaseClient();
    const now = formatDate();

    await (supabase.from('proposal_project_members') as any)
      .upsert({
        proposal_id: id,
        member_id: member.id,
        joined_at: now,
      }, { onConflict: 'proposal_id,member_id', ignoreDuplicates: true });

    return successResponse({ joined: true });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: leave the project.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const supabase = createServerSupabaseClient();

    await (supabase.from('proposal_project_members') as any)
      .delete()
      .eq('proposal_id', id)
      .eq('member_id', member.id);

    return successResponse({ joined: false });
  } catch (error) {
    return handleApiError(error);
  }
}
