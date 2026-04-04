import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getPublicEventById, getGuestRsvpsByEvent } from '@/lib/supabase-events';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const event = await getPublicEventById(id);

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const guestRsvps = await getGuestRsvpsByEvent(id);

    return successResponse({
      event,
      guest_rsvp_count: guestRsvps.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
