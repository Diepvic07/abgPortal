import { NextRequest, after } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getEventById, updateEvent, deleteEvent } from '@/lib/supabase-events';
import { z } from 'zod';
import { sendPushToAllMembers, getPushMessage } from '@/lib/push-notification';
import { createInAppNotifications } from '@/lib/in-app-notifications';

const EventCategory = z.enum(['abg_talks', 'fieldtrip', 'networking', 'learning', 'webinar', 'event', 'community_support', 'abg_business_connect', 'other']);
const EventStatus = z.enum(['draft', 'published', 'cancelled', 'completed']);
const EventMode = z.enum(['offline', 'online', 'hybrid']);

const UpdateEventSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(5000).optional(),
  category: EventCategory.optional(),
  event_mode: EventMode.nullable().optional(),
  status: EventStatus.optional(),
  event_date: z.string().optional(),
  event_end_date: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  location_url: z.string().url().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  capacity_premium: z.number().int().min(0).nullable().optional(),
  capacity_basic: z.number().int().min(0).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  fee_premium: z.number().int().min(0).nullable().optional(),
  fee_basic: z.number().int().min(0).nullable().optional(),
  fee_guest: z.number().int().min(0).nullable().optional(),
  capacity_guest: z.number().int().min(0).nullable().optional(),
  is_public: z.boolean().optional(),
  allow_cancellation: z.boolean().optional(),
  registration_closed: z.boolean().optional(),
  registration_deadline: z.string().nullable().optional(),
  payment_qr_url: z.string().url().nullable().optional(),
  payment_instructions: z.string().nullable().optional(),
  require_question: z.boolean().optional(),
  question_prompt: z.string().max(500).nullable().optional(),
  recap_text: z.string().max(5000).nullable().optional(),
  recap_images: z.array(z.string()).max(20).nullable().optional(),
  organizer_member_id: z.string().nullable().optional(),
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

    // Handle recap_created_at automatically
    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.recap_text !== undefined || parsed.data.recap_images !== undefined) {
      const hasRecap = parsed.data.recap_text || (parsed.data.recap_images && parsed.data.recap_images.length > 0);
      if (hasRecap && !event.recap_created_at) {
        updateData.recap_created_at = new Date().toISOString();
      } else if (!hasRecap) {
        updateData.recap_created_at = null;
      }
    }

    const updated = await updateEvent(id, updateData);

    // Send notifications when event transitions to published
    if (event.status !== 'published' && parsed.data.status === 'published') {
      after(async () => {
        const message = getPushMessage('new_event', { eventTitle: updated.title || parsed.data.title || '' }, 'vi');
        const url = `/events/${id}`;

        try {
          await createInAppNotifications({
            type: 'new_event',
            title: message.title,
            body: message.body,
            url,
          });
        } catch (err) {
          console.error('[in-app-notif] Event notification failed:', err);
        }

        try {
          await sendPushToAllMembers('new_event', { ...message, url });
        } catch (pushError) {
          console.error('[push] Event publish notification failed:', pushError);
        }
      });
    }

    return successResponse({ event: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    await deleteEvent(id);
    return successResponse({ message: 'Event deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}
