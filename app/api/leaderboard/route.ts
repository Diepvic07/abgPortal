import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMemberByEmail } from '@/lib/supabase-db';
import { getLeaderboardData } from '@/lib/scoring';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return errorResponse('Authentication required', 401);
    }

    const member = await getMemberByEmail(session.user.email);
    if (!member || member.approval_status !== 'approved') {
      return errorResponse('Approved member access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    const anchor = searchParams.get('anchor') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

    if (!period || !['month', 'quarter', 'year'].includes(period)) {
      return errorResponse('Valid period required: month, quarter, or year', 400);
    }

    const data = await getLeaderboardData({
      period: period as 'month' | 'quarter' | 'year',
      anchor,
      limit,
      currentMemberId: member.id,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
