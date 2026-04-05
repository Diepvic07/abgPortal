import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth, getAuthenticatedMember } from '@/lib/auth-middleware';
import { getProposalById, updateProposal, getCommitmentsByProposal, getCommentsByProposal, getMemberCommitment } from '@/lib/supabase-community';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Auth optional for viewing — logged-in users see their commitment status
    const member = await getAuthenticatedMember(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    const commitments = await getCommitmentsByProposal(id);
    const comments = await getCommentsByProposal(id, member?.id);
    const myCommitment = member ? await getMemberCommitment(id, member.id) : null;

    return successResponse({
      proposal: { ...proposal, my_commitment: myCommitment?.commitment_level || null },
      commitments,
      comments,
      currentMemberId: member?.id || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    // Only author can edit, and only when no commitments (except their own auto-commit)
    if (proposal.created_by_member_id !== member.id) {
      return errorResponse('Not authorized', 403);
    }
    if (proposal.commitment_count > 1) {
      return errorResponse('Cannot edit proposal after others have committed', 400);
    }

    const body = await request.json();
    const { title, description, category, target_date } = body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) {
      if (title.length < 5 || title.length > 200) return errorResponse('Title must be between 5 and 200 characters', 400);
      updates.title = title;
    }
    if (description !== undefined) {
      if (description.length < 20 || description.length > 5000) return errorResponse('Description must be between 20 and 5000 characters', 400);
      updates.description = description;
    }
    if (category !== undefined) updates.category = category;
    if (target_date !== undefined) updates.target_date = target_date || null;

    const updated = await updateProposal(id, updates);
    return successResponse({ proposal: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
