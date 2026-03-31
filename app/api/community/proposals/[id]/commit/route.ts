import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getProposalById, upsertCommitment, removeCommitment } from '@/lib/supabase-community';
import { CommitmentLevel } from '@/types';

const VALID_LEVELS: CommitmentLevel[] = ['interested', 'will_participate', 'will_lead'];
const TERMINAL_STATUSES = ['completed', 'archived', 'removed'];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }
    if (TERMINAL_STATUSES.includes(proposal.status)) {
      return errorResponse('Cannot commit to a closed proposal', 400);
    }

    const body = await request.json();
    const { commitment_level } = body;

    if (!commitment_level || !VALID_LEVELS.includes(commitment_level)) {
      return errorResponse('Invalid commitment level. Must be: interested, will_participate, or will_lead', 400);
    }

    const commitment = await upsertCommitment({
      proposal_id: id,
      member_id: member.id,
      commitment_level,
    });

    return successResponse({ commitment });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    // Proposer cannot remove their own commitment while proposal is active
    if (proposal.created_by_member_id === member.id && !['archived', 'completed', 'removed'].includes(proposal.status)) {
      return errorResponse('Proposer cannot remove commitment while proposal is active', 400);
    }

    await removeCommitment(id, member.id);
    return successResponse({ removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
