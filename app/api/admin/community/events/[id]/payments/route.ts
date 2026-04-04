import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getEventPayments, updateEventPaymentStatus } from '@/lib/supabase-events';
import { getMemberByEmail } from '@/lib/supabase-db';
import { z } from 'zod';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const { id } = await params;
    const payments = await getEventPayments(id);
    return successResponse({ payments });
  } catch (error) {
    return handleApiError(error);
  }
}

const UpdatePaymentSchema = z.object({
  payment_id: z.string(),
  status: z.enum(['confirmed', 'rejected']),
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
    const payment = await updateEventPaymentStatus(parsed.data.payment_id, parsed.data.status, admin?.id);
    return successResponse({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}
