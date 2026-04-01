import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { createEventFromProposal } from '@/lib/supabase-events';
import { getProposalById } from '@/lib/supabase-community';
import { getMemberByEmail } from '@/lib/supabase-db';
import { z } from 'zod';

const CreateFromProposalSchema = z.object({
  event_date: z.string(),
  event_end_date: z.string().optional(),
  location: z.string().optional(),
  location_url: z.string().url().optional(),
  capacity: z.number().int().positive().optional(),
  image_url: z.string().url().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    const body = await request.json();
    const parsed = CreateFromProposalSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const member = await getMemberByEmail(session.user.email);
    if (!member) {
      return errorResponse('Member not found', 404);
    }

    const event = await createEventFromProposal(id, member.id, parsed.data);

    return successResponse({ event }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
