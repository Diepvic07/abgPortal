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
  getGuestRsvpsByEvent,
  setGuestRsvpStatus,
  upsertRsvp,
  removeRsvp,
  getRsvpsByEvent,
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
    const [payments, event, rsvps, guestRsvps] = await Promise.all([
      getEventPayments(id),
      getEventById(id),
      getRsvpsByEvent(id),
      getGuestRsvpsByEvent(id),
    ]);

    // Anyone with a *confirmed* payment counts as paid.
    // Everyone else who registered but isn't paid falls into the pending bucket
    // — this includes members who have a pending event_payments row AND those
    // who RSVP'd on the site but never went through the "I've paid" flow.
    const confirmedMemberIds = new Set(
      payments.filter(p => p.status === 'confirmed' && p.member_id).map(p => p.member_id!),
    );
    const confirmedGuestRsvpIds = new Set(
      payments.filter(p => p.status === 'confirmed' && p.guest_rsvp_id).map(p => p.guest_rsvp_id!),
    );
    const pendingPaymentByMemberId = new Map<string, string>();
    const pendingPaymentByGuestRsvpId = new Map<string, string>();
    for (const p of payments) {
      if (p.status !== 'pending') continue;
      if (p.member_id) pendingPaymentByMemberId.set(p.member_id, p.id);
      if (p.guest_rsvp_id) pendingPaymentByGuestRsvpId.set(p.guest_rsvp_id, p.id);
    }

    type PendingParticipant = {
      kind: 'member' | 'guest';
      member_id?: string;
      guest_rsvp_id?: string;
      name: string;
      email?: string;
      abg_class?: string;
      avatar_url?: string;
      pending_payment_id: string | null;
      created_at: string;
    };
    const pending_participants: PendingParticipant[] = [];

    for (const r of rsvps) {
      if (r.commitment_level !== 'will_participate' && r.commitment_level !== 'will_lead') continue;
      if (confirmedMemberIds.has(r.member_id)) continue;
      pending_participants.push({
        kind: 'member',
        member_id: r.member_id,
        name: r.member_name || '—',
        abg_class: r.member_abg_class,
        avatar_url: r.member_avatar_url,
        pending_payment_id: pendingPaymentByMemberId.get(r.member_id) || null,
        created_at: r.created_at,
      });
    }
    for (const g of guestRsvps) {
      if (confirmedGuestRsvpIds.has(g.id)) continue;
      pending_participants.push({
        kind: 'guest',
        guest_rsvp_id: g.id,
        name: g.guest_name,
        email: g.guest_email,
        pending_payment_id: pendingPaymentByGuestRsvpId.get(g.id) || null,
        created_at: g.created_at,
      });
    }

    return successResponse({
      payments,
      pending_participants,
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
  // For status='refunded' only. Amount actually returned to the payer.
  // Between 0 and the payment's amount_vnd. Omit for a full refund of
  // the original amount.
  refunded_amount_vnd: z.number().int().nonnegative().optional(),
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

    // For refunds, decide the refunded amount:
    //   - explicit value from client (partial refund),
    //   - or default to the original paid amount (full refund).
    // Cap it at amount_vnd — the check constraint enforces this too.
    let refundedAmountVnd: number | null | undefined;
    if (parsed.data.status === 'refunded') {
      const original = parsed.data.amount_vnd ?? before.amount_vnd;
      const requested = parsed.data.refunded_amount_vnd ?? original;
      if (requested > original) {
        return errorResponse('Refunded amount cannot exceed the paid amount', 400);
      }
      refundedAmountVnd = requested;
    }

    const payment = await updateEventPaymentStatus(
      parsed.data.payment_id,
      parsed.data.status,
      admin?.id,
      parsed.data.amount_vnd,
      parsed.data.cancellation_note,
      refundedAmountVnd,
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
    // Optional community group link to attach on this confirm.
    // Only persisted if the event doesn't already have one.
    community_group_url: z.string().trim().url().or(z.literal('')).optional(),
    community_group_label: z.string().trim().max(120).optional(),
    // When true, send the payment-confirmed email to the participant.
    // Used by the "confirm registered participant" flow; the manual
    // "+ Add paid participant" modal leaves this off.
    send_confirmation_email: z.boolean().optional(),
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
    let event = await getEventById(eventId);
    if (!event) return errorResponse('Event not found', 404);

    const admin = await getMemberByEmail(session.user.email);

    let payment;
    let payerMember: Awaited<ReturnType<typeof getMemberById>> | null = null;
    if (parsed.data.member_id) {
      const member = await getMemberById(parsed.data.member_id);
      if (!member) return errorResponse('Member not found', 404);
      payerMember = member;
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

    // Attach community group link if admin supplied one and event has none.
    const trimmedUrl = parsed.data.community_group_url?.trim() || '';
    const trimmedLabel = parsed.data.community_group_label?.trim() || '';
    if (trimmedUrl && !event.community_group_url) {
      event = await updateEvent(eventId, {
        community_group_url: trimmedUrl,
        community_group_label: trimmedLabel || null,
      });
    }

    if (parsed.data.send_confirmation_email && payment.payer_email && event) {
      try {
        await sendEventPaymentConfirmedEmail({
          to: payment.payer_email,
          payerName: payment.payer_name || payerMember?.name || payment.payer_email,
          eventTitle: event.title,
          eventSlug: event.slug,
          eventDate: event.event_date,
          eventLocation: event.location || undefined,
          amountVnd: payment.amount_vnd,
          communityGroupUrl: event.community_group_url,
          communityGroupLabel: event.community_group_label,
          locale: payerMember?.locale,
        });
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
      }
    }

    return successResponse({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}

// Remove an unpaid participant from the event. Accepts one of:
//   - payment_id: an existing pending event_payments row (deleted along with the RSVP)
//   - member_id:  a member whose RSVP should be dropped (also deletes any pending payment row)
//   - guest_rsvp_id: a guest whose RSVP should be marked cancelled (also deletes any pending payment row)
// Refunding a *confirmed* payment goes through PATCH, not DELETE.
const DeletePaymentSchema = z
  .object({
    payment_id: z.string().optional(),
    member_id: z.string().optional(),
    guest_rsvp_id: z.string().optional(),
  })
  .refine((v) => !!v.payment_id || !!v.member_id || !!v.guest_rsvp_id, {
    message: 'Provide payment_id, member_id, or guest_rsvp_id',
  });

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

    if (parsed.data.payment_id) {
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
    }

    // No payment_id: caller is dropping someone whose registration may or may not
    // have an event_payments row. Clean up whichever pending row exists (if any)
    // in addition to the RSVP itself. Confirmed payments are protected — those
    // require PATCH (refunded / cancelled_no_refund) so revenue stays consistent.
    const eventPayments = await getEventPayments(eventId);
    if (parsed.data.member_id) {
      const memberId = parsed.data.member_id;
      const confirmed = eventPayments.find(p => p.member_id === memberId && p.status === 'confirmed');
      if (confirmed) {
        return errorResponse('Cannot delete a member with a confirmed payment; use refund or cancel-keep-money instead', 400);
      }
      const pending = eventPayments.find(p => p.member_id === memberId && p.status === 'pending');
      if (pending) await deleteEventPayment(pending.id);
      await removeRsvp(eventId, memberId);
      return successResponse({ ok: true });
    }

    // guest_rsvp_id branch
    const guestRsvpId = parsed.data.guest_rsvp_id!;
    const confirmed = eventPayments.find(p => p.guest_rsvp_id === guestRsvpId && p.status === 'confirmed');
    if (confirmed) {
      return errorResponse('Cannot delete a guest with a confirmed payment; use refund or cancel-keep-money instead', 400);
    }
    const pending = eventPayments.find(p => p.guest_rsvp_id === guestRsvpId && p.status === 'pending');
    if (pending) await deleteEventPayment(pending.id);
    await setGuestRsvpStatus(guestRsvpId, 'cancelled');
    return successResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
