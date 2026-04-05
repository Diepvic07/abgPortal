import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { updateEventComment, deleteEventComment } from '@/lib/supabase-events';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const member = await requireAuth(request);
    const { commentId } = await params;

    const supabase = createServerSupabaseClient();
    const { data: comment } = await supabase
      .from('community_event_comments')
      .select('member_id')
      .eq('id', commentId)
      .maybeSingle();

    if (!comment) {
      return errorResponse('Comment not found', 404);
    }
    if ((comment as Record<string, unknown>).member_id !== member.id) {
      return errorResponse('Not authorized', 403);
    }

    const body = await request.json();
    if (!body.body || body.body.length < 1 || body.body.length > 2000) {
      return errorResponse('Comment must be between 1 and 2000 characters', 400);
    }

    const updated = await updateEventComment(commentId, body.body);
    return successResponse({ comment: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const member = await requireAuth(request);
    const { commentId } = await params;

    const supabase = createServerSupabaseClient();
    const { data: comment } = await supabase
      .from('community_event_comments')
      .select('member_id')
      .eq('id', commentId)
      .maybeSingle();

    if (!comment) {
      return errorResponse('Comment not found', 404);
    }
    if ((comment as Record<string, unknown>).member_id !== member.id) {
      return errorResponse('Not authorized', 403);
    }

    await deleteEventComment(commentId);
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
