import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { deleteFinancialTransaction } from '@/lib/supabase-finance';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const { id } = await params;
    await deleteFinancialTransaction(id);
    return successResponse({ message: 'Transaction deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}
