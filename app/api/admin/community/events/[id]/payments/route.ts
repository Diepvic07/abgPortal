import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import {
  getEventPayments,
  updateEventPaymentStatus,
  getEventById,
  updateEvent,
  createEventPayment,
  getEventPaymentById,
  deleteEventPayment,
  createGuestRsvp,
  getGuestRsvpByEmail,
  setGuestRsvpStatus,
  upsertRsvp,
  removeRsvp,
} from '@/lib/supabase-events';
import { getMemberByEmail, getMemberById } from '@/lib/supabase-db';
import { sendEventPaymentConfirmedEmail } from '@/lib/resend';
import { getMembershipStatus } from '@/types';
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
      fee_premium: event?.fee_premium ?? null,
      fee_basic: event?.fee_basic ?? null,
      fee_guest: event?.fee_guest ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const UpdatePaymentSchema = z.object({
  payment_id: z.string(),
  status: z.enum(['confirmed', 'rejected', 'cancelled_no_refund', 'refunded']),
  amount_vnd: z.number().int().positive().optional(),
  cancellation_note: z.string().trim().max(500).optional(),
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
    const before = await getEventPaymentById(parsed.data.payment_id);
    if (!before) return errorResponse('Payment not found', 404);

    const payment = await updateEventPaymentStatus(
      parsed.data.payment_id,
      parsed.data.status,
      admin?.id,
      parsed.data.amount_vnd,
      parsed.data.cancellation_note,
    );

    const { id: eventId } = await params;

    // Sync participation with payment state.
    // - refunded / rejected / cancelled_no_refund → participant is off the list
    // - confirmed → participant is on the list (will_participate)
    if (['refunded', 'rejected', 'cancelled_no_refund'].includes(parsed.data.status)) {
      if (payment.member_id) {
        await removeRsvp(eventId, payment.member_id);
      } else if (payment.guest_rsvp_id) {
        await setGuestRsvpStatus(payment.guest_rsvp_id, 'cancelled');
      }
    } else if (parsed.data.status === 'confirmed') {
      if (payment.member_id) {
        await upsertRsvp({
          event_id: eventId,
          member_id: payment.member_id,
          commitment_level: 'will_participate',
        });
      } else if (payment.guest_rsvp_id) {
        await setGuestRsvpStatus(payment.guest_rsvp_id, 'registered');
      }
    }

    if (parsed.data.status === 'confirmed') {
      try {
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

        // Only email on the pending → confirmed transition, not on
        // subsequent flips (e.g. refunded → confirmed for a re-registration).
        if (event && payment.payer_email && before.status === 'pending') {
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

const AddParticipantSchema = z
  .object({
    member_id: z.string().optional(),
    guest_name: z.string().trim().min(1).optional(),
    guest_email: z.string().trim().email().optional(),
    guest_phone: z.string().trim().max(50).optional(),
    amount_vnd: z.number().int().nonnegative(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (v) => !!v.member_id || (!!v.guest_name && !!v.guest_email),
    { message: 'Provide either member_id or guest_name + guest_email' },
  );

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const body = await request.json();
    const parsed = AddParticipantSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const { id: eventId } = await params;
    const event = await getEventById(eventId);
    if (!event) return errorResponse('Event not found', 404);

    const admin = await getMemberByEmail(session.user.email);

    let payment;
    if (parsed.data.member_id) {
      const member = await getMemberById(parsed.data.member_id);
      if (!member) return errorResponse('Member not found', 404);
      const membershipStatus = getMembershipStatus(member);
      const payerType = membershipStatus === 'premium' ? 'premium' as const : 'basic' as const;

      payment = await createEventPayment({
        event_id: eventId,
        payer_type: payerType,
        member_id: member.id,
        amount_vnd: parsed.data.amount_vnd,
        payer_name: member.name || member.email,
        payer_email: member.email,
        notes: parsed.data.notes,
        status: 'confirmed',
        confirmed_by_admin_id: admin?.id,
      });

      await upsertRsvp({
        event_id: eventId,
        member_id: member.id,
        commitment_level: 'will_participate',
      });
    } else {
      const guestEmail = parsed.data.guest_email!;
      const guestName = parsed.data.guest_name!;
      let guest = await getGuestRsvpByEmail(eventId, guestEmail);
      if (!guest) {
        guest = await createGuestRsvp({
          event_id: eventId,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: parsed.data.guest_phone,
        });
      } else if (guest.status !== 'registered') {
        await setGuestRsvpStatus(guest.id, 'registered');
      }

      payment = await createEventPayment({
        event_id: eventId,
        payer_type: 'guest',
        guest_rsvp_id: guest.id,
        amount_vnd: parsed.data.amount_vnd,
        payer_name: guestName,
        payer_email: guestEmail,
        notes: parsed.data.notes,
        status: 'confirmed',
        confirmed_by_admin_id: admin?.id,
      });
    }

    return successResponse({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}

// Hard-delete a pending payment (no money moved). Used for the
// "no-show, never paid" cleanup — removes the RSVP too.
const DeletePaymentSchema = z.object({ payment_id: z.string() });

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const body = await request.json();
    const parsed = DeletePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const { id: eventId } = await params;
    const payment = await getEventPaymentById(parsed.data.payment_id);
    if (!payment) return errorResponse('Payment not found', 404);
    if (payment.status !== 'pending') {
      return errorResponse('Only pending payments can be deleted; use PATCH to refund or cancel a confirmed payment', 400);
    }

    if (payment.member_id) {
      await removeRsvp(eventId, payment.member_id);
    } else if (payment.guest_rsvp_id) {
      await setGuestRsvpStatus(payment.guest_rsvp_id, 'cancelled');
    }
    await deleteEventPayment(parsed.data.payment_id);

    return successResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
