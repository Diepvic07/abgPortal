import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getEventById, upsertRsvp, removeRsvp } from '@/lib/supabase-events';
import { z } from 'zod';

const CommitmentLevel = z.enum(['interested', 'will_participate', 'will_lead']);

const TERMINAL_STATUSES = ['cancelled', 'completed'];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const event = await getEventById(id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }
    if (TERMINAL_STATUSES.includes(event.status)) {
      return errorResponse('Cannot RSVP to a closed event', 400);
    }

    const body = await request.json();
    const parsed = CommitmentLevel.safeParse(body.commitment_level);

    if (!parsed.success) {
      return errorResponse('Invalid commitment level. Must be: interested, will_participate, or will_lead', 400);
    }

    const rsvp = await upsertRsvp({
      event_id: id,
      member_id: member.id,
      commitment_level: parsed.data,
    });

    return successResponse({ rsvp });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const event = await getEventById(id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    await removeRsvp(id, member.id);
    return successResponse({ removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
