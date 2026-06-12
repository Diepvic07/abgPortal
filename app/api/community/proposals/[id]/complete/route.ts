import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getProposalById, updateProposal } from '@/lib/supabase-community';
import { formatDate } from '@/lib/utils';

// POST: creator or admin marks the proposal as completed.
//       No project is formed; the lifecycle stops here.
//       Allowed from published / upcoming only.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) return errorResponse('Proposal not found', 404);

    const isCreator = proposal.created_by_member_id === member.id;
    const isAdmin = !!member.is_admin;
    if (!isCreator && !isAdmin) {
      return errorResponse('Only the proposal creator or admin can mark complete', 403);
    }

    if (proposal.status !== 'published' && proposal.status !== 'upcoming') {
      return errorResponse('Can only mark complete from published or upcoming', 400);
    }

    const updated = await updateProposal(id, {
      status: 'completed',
      completed_at: formatDate(),
    });

    return successResponse({ proposal: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
