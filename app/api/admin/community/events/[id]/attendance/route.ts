import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getEventById, getRsvpsByEvent, updateRsvpAttendance } from '@/lib/supabase-events';
import { z } from 'zod';

const AttendanceUpdateSchema = z.object({
  rsvps: z.array(z.object({
    rsvp_id: z.string().min(1),
    actual_attendance: z.boolean(),
    actual_participation_score: z.number().int().min(0).max(10).nullable().optional(),
    verified_event_role: z.enum(['attendee', 'lead']).nullable().optional(),
    attendance_mode: z.enum(['offline', 'online']).nullable().optional(),
  })).max(300),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: errorResponse('Authentication required', 401) };
  }

  const isAdmin = await isAdminAsync(session.user.email);
  if (!isAdmin) {
    return { error: errorResponse('Admin access required', 403) };
  }

  return { error: null };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    const { id } = await params;
    const event = await getEventById(id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const rsvps = await getRsvpsByEvent(id);
    return successResponse({ event, rsvps });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    const { id } = await params;
    const event = await getEventById(id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const body = await request.json();
    const parsed = AttendanceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const currentRsvps = await getRsvpsByEvent(id);
    const validRsvpIds = new Set(currentRsvps.map((rsvp) => rsvp.id));

    for (const rsvp of parsed.data.rsvps) {
      if (!validRsvpIds.has(rsvp.rsvp_id)) {
        return errorResponse('One or more RSVPs do not belong to this event', 400);
      }
    }

    for (const rsvp of parsed.data.rsvps) {
      await updateRsvpAttendance(rsvp.rsvp_id, {
        actual_attendance: rsvp.actual_attendance,
        actual_participation_score: rsvp.actual_participation_score ?? undefined,
        verified_event_role: rsvp.actual_attendance ? (rsvp.verified_event_role || 'attendee') : null,
        attendance_mode: rsvp.actual_attendance ? (rsvp.attendance_mode || 'offline') : null,
      });
    }

    const rsvps = await getRsvpsByEvent(id);
    return successResponse({ event, rsvps });
  } catch (error) {
    return handleApiError(error);
  }
}
