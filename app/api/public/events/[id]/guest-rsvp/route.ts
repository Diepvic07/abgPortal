import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getPublicEventById, createGuestRsvp, getGuestRsvpByEmail } from '@/lib/supabase-events';
import { z } from 'zod';

const GuestRsvpSchema = z.object({
  guest_name: z.string().min(2).max(100),
  guest_email: z.string().email(),
  guest_phone: z.string().optional(),
  question: z.string().max(2000).optional(),
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

    // Check if registration is closed
    if (event.registration_closed) {
      return errorResponse('Registration is closed for this event', 400);
    }
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return errorResponse('Registration deadline has passed', 400);
    }

    // Check duplicate (only against actual registrations — deferred flow
    // hasn't written anything yet, so re-attempting from the QR screen
    // will still be caught here after they finally confirm payment).
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

    const requiresPayment = event.fee_guest != null && event.fee_guest > 0;

    // For paid events, defer creation of the guest_rsvp + pending payment
    // until the guest actually clicks "Tôi đã chuyển khoản". Closing the QR
    // modal at this point should leave no trace.
    if (requiresPayment) {
      return successResponse({
        rsvp: null,
        payment: null,
        requires_payment: true,
        deferred: true,
      }, 200);
    }

    // Free event: register immediately.
    const rsvp = await createGuestRsvp({
      event_id: id,
      guest_name: parsed.data.guest_name,
      guest_email: parsed.data.guest_email,
      guest_phone: parsed.data.guest_phone,
      question: parsed.data.question,
    });

    return successResponse({
      rsvp,
      payment: null,
      requires_payment: false,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'You have already registered for this event') {
      return errorResponse(error.message, 409);
    }
    return handleApiError(error);
  }
}
