import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getPublicEventById } from '@/lib/supabase-events';
import { sendEventPaymentNotificationEmail } from '@/lib/resend';
import { z } from 'zod';

const ConfirmPaymentSchema = z.object({
  payer_name: z.string().min(1),
  payer_email: z.string().email(),
  payment_id: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const event = await getPublicEventById(id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const body = await request.json();
    const parsed = ConfirmPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    // Send notification email to admin
    await sendEventPaymentNotificationEmail({
      eventTitle: event.title,
      eventId: id,
      payerName: parsed.data.payer_name,
      payerEmail: parsed.data.payer_email,
      payerType: 'guest',
      amountVnd: event.fee_guest || 0,
    });

    return successResponse({ message: 'Payment confirmation sent' });
  } catch (error) {
    return handleApiError(error);
  }
}
