import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import {
  getPublicEventById,
  createEventPayment,
  createGuestRsvp,
  getGuestRsvpByEmail,
} from '@/lib/supabase-events';
import { sendEventPaymentNotificationEmail } from '@/lib/resend';
import { z } from 'zod';

// Deferred creation: this endpoint now both registers the guest AND creates
// the pending payment when they click "Tôi đã chuyển khoản". If they close
// the QR modal instead, no rows are written and nothing shows up in
// admin's "Chờ thanh toán" list.
const BodySchema = z.object({
  payer_name: z.string().min(1),
  payer_email: z.string().email(),
  payer_phone: z.string().max(50).optional(),
  question: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const event = await getPublicEventById(id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    if (event.registration_closed) {
      return errorResponse('Registration is closed for this event', 400);
    }
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return errorResponse('Registration deadline has passed', 400);
    }
    if (event.require_question && (!parsed.data.question || !parsed.data.question.trim())) {
      return errorResponse('This event requires a question for the speaker.', 400);
    }
    if (event.capacity_guest != null && event.capacity_guest === 0) {
      return errorResponse('This event does not accept guest registrations', 400);
    }
    if (event.capacity_guest != null && (event.guest_rsvp_count || 0) >= event.capacity_guest) {
      return errorResponse('Guest capacity is full', 400);
    }

    // Look up or create the guest RSVP now.
    let guest = await getGuestRsvpByEmail(id, parsed.data.payer_email);
    if (!guest) {
      guest = await createGuestRsvp({
        event_id: id,
        guest_name: parsed.data.payer_name,
        guest_email: parsed.data.payer_email,
        guest_phone: parsed.data.payer_phone,
        question: parsed.data.question,
      });
    }

    // Create the pending payment record.
    const fee = event.fee_guest || 0;
    let payment = null;
    if (fee > 0) {
      payment = await createEventPayment({
        event_id: id,
        payer_type: 'guest',
        guest_rsvp_id: guest.id,
        amount_vnd: fee,
        payer_name: parsed.data.payer_name,
        payer_email: parsed.data.payer_email,
      });
    }

    // Notify admin.
    await sendEventPaymentNotificationEmail({
      eventTitle: event.title,
      eventId: id,
      payerName: parsed.data.payer_name,
      payerEmail: parsed.data.payer_email,
      payerType: 'guest',
      amountVnd: fee,
    });

    return successResponse({ message: 'Payment confirmation sent', payment, guest });
  } catch (error) {
    return handleApiError(error);
  }
}
