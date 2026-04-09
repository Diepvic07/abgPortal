import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getRsvpsByEvent, getGuestRsvpsByEvent } from '@/lib/supabase-events';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Member, getMembershipStatus } from '@/types';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const { id } = await params;

    // Fetch both member RSVPs (with notes) and guest RSVPs (with questions)
    const [rsvps, guestRsvps] = await Promise.all([
      getRsvpsByEvent(id),
      getGuestRsvpsByEvent(id),
    ]);

    // Fetch member details (email, phone, tier) for all RSVP members
    const memberIds = rsvps.map(r => r.member_id);
    const memberMap = new Map<string, { email: string; phone?: string; tier: string }>();
    if (memberIds.length > 0) {
      const supabase = createServerSupabaseClient();
      const { data: members } = await supabase
        .from('members')
        .select('id, email, phone, paid, payment_status, membership_expiry')
        .in('id', memberIds);
      if (members) {
        for (const m of members) {
          const tier = getMembershipStatus(m as Member);
          const isPremium = tier === 'premium' || tier === 'grace-period';
          memberMap.set(m.id as string, {
            email: m.email as string,
            phone: (m.phone as string) || undefined as unknown as string,
            tier: isPremium ? 'Premium' : 'Basic',
          });
        }
      }
    }

    // Combine into a unified question list
    const questions: Array<{
      type: 'member' | 'guest';
      tier?: string;
      name: string;
      email?: string;
      phone?: string;
      question: string;
      created_at: string;
    }> = [];

    for (const rsvp of rsvps) {
      if (rsvp.note) {
        const member = memberMap.get(rsvp.member_id);
        questions.push({
          type: 'member',
          tier: member?.tier || 'Basic',
          name: rsvp.member_name || 'Unknown member',
          email: member?.email,
          phone: member?.phone,
          question: rsvp.note,
          created_at: rsvp.created_at,
        });
      }
    }

    for (const guest of guestRsvps) {
      if (guest.question) {
        questions.push({
          type: 'guest',
          tier: 'Guest',
          name: guest.guest_name,
          email: guest.guest_email,
          phone: guest.guest_phone,
          question: guest.question,
          created_at: guest.created_at,
        });
      }
    }

    // Sort by created_at ascending
    questions.sort((a, b) => a.created_at.localeCompare(b.created_at));

    return successResponse({ questions });
  } catch (error) {
    return handleApiError(error);
  }
}
