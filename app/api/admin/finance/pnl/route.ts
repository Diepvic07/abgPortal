import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getMonthlyPnL } from '@/lib/supabase-finance';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const result = await getMonthlyPnL(year);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
