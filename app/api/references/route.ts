import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { createMemberReference } from '@/lib/member-references';

const CreateReferenceSchema = z.object({
  recipient_member_id: z.string().uuid('Invalid recipient member ID'),
  body: z.string().trim().min(40).max(2000),
  relationship_context: z.string().trim().min(10).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const body = await request.json();
    const parsed = CreateReferenceSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((issue) => issue.message).join(', '), 400);
    }

    const reference = await createMemberReference({
      writerMemberId: member.id,
      recipientMemberId: parsed.data.recipient_member_id,
      body: parsed.data.body,
      relationshipContext: parsed.data.relationship_context,
    });

    return successResponse({ reference }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create reference';
    if (message.includes('already submitted')) return errorResponse(message, 409);
    if (message.includes('premium') || message.includes('eligible') || message.includes('yourself')) {
      return errorResponse(message, 403);
    }
    return handleApiError(error);
  }
}
