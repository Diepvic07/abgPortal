import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getProposalById, updateProposal, recalculateAllProposalScores, moderateComment } from '@/lib/supabase-community';
import { ProposalStatus } from '@/types';
import { formatDate } from '@/lib/utils';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return errorResponse('Authentication required', 401);
    }
    const isAdmin = await isAdminAsync(session.user.email);
    if (!isAdmin) {
      return errorResponse('Admin access required', 403);
    }

    const { id } = await params;

    // Special action: recalculate all scores
    if (id === 'recalculate') {
      const count = await recalculateAllProposalScores();
      return successResponse({ recalculated: count });
    }

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'status': {
        const { status } = body as { status: ProposalStatus };
        // Admins cannot drop into project_active from the dropdown — that
        // transition requires the project-creation flow (captures chat URL
        // and the initial public note). Use a dedicated project endpoint.
        if (status === 'project_active') {
          return errorResponse(
            'Use the project-creation flow to move a proposal into project_active.',
            400,
          );
        }
        const updates: Record<string, unknown> = { status };
        if (status === 'completed') {
          updates.completed_at = formatDate();
        }
        const updated = await updateProposal(id, updates);
        return successResponse({ proposal: updated });
      }
      case 'pin': {
        const updated = await updateProposal(id, { is_pinned: !proposal.is_pinned });
        return successResponse({ proposal: updated });
      }
      case 'remove': {
        const updated = await updateProposal(id, { status: 'removed' as ProposalStatus });
        return successResponse({ proposal: updated });
      }
      case 'note': {
        const updated = await updateProposal(id, { admin_note: body.admin_note || null });
        return successResponse({ proposal: updated });
      }
      case 'moderate_comment': {
        await moderateComment(body.comment_id, body.comment_status);
        return successResponse({ moderated: true });
      }
      default:
        return errorResponse('Invalid action', 400);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
