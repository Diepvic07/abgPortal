import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getEventById, upsertRsvp, removeRsvp, getMemberRsvp } from '@/lib/supabase-events';
import { getMembershipStatus } from '@/types';
import { z } from 'zod';

const EventRegistrationSchema = z.object({
  commitment_level: z.enum(['will_participate', 'will_lead']),
  note: z.string().trim().max(2000).optional(),
});

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
    if (event.registration_closed) {
      return errorResponse('Registration is closed for this event', 400);
    }
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return errorResponse('Registration deadline has passed', 400);
    }

    const body = await request.json();
    const parsed = EventRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((issue) => issue.message).join(', '), 400);
    }

    // Tier gating: enforce per-tier seat limits
    const membership = getMembershipStatus(member);
    const isPremium = membership === 'premium' || membership === 'grace-period';

    // Check if this is a new RSVP (not updating existing)
    const existingRsvp = await getMemberRsvp(id, member.id);

    // Enforce required question for speaker (only for new RSVPs, not upgrades)
    if (!existingRsvp && event.require_question && (!parsed.data.note || parsed.data.note.trim().length === 0)) {
      return errorResponse('This event requires you to submit a question for the speaker before joining.', 400);
    }
    if (
      parsed.data.commitment_level === 'will_lead' &&
      existingRsvp?.commitment_level !== 'will_participate' &&
      existingRsvp?.commitment_level !== 'will_lead'
    ) {
      return errorResponse('Join the event before volunteering to lead.', 400);
    }

    if (!existingRsvp) {
      if (!isPremium && event.capacity_basic === 0) {
        return errorResponse('This event is Premium exclusive.', 403);
      }

      // Premium seats check
      if (isPremium && event.capacity_premium != null) {
        // Count how many premium members already RSVP'd (rough: we count all for now, admin manages)
        if (event.rsvp_count >= (event.capacity_premium + (event.capacity_basic || 0))) {
          return errorResponse('Event is completely full.', 403);
        }
      }
      // Basic seats check
      if (!isPremium && event.capacity_basic != null && event.capacity_basic > 0) {
        // Total capacity check
        if (event.rsvp_count >= (event.capacity_premium || 0) + event.capacity_basic) {
          return errorResponse('No Basic seats remaining. Upgrade to Premium for priority access.', 403);
        }
      }
    }

    const rsvp = await upsertRsvp({
      event_id: id,
      member_id: member.id,
      commitment_level: parsed.data.commitment_level,
      note: parsed.data.note,
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
