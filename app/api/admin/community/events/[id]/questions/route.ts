import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getRsvpsByEvent, getGuestRsvpsByEvent } from '@/lib/supabase-events';

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

    // Combine into a unified question list
    const questions: Array<{
      type: 'member' | 'guest';
      name: string;
      email?: string;
      question: string;
      created_at: string;
    }> = [];

    for (const rsvp of rsvps) {
      if (rsvp.note) {
        questions.push({
          type: 'member',
          name: rsvp.member_name || 'Unknown member',
          question: rsvp.note,
          created_at: rsvp.created_at,
        });
      }
    }

    for (const guest of guestRsvps) {
      if (guest.question) {
        questions.push({
          type: 'guest',
          name: guest.guest_name,
          email: guest.guest_email,
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
