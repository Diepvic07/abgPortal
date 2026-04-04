import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getMemberByEmail } from '@/lib/supabase-db';
import { getFinancialSettings, updateFinancialSettings } from '@/lib/supabase-finance';
import { z } from 'zod';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const settings = await getFinancialSettings();
    return successResponse({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

const UpdateSettingsSchema = z.object({
  opening_balance_vnd: z.number().int(),
  opening_balance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return errorResponse('Admin access required', 403);
    }

    const body = await request.json();
    const parsed = UpdateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const admin = await getMemberByEmail(session.user.email);
    if (!admin) return errorResponse('Admin member not found', 404);

    const settings = await updateFinancialSettings({
      opening_balance_vnd: parsed.data.opening_balance_vnd,
      opening_balance_date: parsed.data.opening_balance_date,
      admin_id: admin.id,
    });

    return successResponse({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
