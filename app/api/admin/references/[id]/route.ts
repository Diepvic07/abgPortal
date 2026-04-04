import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getMemberByEmail } from '@/lib/supabase-db';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { moderateMemberReference } from '@/lib/member-references';

const ModerateSchema = z.object({
  action: z.enum(['remove', 'restore']),
  moderation_note: z.string().trim().max(500).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return errorResponse('Authentication required', 401);

    const isAdmin = await isAdminAsync(session.user.email);
    if (!isAdmin) return errorResponse('Admin access required', 403);

    const admin = await getMemberByEmail(session.user.email);
    if (!admin) return errorResponse('Admin member not found', 404);

    const { id } = await params;
    const body = await request.json();
    const parsed = ModerateSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((issue) => issue.message).join(', '), 400);
    }

    const reference = await moderateMemberReference({
      referenceId: id,
      adminMemberId: admin.id,
      action: parsed.data.action,
      moderationNote: parsed.data.moderation_note,
    });

    return successResponse({ reference });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to moderate reference';
    if (message.includes('not found')) return errorResponse(message, 404);
    return handleApiError(error);
  }
}
