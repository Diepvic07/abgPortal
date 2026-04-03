import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { getReceivedReferences } from '@/lib/member-references';

export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const references = await getReceivedReferences(member.id);
    return successResponse({ references });
  } catch (error) {
    return handleApiError(error);
  }
}
