import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getMemberByEmail } from '@/lib/supabase-db';
import { getFinancialTransactions, createFinancialTransaction } from '@/lib/supabase-finance';
import { z } from 'zod';

const ExpenseCategory = z.enum(['hosting', 'cloud_server', 'ai', 'event', 'operational', 'other']);

const CreateTransactionSchema = z.object({
  category: ExpenseCategory,
  amount_vnd: z.number().int().positive(),
  description: z.string().min(1).max(500),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_id: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

    const transactions = await getFinancialTransactions(year);
    return successResponse({ transactions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const body = await request.json();
    const parsed = CreateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const admin = await getMemberByEmail(session.user.email);
    if (!admin) return errorResponse('Admin member not found', 404);

    const tx = await createFinancialTransaction({
      ...parsed.data,
      created_by_admin_id: admin.id,
    });

    return successResponse({ transaction: tx }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
