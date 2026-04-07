import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getProposalById, getCommentsByProposal, createComment } from '@/lib/supabase-community';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    const comments = await getCommentsByProposal(id, member.id);
    return successResponse({ comments, currentMemberId: member.id });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    const body = await request.json();
    const { body: commentBody, parent_comment_id, image_url } = body;

    const text = commentBody || '';
    if (!text && !image_url) {
      return errorResponse('Comment must have text or an image', 400);
    }
    if (text.length > 2000) {
      return errorResponse('Comment must be at most 2000 characters', 400);
    }

    const comment = await createComment({
      proposal_id: id,
      member_id: member.id,
      body: text,
      parent_comment_id: parent_comment_id || undefined,
      image_url: image_url || undefined,
    });

    return successResponse({ comment }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
