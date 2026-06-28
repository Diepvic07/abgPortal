import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getEvents, getEventById, getRsvpsByEvent, getMemberRsvp, getEventPayments, getGuestRsvpsByEvent } from '@/lib/supabase-events';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Member, MembershipStatus, getMembershipStatus as getMemberTier } from '@/types';
import { z } from 'zod';

const EventCategory = z.enum(['abg_talks', 'fieldtrip', 'networking', 'learning', 'webinar', 'event', 'community_support', 'abg_business_connect', 'other']);

export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);

    const { searchParams } = new URL(request.url);

    // Single event fetch (for detail page)
    const eventId = searchParams.get('id');
    if (eventId) {
      const event = await getEventById(eventId);
      if (!event || (event.status === 'draft')) {
        return errorResponse('Event not found', 404);
      }
      const rsvps = await getRsvpsByEvent(eventId);
      const guestRsvps = await getGuestRsvpsByEvent(eventId);
      const myRsvp = await getMemberRsvp(eventId, member.id);
      // Derive membership status for RSVP tier gating
      const { getMembershipStatus } = await import('@/types');
      const membershipStatus = getMembershipStatus(member);

      // Check member's payment status for this event
      const allPayments = await getEventPayments(eventId);
      const myPayment = allPayments.find(p => p.member_id === member.id);
      const confirmedPayments = allPayments.filter(p => p.status === 'confirmed');
      const confirmedPaymentMemberIds = new Set(confirmedPayments.map(p => p.member_id).filter((v): v is string => !!v));
      const confirmedPaymentGuestIds = new Set(confirmedPayments.map(p => p.guest_rsvp_id).filter((v): v is string => !!v));

      // Compute per-tier RSVP counts and confirmed-member set (no-fee tier OR confirmed payment)
      const activeRsvps = rsvps.filter(r => r.commitment_level === 'will_participate' || r.commitment_level === 'will_lead');
      let premiumCount = 0;
      let basicCount = 0;
      const confirmedMemberIds: string[] = [];
      if (activeRsvps.length > 0) {
        const memberIds = activeRsvps.map(r => r.member_id);
        const supabase = createServerSupabaseClient();
        const { data: members } = await supabase
          .from('members')
          .select('id, paid, payment_status, membership_expiry')
          .in('id', memberIds);
        const tierById = new Map<string, MembershipStatus>();
        if (members) {
          for (const m of members) {
            const tier = getMemberTier(m as Member);
            tierById.set((m as { id: string }).id, tier);
            if (tier === 'premium' || tier === 'grace-period') premiumCount++;
            else basicCount++;
          }
        }
        const premiumFee = event.fee_premium ?? 0;
        const basicFee = event.fee_basic ?? 0;
        for (const r of activeRsvps) {
          const tier = tierById.get(r.member_id);
          const fee = (tier === 'premium' || tier === 'grace-period') ? premiumFee : basicFee;
          if (fee <= 0 || confirmedPaymentMemberIds.has(r.member_id)) {
            confirmedMemberIds.push(r.member_id);
          }
        }
      }

      // Guest confirmation: free guests are auto-confirmed, paid guests need a confirmed payment
      const guestFee = event.fee_guest ?? 0;
      const confirmedGuestRsvpIdSet = new Set(
        guestRsvps.filter(g => guestFee <= 0 || confirmedPaymentGuestIds.has(g.id)).map(g => g.id),
      );
      const confirmedMemberIdSet = new Set(confirmedMemberIds);

      // Split active RSVPs / guest RSVPs into confirmed vs pending
      const confirmedActiveRsvps = activeRsvps.filter(r => confirmedMemberIdSet.has(r.member_id));
      const pendingActiveRsvps = activeRsvps.filter(r => !confirmedMemberIdSet.has(r.member_id));
      // Non-active RSVPs (e.g. 'interested') are not part of attendee lists; keep them in rsvps for admins,
      // but hide from non-admins to avoid leaking names.
      const inactiveRsvps = rsvps.filter(r => r.commitment_level !== 'will_participate' && r.commitment_level !== 'will_lead');
      const confirmedGuests = guestRsvps.filter(g => confirmedGuestRsvpIdSet.has(g.id));
      const pendingGuests = guestRsvps.filter(g => !confirmedGuestRsvpIdSet.has(g.id));

      const isAdmin = !!member.is_admin;
      const pendingCount = pendingActiveRsvps.length + pendingGuests.length;
      const pendingIncludesMe = pendingActiveRsvps.some(r => r.member_id === member.id);

      // Non-admins only see confirmed names; pending names are kept hidden.
      // The current member always sees their own RSVP row (even if pending) so the UI
      // can show their personal status correctly.
      const visibleRsvps = isAdmin
        ? rsvps
        : [
            ...confirmedActiveRsvps,
            ...pendingActiveRsvps.filter(r => r.member_id === member.id),
            ...inactiveRsvps.filter(r => r.member_id === member.id),
          ];
      const visibleGuestRsvps = isAdmin ? guestRsvps : confirmedGuests;

      return successResponse({
        event,
        rsvps: visibleRsvps,
        guest_rsvps: visibleGuestRsvps,
        my_rsvp: myRsvp?.commitment_level === 'interested' ? null : myRsvp?.commitment_level || null,
        membership_status: membershipStatus,
        my_payment_status: myPayment?.status || null,
        member_phone: member.phone || null,
        tier_counts: { premium: premiumCount, basic: basicCount },
        confirmed_member_ids: confirmedMemberIds,
        confirmed_guest_rsvp_ids: Array.from(confirmedGuestRsvpIdSet),
        pending_count: pendingCount,
        pending_includes_me: pendingIncludesMe,
        currentMemberId: member.id,
        currentMemberIsAdmin: isAdmin,
      });
    }

    // List events
    const upcoming = searchParams.get('upcoming');
    const past = searchParams.get('past');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const parsedCategory = EventCategory.safeParse(category);

    const result = await getEvents({
      upcoming: upcoming === 'true' ? true : undefined,
      past: past === 'true' ? true : undefined,
      category: parsedCategory.success ? parsedCategory.data : undefined,
      page,
      limit,
    });

    return successResponse({ events: result.events, total: result.total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}
