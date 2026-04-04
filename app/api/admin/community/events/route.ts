import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getAllEvents, createEvent } from '@/lib/supabase-events';
import { getMemberByEmail } from '@/lib/supabase-db';
import { z } from 'zod';

const EventCategory = z.enum(['charity', 'event', 'learning', 'community_support', 'networking', 'other']);
const EventStatus = z.enum(['draft', 'published', 'cancelled', 'completed']);
const EventMode = z.enum(['offline', 'online', 'hybrid']);

const CreateEventSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  category: EventCategory,
  event_mode: EventMode.optional().default('offline'),
  status: EventStatus.optional().default('draft'),
  event_date: z.string(),
  event_end_date: z.string().optional(),
  location: z.string().optional(),
  location_url: z.string().url().optional(),
  capacity: z.number().int().positive().optional(),
  capacity_premium: z.number().int().min(0).optional(),
  capacity_basic: z.number().int().min(0).optional(),
  image_url: z.string().url().optional(),
  fee_premium: z.number().int().min(0).optional(),
  fee_basic: z.number().int().min(0).optional(),
  fee_guest: z.number().int().min(0).optional(),
  capacity_guest: z.number().int().min(0).optional(),
  is_public: z.boolean().optional(),
  payment_qr_url: z.string().url().optional(),
  payment_instructions: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return errorResponse('Authentication required', 401);
    }
    const isAdmin = await isAdminAsync(session.user.email);
    if (!isAdmin) {
      return errorResponse('Admin access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const parsedStatus = status ? EventStatus.safeParse(status) : null;

    const events = await getAllEvents({
      category,
      status: parsedStatus?.success ? parsedStatus.data : undefined,
      search,
    });

    return successResponse({ events });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return errorResponse('Authentication required', 401);
    }
    const isAdmin = await isAdminAsync(session.user.email);
    if (!isAdmin) {
      return errorResponse('Admin access required', 403);
    }

    const body = await request.json();
    const parsed = CreateEventSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const member = await getMemberByEmail(session.user.email);
    if (!member) {
      return errorResponse('Member not found', 404);
    }

    const event = await createEvent({
      ...parsed.data,
      created_by_member_id: member.id,
    });

    return successResponse({ event }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
