import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getEventById, getEventComments, createEventComment } from '@/lib/supabase-events';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
    const { id } = await params;

    const event = await getEventById(id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const comments = await getEventComments(id);
    return successResponse({ comments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const event = await getEventById(id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const body = await request.json();
    const { body: commentBody } = body;

    if (!commentBody || commentBody.length < 1 || commentBody.length > 2000) {
      return errorResponse('Comment must be between 1 and 2000 characters', 400);
    }

    const comment = await createEventComment({
      event_id: id,
      member_id: member.id,
      body: commentBody,
    });

    return successResponse({ comment }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
