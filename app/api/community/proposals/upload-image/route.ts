import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`, 400);
    }

    if (file.size > MAX_SIZE) {
      return errorResponse('File too large. Maximum 5MB.', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
    const filePath = `proposals/${year}/${month}/${crypto.randomUUID()}.${ext}`;

    const supabase = createServerSupabaseClient();
    const { error: uploadError } = await supabase.storage
      .from('news-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Proposal image upload error:', uploadError);
      return errorResponse(`Upload failed: ${uploadError.message}`, 500);
    }

    const { data: urlData } = supabase.storage
      .from('news-images')
      .getPublicUrl(filePath);

    return successResponse({ url: urlData.publicUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
