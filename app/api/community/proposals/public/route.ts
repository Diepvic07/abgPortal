import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { getPublicProposals } from '@/lib/supabase-community';

export async function GET(request: NextRequest) {
  try {
    const proposals = await getPublicProposals();
    return successResponse({ proposals });
  } catch (error) {
    return handleApiError(error);
  }
}
