import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getEventById, upsertRsvp, removeRsvp, getMemberRsvp, getRsvpsByEvent } from '@/lib/supabase-events';
import { getMembershipStatus } from '@/types';
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

    // Tier gating: enforce per-tier seat limits
    const membership = getMembershipStatus(member);
    const isPremium = membership === 'premium' || membership === 'grace-period';

    // Check if this is a new RSVP (not updating existing)
    const existingRsvp = await getMemberRsvp(id, member.id);
    if (!existingRsvp) {
      if (!isPremium && event.capacity_basic === 0) {
        return errorResponse('This event is Premium exclusive.', 403);
      }

      // Count RSVPs by tier to check limits
      const rsvps = await getRsvpsByEvent(id);
      // We need member data to determine tier... for now use the RSVP count approach
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
