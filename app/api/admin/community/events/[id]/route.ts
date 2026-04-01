import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getEventById, updateEvent } from '@/lib/supabase-events';
import { z } from 'zod';

const EventCategory = z.enum(['charity', 'event', 'learning', 'community_support', 'networking', 'other']);
const EventStatus = z.enum(['draft', 'published', 'cancelled', 'completed']);

const UpdateEventSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(5000).optional(),
  category: EventCategory.optional(),
  status: EventStatus.optional(),
  event_date: z.string().optional(),
  event_end_date: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  location_url: z.string().url().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return errorResponse('Authentication required', 401);
    }
    const isAdmin = await isAdminAsync(session.user.email);
    if (!isAdmin) {
      return errorResponse('Admin access required', 403);
    }

    const { id } = await params;

    const event = await getEventById(id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const body = await request.json();
    const parsed = UpdateEventSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const updated = await updateEvent(id, parsed.data);
    return successResponse({ event: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
