import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getEventById, createEventPayment } from '@/lib/supabase-events';
import { sendEventPaymentNotificationEmail } from '@/lib/resend';
import { getMembershipStatus } from '@/types';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const event = await getEventById(id);
    if (!event || event.status !== 'published') {
      return errorResponse('Event not found', 404);
    }

    const membershipStatus = getMembershipStatus(member);
    const payerType = membershipStatus === 'premium' ? 'premium' as const : 'basic' as const;
    const fee = payerType === 'premium' ? event.fee_premium : event.fee_basic;

    if (fee == null || fee <= 0) {
      return errorResponse('No payment required for your tier', 400);
    }

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
