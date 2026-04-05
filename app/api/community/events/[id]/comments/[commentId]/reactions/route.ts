import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { upsertReaction, removeReaction } from '@/lib/supabase-reactions';

const VALID_REACTIONS = ['like', 'heart', 'haha', 'wow', 'sad', 'cold', 'fire', 'hug', 'highfive'];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const member = await requireAuth(request);
    const { commentId } = await params;

    const body = await request.json();
    const { reaction_type } = body;

    if (!reaction_type || !VALID_REACTIONS.includes(reaction_type)) {
      return errorResponse('Invalid reaction type', 400);
    }

    await upsertReaction(commentId, 'event', member.id, reaction_type);
    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const member = await requireAuth(request);
    const { commentId } = await params;

    await removeReaction(commentId, 'event', member.id);
    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
