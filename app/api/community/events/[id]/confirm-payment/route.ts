import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getEventById, createEventPayment, upsertRsvp } from '@/lib/supabase-events';
import { sendEventPaymentNotificationEmail } from '@/lib/resend';
import { getMembershipStatus, CommitmentLevel } from '@/types';
import { z } from 'zod';

const BodySchema = z.object({
  // Legacy fields, kept for backward compat with older clients:
  payer_name: z.string().optional(),
  payer_email: z.string().email().optional(),
  payment_id: z.string().optional(),
  // Optional: which commitment level the member is registering under.
  commitment_level: z.enum(['will_participate', 'will_lead']).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const event = await getEventById(id);
    if (!event || event.status !== 'published') {
      return errorResponse('Event not found', 404);
    }

    let commitmentLevel: CommitmentLevel = 'will_participate';
    try {
      const raw = await request.json();
      const parsed = BodySchema.safeParse(raw);
      if (parsed.success && parsed.data.commitment_level) {
        commitmentLevel = parsed.data.commitment_level;
      }
    } catch {
      // no body — that's fine, use defaults
    }

    const membershipStatus = getMembershipStatus(member);
    const payerType = membershipStatus === 'premium' ? 'premium' as const : 'basic' as const;
    const fee = payerType === 'premium' ? event.fee_premium : event.fee_basic;

    if (fee == null || fee <= 0) {
      return errorResponse('No payment required for your tier', 400);
    }

    // Register the member for the event and create their pending payment together.
    // Doing both here — instead of on "Tham gia ngay" click — means closing the
    // QR modal without confirming payment leaves no trace, which matches admin
    // expectations that "Chờ thanh toán" contains only real intents.
    await upsertRsvp({
      event_id: id,
      member_id: member.id,
      commitment_level: commitmentLevel,
    });

    const payment = await createEventPayment({
      event_id: id,
      payer_type: payerType,
      member_id: member.id,
      amount_vnd: fee,
      payer_name: member.name || member.email,
      payer_email: member.email,
    });

    await sendEventPaymentNotificationEmail({
      eventTitle: event.title,
      eventId: id,
      payerName: member.name || member.email,
      payerEmail: member.email,
      payerType,
      amountVnd: fee,
    });

    return successResponse({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}
