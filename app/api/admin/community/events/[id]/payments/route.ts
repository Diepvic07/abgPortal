import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getEventPayments, updateEventPaymentStatus, getEventById, updateEvent } from '@/lib/supabase-events';
import { getMemberByEmail, getMemberById } from '@/lib/supabase-db';
import { sendEventPaymentConfirmedEmail } from '@/lib/resend';
import { z } from 'zod';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const { id } = await params;
    const [payments, event] = await Promise.all([
      getEventPayments(id),
      getEventById(id),
    ]);
    return successResponse({
      payments,
      community_group_url: event?.community_group_url || null,
      community_group_label: event?.community_group_label || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const UpdatePaymentSchema = z.object({
  payment_id: z.string(),
  status: z.enum(['confirmed', 'rejected']),
  amount_vnd: z.number().int().positive().optional(),
  // Optional community group link to attach to the event on this confirm.
  // Only persisted if the event doesn't already have one. Accept empty
  // string from the form and treat it the same as omitted.
  community_group_url: z.string().trim().url().or(z.literal('')).optional(),
  community_group_label: z.string().trim().max(120).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const body = await request.json();
    const parsed = UpdatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const admin = await getMemberByEmail(session.user.email);
    const payment = await updateEventPaymentStatus(parsed.data.payment_id, parsed.data.status, admin?.id, parsed.data.amount_vnd);

    if (parsed.data.status === 'confirmed') {
      try {
        const { id: eventId } = await params;
        let event = await getEventById(eventId);

        // Attach community group link on first confirm if admin supplied one
        // and the event does not already have one.
        const trimmedUrl = parsed.data.community_group_url?.trim() || '';
        const trimmedLabel = parsed.data.community_group_label?.trim() || '';
        if (event && trimmedUrl && !event.community_group_url) {
          event = await updateEvent(eventId, {
            community_group_url: trimmedUrl,
            community_group_label: trimmedLabel || null,
          });
        }

        if (event && payment.payer_email) {
          const payer = payment.member_id ? await getMemberById(payment.member_id) : null;
          await sendEventPaymentConfirmedEmail({
            to: payment.payer_email,
            payerName: payment.payer_name || payer?.name || payment.payer_email,
            eventTitle: event.title,
            eventSlug: event.slug,
            eventDate: event.event_date,
            eventLocation: event.location || undefined,
            amountVnd: payment.amount_vnd,
            communityGroupUrl: event.community_group_url,
            communityGroupLabel: event.community_group_label,
            locale: payer?.locale,
          });
        }
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
      }
    }

    return successResponse({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}
