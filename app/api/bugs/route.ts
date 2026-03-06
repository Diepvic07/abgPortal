import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { requireAuth } from '@/lib/auth-middleware';
import { createBugReport, getOpenBugReports } from '@/lib/supabase-db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { BugReport } from '@/types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/bugs - Submit a bug report
export async function POST(request: NextRequest) {
  try {
    const member = await requireAuth(request);

    const formData = await request.formData();
    const description = formData.get('description') as string | null;
    const pageUrl = formData.get('page_url') as string | null;
    const screenshot = formData.get('screenshot') as File | null;

    if (!description?.trim()) {
      return errorResponse('Description is required', 400);
    }
    if (!pageUrl) {
      return errorResponse('Page URL is required', 400);
    }

    let screenshotUrl: string | undefined;

    if (screenshot && screenshot.size > 0) {
      if (!ALLOWED_TYPES.includes(screenshot.type)) {
        return errorResponse(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`, 400);
      }
      if (screenshot.size > MAX_SIZE) {
        return errorResponse('Screenshot too large. Maximum 5MB.', 400);
      }

      const buffer = Buffer.from(await screenshot.arrayBuffer());
      const ext = screenshot.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
      const filePath = `${crypto.randomUUID()}.${ext}`;

      const supabase = createServerSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from('bug-screenshots')
        .upload(filePath, buffer, {
          contentType: screenshot.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('[BugReport] Screenshot upload error:', uploadError);
        return errorResponse(`Screenshot upload failed: ${uploadError.message}`, 500);
      }

      const { data: urlData } = supabase.storage
        .from('bug-screenshots')
        .getPublicUrl(filePath);
      screenshotUrl = urlData.publicUrl;
    }

    const report: BugReport = {
      id: crypto.randomUUID(),
      reporter_email: member.email,
      page_url: pageUrl,
      description: description.trim(),
      screenshot_url: screenshotUrl,
      status: 'open',
      created_at: new Date().toISOString(),
    };

    await createBugReport(report);

    return successResponse({ message: 'Bug report submitted', id: report.id }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/bugs - Get all open bug reports
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const reports = await getOpenBugReports();
    return successResponse({ reports });
  } catch (error) {
    return handleApiError(error);
  }
}
