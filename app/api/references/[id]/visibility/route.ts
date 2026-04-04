import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { updateReferenceVisibility } from '@/lib/member-references';

const VisibilitySchema = z.object({
  is_publicly_visible: z.boolean(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = VisibilitySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((issue) => issue.message).join(', '), 400);
    }

    const reference = await updateReferenceVisibility({
      referenceId: id,
      recipientMemberId: member.id,
      isPubliclyVisible: parsed.data.is_publicly_visible,
    });

    return successResponse({ reference });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update visibility';
    if (message.includes('not found') || message.includes('unavailable')) return errorResponse(message, 404);
    return handleApiError(error);
  }
}
