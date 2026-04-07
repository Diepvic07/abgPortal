import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getPublicEventById, createGuestRsvp, getGuestRsvpByEmail, createEventPayment } from '@/lib/supabase-events';
import { z } from 'zod';

const GuestRsvpSchema = z.object({
  guest_name: z.string().min(2).max(100),
  guest_email: z.string().email(),
  guest_phone: z.string().optional(),
  question: z.string().max(500).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const event = await getPublicEventById(id);
    if (!event) {
      return errorResponse('Event not found or not public', 404);
    }

    const body = await request.json();
    const parsed = GuestRsvpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    // Check duplicate
    const existing = await getGuestRsvpByEmail(id, parsed.data.guest_email);
    if (existing) {
      return errorResponse('You have already registered for this event', 409);
    }

    // Enforce required question for speaker
    if (event.require_question && (!parsed.data.question || parsed.data.question.trim().length === 0)) {
      return errorResponse('This event requires you to submit a question for the speaker before registering.', 400);
    }

    // Check guest capacity
    if (event.capacity_guest != null && event.capacity_guest === 0) {
      return errorResponse('This event does not accept guest registrations', 400);
    }
    if (event.capacity_guest != null && (event.guest_rsvp_count || 0) >= event.capacity_guest) {
      return errorResponse('Guest capacity is full', 400);
    }

    const rsvp = await createGuestRsvp({
      event_id: id,
      guest_name: parsed.data.guest_name,
      guest_email: parsed.data.guest_email,
      guest_phone: parsed.data.guest_phone,
      question: parsed.data.question,
    });

    // If event has a guest fee, create a pending payment record
    let payment = null;
    if (event.fee_guest != null && event.fee_guest > 0) {
      payment = await createEventPayment({
        event_id: id,
        payer_type: 'guest',
        guest_rsvp_id: rsvp.id,
        amount_vnd: event.fee_guest,
        payer_name: parsed.data.guest_name,
        payer_email: parsed.data.guest_email,
      });
    }

    return successResponse({
      rsvp,
      payment,
      requires_payment: event.fee_guest != null && event.fee_guest > 0,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'You have already registered for this event') {
      return errorResponse(error.message, 409);
    }
    return handleApiError(error);
  }
}
