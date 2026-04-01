import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getEvents, getEventById, getRsvpsByEvent, getMemberRsvp } from '@/lib/supabase-events';
import { z } from 'zod';

const EventCategory = z.enum(['charity', 'event', 'learning', 'community_support', 'networking', 'other']);

export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);

    const { searchParams } = new URL(request.url);

    // Single event fetch (for detail page)
    const eventId = searchParams.get('id');
    if (eventId) {
      const event = await getEventById(eventId);
      if (!event || (event.status === 'draft')) {
        return errorResponse('Event not found', 404);
      }
      const rsvps = await getRsvpsByEvent(eventId);
      const myRsvp = await getMemberRsvp(eventId, member.id);
      return successResponse({
        event,
        rsvps,
        my_rsvp: myRsvp?.commitment_level || null,
      });
    }

    // List events
    const upcoming = searchParams.get('upcoming');
    const past = searchParams.get('past');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const parsedCategory = EventCategory.safeParse(category);

    const result = await getEvents({
      upcoming: upcoming === 'true' ? true : undefined,
      past: past === 'true' ? true : undefined,
      category: parsedCategory.success ? parsedCategory.data : undefined,
      page,
      limit,
    });

    return successResponse({ events: result.events, total: result.total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}
