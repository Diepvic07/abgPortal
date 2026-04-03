import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { listMemberReferencesForAdmin } from '@/lib/member-references';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return errorResponse('Authentication required', 401);

    const isAdmin = await isAdminAsync(session.user.email);
    if (!isAdmin) return errorResponse('Admin access required', 403);

    const references = await listMemberReferencesForAdmin();
    return successResponse({ references });
  } catch (error) {
    return handleApiError(error);
  }
}
