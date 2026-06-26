import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getProposals } from '@/lib/supabase-community';
import { ProposalStatus } from '@/types';

const COMPLETED_STATUSES: ProposalStatus[] = ['completed', 'project_completed'];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return errorResponse('Authentication required', 401);
    }
    if (!(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const result = await getProposals({
      status: COMPLETED_STATUSES,
      page: 1,
      limit: 500,
      sort: 'newest',
    });

    return successResponse({ proposals: result.proposals, total: result.total });
  } catch (error) {
    return handleApiError(error);
  }
}
