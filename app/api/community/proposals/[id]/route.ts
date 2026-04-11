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
      currentMemberAvatarUrl: member?.avatar_url || null,
      currentMemberIsAdmin: member?.is_admin === true,
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

    // Only author or admin can edit; authors can only edit when no other commitments
    const isAdmin = member.is_admin === true;
    if (proposal.created_by_member_id !== member.id && !isAdmin) {
      return errorResponse('Not authorized', 403);
    }
    if (!isAdmin && proposal.commitment_count > 1) {
      return errorResponse('Cannot edit proposal after others have committed', 400);
    }

    const body = await request.json();
    const { title, description, category, genre, target_date, location, participation_format, tags } = body;

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
    if (genre !== undefined) updates.genre = genre;
    if (target_date !== undefined) updates.target_date = target_date || null;
    if (location !== undefined) updates.location = location || null;
    if (participation_format !== undefined) updates.participation_format = participation_format;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags.filter((t: string) => typeof t === 'string' && t.trim()).map((t: string) => t.trim()).slice(0, 10) : [];

    const updated = await updateProposal(id, updates);
    return successResponse({ proposal: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
