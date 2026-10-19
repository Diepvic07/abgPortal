import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getProposals } from '@/lib/supabase-community';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return errorResponse('Authentication required', 401);
    }
    if (!(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    // All proposals except removed ones: a recording can belong to a proposal
    // that was never moved to "completed" (e.g. a coffee talk run straight from the proposal).
    const result = await getProposals({
      page: 1,
      limit: 500,
      sort: 'newest',
    });

    return successResponse({ proposals: result.proposals, total: result.total });
  } catch (error) {
    return handleApiError(error);
  }
}
